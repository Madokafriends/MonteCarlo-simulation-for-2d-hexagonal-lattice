const {test}=require('node:test');
const assert=require('node:assert/strict');
const {IsingModel}=require('../demo/model.js');
test('six reciprocal neighbors and exact local energy changes',()=>{
 const m=new IsingModel(8,3,42);
 for(let i=0;i<m.n;i++){
  assert.equal(new Set(m.neighbors[i]).size,6);
  m.neighbors[i].forEach(j=>assert.ok(m.neighbors[j].includes(i)));
  const e=m.totalEnergy(),d=m.delta(i);m.spins[i]*=-1;
  assert.equal(m.totalEnergy()-e,d);m.spins[i]*=-1;
 }
});
test('incremental observables agree with recalculation',()=>{
 const m=new IsingModel(12,3.64,18);m.sweep(12);
 assert.equal(m.energy,m.totalEnergy());
 assert.equal(m.magnetization,m.spins.reduce((a,b)=>a+b,0));
});
test('zero temperature and ordered energy',()=>{
 const m=new IsingModel(6,0,4,'ordered');
 assert.equal(m.energy,-3*m.n);assert.equal(m.attempt(4,0).accepted,false);
 m.spins[4]=-1;m.energy=m.totalEnergy();m.magnetization=m.n-2;
 assert.equal(m.attempt(4,.99).accepted,true);
});
test('deterministic seeded replay',()=>{
 const a=new IsingModel(8,4,3),b=new IsingModel(8,4,3);
 a.sweep(10);b.sweep(10);assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(a.snapshot().spins.length,64);
});
test('temperature controls uphill acceptance',()=>{
 const low=new IsingModel(6,1,1),high=new IsingModel(6,6,1);
 assert.ok(high.probability(4)>low.probability(4));assert.equal(low.probability(-4),1);
 assert.throws(()=>new IsingModel(5,1));
});
