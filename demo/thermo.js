(function(root,factory){
const api=factory(typeof module==='object'&&module.exports?require('./model.js'):root.SpinPhysics);
if(typeof module==='object'&&module.exports)module.exports=api;else root.SpinThermo=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(physics){
'use strict';
function validateDimensions(columns,rows){
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<3||rows<4||rows%2||columns*rows>24)
    throw Error('Exact enumeration requires at least 3 columns, an even row count >= 4, and at most 24 spins.');
}
// Same periodic odd-row geometry as the live lattice, with rectangular dimensions.
// Gray-code traversal changes one spin at a time; the full density of states is exact.
function* enumerate(columns,rows,lattice){
  const n=columns*rows,states=2**n,stride=n+1,z=physics.latticeSpec(lattice).coordination;
  const adjacency=physics.createAdjacency(columns,rows,lattice),bonds=z*n/2;
  const spins=new Int8Array(n).fill(-1),counts=new Uint32Array((2*bonds+1)*stride);
  let energy=-bonds,magnetization=-n;counts[0]=1;
  for(let start=1;start<states;start+=65536){
    const end=Math.min(states,start+65536);
    for(let state=start;state<end;state++){
      const k=31-Math.clz32(state&-state),p=k*z,spin=spins[k];
      const sum=spins[adjacency[p]]+spins[adjacency[p+1]]+spins[adjacency[p+2]]+
        spins[adjacency[p+3]]+(z===6?spins[adjacency[p+4]]+spins[adjacency[p+5]]:0);
      energy+=2*spin*sum;magnetization-=2*spin;spins[k]=-spin;
      counts[(energy+bonds)*stride+(magnetization+n)/2]++;
    }
    yield;
  }
  const groups=[];
  for(let i=0;i<counts.length;i++)if(counts[i])groups.push({e:Math.floor(i/stride)-bonds,m:2*(i%stride)-n,g:counts[i]});
  return groups;
}
// Grouping by (bond energy, M) is lossless and makes subsequent T/h queries inexpensive.
class ExactEnsemble{
  constructor(columns=4,rows=4,lattice='triangular',preparedGroups=null){
    validateDimensions(columns,rows);
    physics.latticeSpec(lattice);this.lattice=lattice;
    this.columns=columns;this.rows=rows;this.size=columns;this.n=columns*rows;this.stateCount=2**this.n;
    if(preparedGroups){this.groups=preparedGroups;return;}
    const job=enumerate(columns,rows,lattice);let result;
    do{result=job.next();}while(!result.done);
    this.groups=result.value;
  }
  static async create(columns=4,rows=4,lattice='triangular'){
    validateDimensions(columns,rows);
    const job=enumerate(columns,rows,lattice);let result=job.next();
    while(!result.done){await new Promise(resolve=>setTimeout(resolve,0));result=job.next();}
    return new ExactEnsemble(columns,rows,lattice,result.value);
  }
  at(t,h=0){
    if(!Number.isFinite(t)||t<0||!Number.isFinite(h))throw Error('Invalid ensemble parameters');
    const entries=this.groups,n=this.n;let minE=Infinity;
    for(const a of entries)minE=Math.min(minE,a.e-h*a.m);
    let z=0,e=0,m=0,absM=0;
    const weights=new Float64Array(entries.length),distribution=new Float64Array(n+1);
    for(let i=0;i<entries.length;i++){
      const a=entries[i],energy=a.e-h*a.m;
      const w=a.g*(t>0?Math.exp(-(energy-minE)/t):(Math.abs(energy-minE)<1e-10?1:0));
      weights[i]=w;z+=w;e+=w*energy;m+=w*a.m;absM+=w*Math.abs(a.m);
      distribution[(a.m+n)/2]+=w;
    }
    e/=z;m/=z;absM/=z;let varE=0,varM=0;
    for(let i=0;i<entries.length;i++){
      const a=entries[i];varE+=weights[i]*(a.e-h*a.m-e)**2/z;varM+=weights[i]*(a.m-m)**2/z;
    }
    for(let i=0;i<=n;i++)distribution[i]/=z;
    const s=(Math.log(z)+(t>0?(e-minE)/t:0))/n;
    return {t,h,n,lattice:this.lattice,columns:this.columns,rows:this.rows,e:e/n,m:m/n,absM:absM/n,s,
      f:t>0?(minE-t*Math.log(z))/n:minE/n,
      cv:t>0?varE/(n*t*t):0,chi:t>0?varM/(n*t):null,
      distribution:Array.from(distribution)};
  }
  curve(h=0,steps=160){return Array.from({length:steps+1},(_,i)=>this.at(8*i/steps,h));}
}
return {ExactEnsemble};
});
