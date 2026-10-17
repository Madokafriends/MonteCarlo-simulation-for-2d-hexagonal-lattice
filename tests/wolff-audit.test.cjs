const {test}=require('node:test');
const assert=require('node:assert/strict');
const {IsingModel,RNG,criticalTemperature:TC}=require('../demo/model.js');
const {ExactEnsemble}=require('../demo/thermo.js');

// Independent coordinate construction; do not reuse the production adjacency table.
function neighbours(k,L){
  const r=Math.floor(k/L),c=k%L,offset=r%2?1:-1;
  return [[r,c-1],[r,c+1],[r-1,c],[r-1,c+offset],[r+1,c],[r+1,c+offset]]
    .map(([y,x])=>((y+L)%L)*L+(x+L)%L);
}

// Alternative implementation: flip upon insertion, rather than mark and flip later.
// This follows the rejection-free construction in Budd's cluster-algorithm notes.
function referenceMove(model){
  const spins=model.spins.slice(),rng=new RNG(0);rng.state=model.rng.state;
  const seed=Math.floor(rng.next()*model.n),spin=spins[seed],sites=[seed];
  const p=model.temperature===0?1:1-Math.exp(-2/model.temperature);
  spins[seed]=-spin;
  for(let i=0;i<sites.length;i++)for(const j of neighbours(sites[i],model.size)){
    if(spins[j]===spin&&rng.next()<p){spins[j]=-spin;sites.push(j);}
  }
  return {spins,seed,sites,rngState:rng.state};
}

test('Wolff matches an independent flip-on-insertion reference',()=>{
  for(const T of [0,1.5,TC,7,1e12])for(const initial of ['up','down','split','random']){
    const model=new IsingModel(8,T,815,initial);
    for(let move=0;move<30;move++){
      const reference=referenceMove(model),actual=model.wolff();
      assert.equal(actual.seed,reference.seed);
      assert.deepEqual([...actual.sites],reference.sites);
      assert.deepEqual(model.spins,reference.spins);
      assert.equal(model.rng.state,reference.rngState);
    }
  }
});

test('each cluster is connected, monochromatic, and has the exact boundary energy and magnetization change',()=>{
  for(const T of [0,1.5,TC,7]){
    const model=new IsingModel(16,T,723,'random');
    for(let move=0;move<160;move++){
      const before=model.spins.slice(),M=model.magnetization,E=model.energy,updates=model.clusterMoves;
      const c=model.wolff(),inside=new Set(c.sites);
      assert.equal(inside.size,c.size);assert.ok(inside.has(c.seed));
      const reached=new Set([c.seed]),queue=[c.seed];let boundaryDelta=0;
      for(let i=0;i<queue.length;i++)for(const j of neighbours(queue[i],model.size)){
        if(inside.has(j)&&!reached.has(j)){reached.add(j);queue.push(j);}
      }
      assert.equal(reached.size,c.size);
      for(const i of c.sites){
        assert.equal(before[i],c.spin);
        for(const j of neighbours(i,model.size))if(!inside.has(j))boundaryDelta+=2*before[i]*before[j];
      }
      assert.equal(model.magnetization-M,-2*c.spin*c.size);
      assert.equal(model.energy-E,boundaryDelta);
      assert.equal(model.clusterMoves,updates+1);
      assert.equal(model.magnetization,[...model.spins].reduce((a,b)=>a+b,0));
    }
  }
});

test('whole-system reversals at zero temperature are valid zero-energy Wolff moves',()=>{
  const model=new IsingModel(64,0,42,'up');
  for(let move=0;move<8;move++){
    const M=model.magnetization,E=model.energy,c=model.wolff();
    assert.equal(c.size,model.n);assert.equal(model.magnetization,-M);assert.equal(model.energy,E);
    assert.equal(Math.abs((model.magnetization-M)/model.n),2);
  }
});

test('Wolff equilibrium moments agree with exact enumeration below, at and above Tc',()=>{
  const ensemble=new ExactEnsemble();
  for(const T of [1.5,TC,7]){
    let e=0,m=0,absM=0,count=0;
    for(const seed of [42,723,815,123456]){
      const model=new IsingModel(4,T,seed);
      for(let i=0;i<2000;i++)model.wolff();
      for(let i=0;i<25000;i++){
        model.wolff();e+=model.energy/model.n;m+=model.magnetization/model.n;
        absM+=Math.abs(model.magnetization/model.n);count++;
      }
    }
    const target=ensemble.at(T,0);
    assert.ok(Math.abs(e/count-target.e)<.015,'mean energy at T='+T);
    assert.ok(Math.abs(m/count-target.m)<.012,'signed magnetization at T='+T);
    assert.ok(Math.abs(absM/count-target.absM)<.012,'absolute magnetization at T='+T);
  }
});
