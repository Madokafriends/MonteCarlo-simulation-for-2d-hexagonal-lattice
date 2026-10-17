const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const physics=require('../demo/model.js');
const {ExactEnsemble}=require('../demo/thermo.js');
const paths=require('../demo/paths.js');
const presentation=require('../demo/presentation.js');
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const squareEnergy=(spins,L,h=0)=>{
  let e=0;
  for(let r=0;r<L;r++)for(let c=0;c<L;c++){
    const k=r*L+c;
    e-=spins[k]*(spins[r*L+(c+1)%L]+spins[((r+1)%L)*L+c]+h);
  }
  return e;
};

test('square lattice has four distinct reciprocal periodic neighbours and correct local energies',()=>{
  const m=new physics.IsingModel(8,2.8,83,'random',-.37,'square');
  assert.equal(m.coordination,4);
  close(m.energy,squareEnergy(m.spins,m.size,m.field));
  for(let k=0;k<m.n;k++){
    const r=Math.floor(k/m.size),c=k%m.size;
    assert.deepEqual([...m.neighbors[k]],[r*m.size+(c+7)%8,r*m.size+(c+1)%8,((r+7)%8)*8+c,((r+1)%8)*8+c]);
    assert.equal(new Set(m.neighbors[k]).size,4);
    for(const j of m.neighbors[k])assert.ok(m.neighbors[j].includes(k));
    const e=squareEnergy(m.spins,m.size,m.field),delta=m.delta(k);
    m.spins[k]*=-1;close(squareEnergy(m.spins,m.size,m.field)-e,delta);m.spins[k]*=-1;
  }
  const ground=new physics.IsingModel(8,0,1,'up',0,'square');
  close(ground.energy/ground.n,-2);close(ground.domainWallFraction(),0);
  assert.equal(ground.attempt(0,0).accepted,false);
  for(let k=0;k<ground.n;k++)ground.spins[k]=(Math.floor(k/8)+k%8)%2?1:-1;
  ground.energy=ground.totalEnergy();close(ground.energy/ground.n,2);close(ground.domainWallFraction(),1);
});

test('switching topology preserves spins, T, h and RNG while recomputing energy and restarting counters',()=>{
  const m=new physics.IsingModel(8,2.7,92,'random',.31);m.sweep(7);
  const before=m.snapshot();
  m.setLattice('square');
  assert.deepEqual([...m.spins],before.spins);
  assert.equal(m.rng.state,before.rngState);assert.equal(m.temperature,before.temperature);assert.equal(m.field,before.field);
  assert.equal(m.magnetization/m.n,before.magnetization);assert.equal(m.attempts,0);assert.equal(m.accepted,0);
  close(m.energy,squareEnergy(m.spins,m.size,m.field));
  m.setLattice('triangular');close(m.energy/m.n,before.energyPerSpin);
  assert.deepEqual([...m.spins],before.spins);
  assert.throws(()=>m.setLattice('honeycomb'),/Unknown lattice/);assert.equal(m.lattice,'triangular');
  close(new physics.IsingModel(4,undefined,1,'up',0,'square').temperature,2/Math.log(1+Math.SQRT2));
});

test('optimized square Metropolis sweeps match individual seeded proposals',()=>{
  for(const h of [0,.34,-.34]){
    const a=new physics.IsingModel(8,2.4,31,'random',h,'square'),b=new physics.IsingModel(8,2.4,31,'random',h,'square');
    a.sweep(40);for(let i=0;i<b.n*40;i++)b.attempt();
    assert.deepEqual(a.snapshot(),b.snapshot());close(a.energy,squareEnergy(a.spins,a.size,h),1e-8);
  }
});

const square=new ExactEnsemble(4,4,'square');
test('square density of states equals independent exhaustive enumeration of all 65536 configurations',()=>{
  const groups=new Map(),spins=new Int8Array(16);
  for(let mask=0;mask<65536;mask++){
    let m=0;
    for(let k=0;k<16;k++){spins[k]=((mask>>>k)&1)*2-1;m+=spins[k];}
    const e=squareEnergy(spins,4),key=e+','+m;
    groups.set(key,(groups.get(key)||0)+1);
  }
  assert.equal(square.groups.length,groups.size);
  for(const g of square.groups)assert.equal(g.g,groups.get(g.e+','+g.m));
  assert.equal(square.groups.reduce((sum,g)=>sum+g.g,0),65536);
});

test('square canonical distribution has correct ground states, symmetry and field response',()=>{
  const ground=square.at(0),plus=square.at(2.8,.27),minus=square.at(2.8,-.27);
  close(ground.e,-2);close(ground.m,0);close(ground.absM,1);close(ground.s,Math.log(2)/16);
  close(ground.distribution[0],.5);close(ground.distribution[16],.5);
  close(plus.distribution.reduce((a,b)=>a+b,0),1);
  plus.distribution.forEach((p,k)=>close(p,minus.distribution[16-k]));
  close(plus.m,-minus.m);close(plus.e,minus.e);
  close(square.at(0,.3).e,-2.3);close(square.at(0,.3).m,1);
  assert.equal(plus.lattice,'square');
  assert.ok(square.at(3).absM<new ExactEnsemble().at(3).absM);
});

test('square exact magnetization and curve use the square critical point and exponent',()=>{
  const tc=physics.criticalTemperatureFor('square'),m0=t=>physics.spontaneousMagnetization(t,'square');
  close(tc,2.269185314213022,1e-12);
  close(m0(0),1);assert.equal(m0(tc),0);assert.equal(m0(tc+.1),0);
  for(const t of [.5,1.5,2,tc-.01]){
    const u=Math.exp(-4/t);
    close(m0(t),(1-16*u*u/(1-u)**4)**(1/8));
  }
  close(Math.log(m0(tc-1e-5)/m0(tc-1e-6))/Math.log(10),1/8,1e-5);
  const points=paths.orderCurve('square');
  assert.ok(points.some(([t,m])=>t===tc&&m===0));
  for(const [t,m] of points){close(m,m0(t));if(t>=tc)assert.equal(m,0);}
  close(paths.checkpoints('thermal','square')[1],tc);
});

test('square Metropolis equilibrium agrees with the independently verified exact ensemble',()=>{
  const m=new physics.IsingModel(4,2.8,912,'random',.27,'square'),target=square.at(2.8,.27);
  m.sweep(1000);let e=0,mag=0;
  for(let i=0;i<30000;i++){m.sweep();e+=m.energy/m.n;mag+=m.magnetization/m.n;}
  close(e/30000,target.e,.035);close(mag/30000,target.m,.025);
});

function canvas(){
  const context=new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  return {getBoundingClientRect:()=>({width:640,height:440}),getContext:()=>context};
}
test('both rendered geometries locate every site and preserve simulation state through every view and replay',()=>{
  const sandbox={SpinPhysics:physics,SpinPresentation:presentation,document:{createElement:canvas},devicePixelRatio:1};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../demo/plots.js'),'utf8'),sandbox);
  const view=new sandbox.SpinPlots.LatticeView(canvas());
  for(const lattice of ['triangular','square','triangular']){
    const model=new physics.IsingModel(16,3,42,'random',0,lattice);view.setModel(model);view.zoom=view.targetZoom=1;view.draw(0);
    const {ox,oy,spacing}=view.layout;
    for(let k=0;k<model.n;k++){
      const r=Math.floor(k/model.size),c=k%model.size;
      assert.equal(view.locate(ox+view.siteX(r,c)*spacing,oy+view.siteY(r)*spacing),k);
    }
    for(const mode of ['domains','walls','spins']){
      view.mode=mode;
      for(const zoom of [1,4]){
        view.zoom=view.targetZoom=zoom;const before=model.snapshot();view.draw(0);
        assert.deepEqual(model.snapshot(),before);
      }
    }
    const before=model.spins.slice();model.sweep();const computed=model.snapshot();
    assert.ok(view.startReplay(before,0));
    for(const time of [0,450,900,1800])view.draw(0,null,time);
    assert.deepEqual(model.snapshot(),computed);
    if(lattice==='square')assert.equal([...view.map].filter(k=>k<0).length,0);
  }
});
