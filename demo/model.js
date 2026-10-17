(function (root) {
'use strict';
const lattices=Object.freeze({
  triangular:Object.freeze({label:'Hexagonal Bravais',coordination:6,criticalTemperature:4/Math.log(3),rowSpacing:Math.sqrt(3)/2,rowOffset:.5,yOffset:1/Math.sqrt(3)}),
  square:Object.freeze({label:'Square',coordination:4,criticalTemperature:2/Math.log(1+Math.SQRT2),rowSpacing:1,rowOffset:0,yOffset:.5})
});
function latticeSpec(lattice='triangular'){
  if(!Object.prototype.hasOwnProperty.call(lattices,lattice))throw Error('Unknown lattice type');
  return lattices[lattice];
}
function criticalTemperatureFor(lattice='triangular'){return latticeSpec(lattice).criticalTemperature;}
const criticalTemperature=criticalTemperatureFor();
function createAdjacency(columns,rows,lattice='triangular'){
  const {coordination:z}=latticeSpec(lattice),adjacency=new Int32Array(columns*rows*z);
  const at=(r,c)=>((r+rows)%rows)*columns+(c+columns)%columns;
  for(let k=0;k<columns*rows;k++){
    const r=Math.floor(k/columns),c=k%columns,d=r%2?1:-1;
    adjacency.set(lattice==='square'
      ?[at(r,c-1),at(r,c+1),at(r-1,c),at(r+1,c)]
      :[at(r,c-1),at(r,c+1),at(r-1,c),at(r-1,c+d),at(r+1,c),at(r+1,c+d)],k*z);
  }
  return adjacency;
}
class RNG {
  constructor(seed){this.state=seed>>>0;}
  next(){
    this.state=(this.state+0x6D2B79F5)>>>0;
    let t=this.state;
    t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  }
}
// Both geometries use periodic boundaries; even L closes the staggered hexagonal Bravais torus.
class IsingModel {
  constructor(size=64,temperature=undefined,seed=42,initial='random',field=0,lattice='triangular'){
    if(!Number.isInteger(size)||size<4||size%2)throw Error('Use an even size >= 4');
    if(!['random','ordered','up','down','split'].includes(initial))throw Error('Unknown initial state');
    this.size=size;this.n=size*size;this.seed=seed>>>0;this.rng=new RNG(this.seed);
    this.spins=new Int8Array(this.n);
    for(let i=0;i<this.n;i++)this.spins[i]=initial==='random'?(this.rng.next()<.5?-1:1)
      :initial==='split'?(i%size<size/2?1:-1):initial==='down'?-1:1;
    this.magnetization=this.spins.reduce((a,b)=>a+b,0);
    this.field=0;this.temperature=0;
    this.setLattice(lattice);this.setTemperature(temperature===undefined?this.criticalTemperature:temperature);this.setField(field);
    this.queue=new Int32Array(this.n);this.marks=new Uint32Array(this.n);this.generation=0;
  }
  setLattice(lattice){
    const spec=latticeSpec(lattice);
    if(lattice===this.lattice)return;
    this.lattice=lattice;this.coordination=spec.coordination;this.criticalTemperature=spec.criticalTemperature;
    const z=this.coordination;
    this.adjacency=createAdjacency(this.size,this.size,lattice);
    this.neighbors=Array.from({length:this.n},(_,k)=>this.adjacency.subarray(k*z,(k+1)*z));
    this.acceptTable=new Float64Array(2*(z+1));this.updateTable();
    this.energy=this.totalEnergy();
    this.attempts=0;this.accepted=0;this.clusterMoves=0;this.clusterFlipped=0;
  }
  setTemperature(t){
    if(!Number.isFinite(t)||t<0)throw Error('Temperature must be finite and nonnegative');
    this.temperature=t;this.updateTable();
  }
  setField(h){
    if(!Number.isFinite(h))throw Error('Field must be finite');
    this.energy-=(h-this.field)*this.magnetization;this.field=h;this.updateTable();
  }
  updateTable(){
    if(!this.acceptTable)return;
    const z=this.coordination;
    for(let s=-1;s<=1;s+=2)for(let j=0;j<=z;j++)
      this.acceptTable[(s>0?z+1:0)+j]=this.probability(2*s*(2*j-z+this.field));
  }
  neighborSum(k){
    const a=this.adjacency,s=this.spins,z=this.coordination,p=k*z;
    return s[a[p]]+s[a[p+1]]+s[a[p+2]]+s[a[p+3]]+(z===6?s[a[p+4]]+s[a[p+5]]:0);
  }
  delta(k){return 2*this.spins[k]*(this.neighborSum(k)+this.field)||0;}
  probability(dE){return dE<=0?1:(this.temperature?Math.exp(-dE/this.temperature):0);}
  totalEnergy(){
    let e=0;
    for(let k=0;k<this.n;k++)e-=this.spins[k]*(.5*this.neighborSum(k)+this.field);
    return e;
  }
  flip(k){this.energy+=this.delta(k);this.magnetization-=2*this.spins[k];this.spins[k]*=-1;}
  attempt(k=Math.floor(this.rng.next()*this.n),draw=this.rng.next()){
    if(!Number.isInteger(k)||k<0||k>=this.n||!Number.isFinite(draw)||draw<0||draw>=1)throw Error('Invalid proposal');
    const spin=this.spins[k],neighborSum=this.neighborSum(k),delta=this.delta(k);
    const probability=this.probability(delta),accepted=draw<probability;
    this.attempts++;
    if(accepted){this.flip(k);this.accepted++;}
    return {index:k,spin,neighborSum,delta,probability,draw,accepted};
  }
  // No per-proposal allocations. Consume two random draws even for downhill moves.
  sweep(count=1){
    if(!Number.isFinite(count)||count<0)throw Error('Invalid sweep count');
    const proposals=Math.round(this.n*count),s=this.spins,a=this.adjacency,z=this.coordination;
    let e=this.energy,m=this.magnetization,accepted=0;
    for(let t=0;t<proposals;t++){
      const k=Math.floor(this.rng.next()*this.n),u=this.rng.next(),spin=s[k],p=z*k;
      const sum=s[a[p]]+s[a[p+1]]+s[a[p+2]]+s[a[p+3]]+(z===6?s[a[p+4]]+s[a[p+5]]:0);
      if(u<this.acceptTable[(spin>0?z+1:0)+(sum+z)/2]){
        s[k]=-spin;e+=2*spin*(sum+this.field);m-=2*spin;accepted++;
      }
    }
    this.energy=e;this.magnetization=m;this.attempts+=proposals;this.accepted+=accepted;
    return accepted;
  }
  wolff(){
    if(this.field!==0)throw Error('This Wolff implementation requires h = 0');
    if(++this.generation>=0xffffffff){this.marks.fill(0);this.generation=1;}
    const mark=this.generation,seed=Math.floor(this.rng.next()*this.n),spin=this.spins[seed];
    const probability=this.temperature?-Math.expm1(-2/this.temperature):1;
    let head=0,tail=1;this.queue[0]=seed;this.marks[seed]=mark;
    while(head<tail){
      const k=this.queue[head++];
      for(let q=0;q<this.coordination;q++){
        const j=this.adjacency[k*this.coordination+q];
        if(this.marks[j]!==mark&&this.spins[j]===spin&&this.rng.next()<probability){
          this.marks[j]=mark;this.queue[tail++]=j;
        }
      }
    }
    // Sequential changes cancel internal bonds and retain the correct boundary energy.
    for(let q=0;q<tail;q++)this.flip(this.queue[q]);
    this.clusterMoves++;this.clusterFlipped+=tail;
    return {seed,spin,size:tail,sites:this.queue.slice(0,tail),probability};
  }
  invert(){
    this.energy+=2*this.field*this.magnetization;this.magnetization*=-1;
    for(let i=0;i<this.n;i++)this.spins[i]*=-1;
  }
  domainWallFraction(){
    const bondEnergy=this.energy+this.field*this.magnetization;
    return (bondEnergy+this.coordination*this.n/2)/(this.coordination*this.n);
  }
  snapshot(){
    return {model:this.lattice+'-lattice ferromagnetic Ising',lattice:this.lattice,units:'J = k_B = 1; h = magnetic moment * B / J',
      boundary:'periodic',seed:this.seed,rngState:this.rng.state>>>0,size:this.size,
      temperature:this.temperature,field:this.field,attempts:this.attempts,sweeps:this.attempts/this.n,
      accepted:this.accepted,clusterMoves:this.clusterMoves,clusterFlipped:this.clusterFlipped,
      energyPerSpin:this.energy/this.n,magnetization:this.magnetization/this.n,spins:Array.from(this.spins),
      note:'Live trajectory, not an equilibrium estimate. Neither local sweeps nor Wolff moves are physical time.'};
  }
}
// Matveev & Shrock, J. Phys. A 29 (1996), Eq. (4.2): u=exp(-4J/kBT).
// h -> 0+ AFTER N -> infinity, not the signed mean of a finite zero-field system.
function spontaneousMagnetization(t,lattice='triangular'){
  const tc=criticalTemperatureFor(lattice);
  if(t===0)return 1;if(t>=tc)return 0;
  // Yang, Phys. Rev. 85, 808 (1952), isotropic square lattice.
  if(lattice==='square')return Math.pow(Math.max(0,1-Math.sinh(2/t)**-4),1/8);
  const u=Math.exp(-4/t);
  return Math.pow((1+u)/(1-u),3/8)*Math.pow(Math.max(0,(1-3*u)/(1+3*u)),1/8);
}
const api={IsingModel,RNG,latticeSpec,createAdjacency,criticalTemperatureFor,criticalTemperature,spontaneousMagnetization};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpinPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
