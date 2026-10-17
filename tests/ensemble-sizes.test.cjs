const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {ExactEnsemble}=require('../demo/thermo.js');
const {IsingModel}=require('../demo/model.js');
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const cases=[3,4,5,6].map(columns=>new ExactEnsemble(columns,4));
const sorted=groups=>groups.map(g=>[g.e,g.m,g.g]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);

// Independent reference: visit every bit mask and recompute all bonds from scratch.
function directGroups(columns,rows){
  const n=columns*rows,bonds=[],groups=new Map();
  const index=(r,c)=>((r+rows)%rows)*columns+(c+columns)%columns;
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
    const k=index(r,c),d=r%2?1:-1;
    bonds.push([k,index(r,c+1)],[k,index(r+1,c)],[k,index(r+1,c+d)]);
  }
  for(let mask=0;mask<2**n;mask++){
    let e=0,m=-n;
    for(let k=0;k<n;k++)m+=2*((mask>>>k)&1);
    for(const [a,b] of bonds)e+=((mask>>>a)^(mask>>>b))&1?1:-1;
    const key=e+','+m,entry=groups.get(key);
    if(entry)entry.g++;else groups.set(key,{e,m,g:1});
  }
  return [...groups.values()];
}

test('Gray-code density of states matches independent complete enumeration',()=>{
  for(const columns of [3,4])assert.deepEqual(sorted(cases[columns-3].groups),sorted(directGroups(columns,4)));
  // Preserve the original 4 x 4 live-model neighbour convention as well.
  const model=new IsingModel(4,1,42),ensemble=cases[1];
  for(let mask=0;mask<65536;mask+=137){
    for(let i=0;i<16;i++)model.spins[i]=((mask>>>i)&1)*2-1;
    const e=model.totalEnergy(),m=model.spins.reduce((a,b)=>a+b,0);
    assert.ok(ensemble.groups.some(g=>g.e===e&&g.m===m));
  }
});

test('all offered sizes have complete state counts and the correct ground states',()=>{
  for(const ensemble of cases){
    const n=ensemble.n;
    assert.equal(ensemble.stateCount,2**n);
    assert.equal(ensemble.groups.reduce((sum,g)=>sum+g.g,0),2**n);
    const zero=ensemble.at(0),up=ensemble.at(0,.4),down=ensemble.at(0,-.4);
    close(zero.e,-3);close(zero.s,Math.log(2)/n);close(zero.m,0);close(zero.absM,1);
    close(zero.distribution[0],.5);close(zero.distribution[n],.5);
    close(up.m,1);close(down.m,-1);close(up.e,-3.4);close(up.s,0);
    assert.equal(zero.distribution.length,n+1);
    assert.equal(zero.columns,ensemble.columns);assert.equal(zero.rows,4);
  }
});

test('variable-size distributions normalize, mirror with the field, and approach the binomial limit',()=>{
  for(const ensemble of cases){
    const n=ensemble.n,hot=ensemble.at(1e12),plus=ensemble.at(3.7,.31),minus=ensemble.at(3.7,-.31);
    close(hot.s,Math.log(2));close(plus.distribution.reduce((a,b)=>a+b,0),1);
    close(plus.m,-minus.m);close(plus.e,minus.e);
    let choose=1;
    for(let k=0;k<=n;k++){
      if(k)choose=choose*(n+1-k)/k;
      close(hot.distribution[k],choose/(2**n));close(plus.distribution[k],minus.distribution[n-k]);
    }
  }
});

test('asynchronous enumeration yields to the event loop and preserves exact results',async()=>{
  let yielded=false;
  const pending=ExactEnsemble.create(5,4);
  setTimeout(()=>{yielded=true;},0);
  const result=await pending;
  assert.equal(yielded,true);assert.deepEqual(result.groups,cases[2].groups);
  assert.deepEqual(result.at(2.3,-.1),cases[2].at(2.3,-.1));
});

test('unsupported torus dimensions and excessive state spaces are rejected',()=>{
  for(const dims of [[2,4],[4,3],[4,5],[7,4],[4.5,4],[NaN,4]])assert.throws(()=>new ExactEnsemble(...dims),/Exact enumeration requires/);
});

test('histogram bins use the selected spin count for positions and labels',()=>{
  const rectangles=[],labels=[];
  const ctx=new Proxy({fillRect:(...r)=>rectangles.push(r),fillText:text=>labels.push(text)},
    {get:(target,key)=>key in target?target[key]:()=>{}});
  const canvas={width:600,height:285,getContext:()=>ctx,getBoundingClientRect:()=>({width:600,height:285})};
  const sandbox={devicePixelRatio:1};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../demo/plots.js'),'utf8'),sandbox);
  for(const ensemble of [cases[0],cases[3]]){
    rectangles.length=0;labels.length=0;
    sandbox.SpinPlots.distribution(canvas,ensemble.at(4));
    assert.equal(rectangles.length,ensemble.n+1);
    const center=i=>rectangles[i][0]+rectangles[i][2]/2;
    close(center(0),40+(600-18-40)*.1/2.2);
    close(center(ensemble.n),40+(600-18-40)*2.1/2.2);
    for(let i=1;i<rectangles.length;i++)assert.ok(center(i)>center(i-1));
    assert.ok(labels.includes(ensemble.n+' spins · Same T, h'));
  }
});
