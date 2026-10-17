const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ExactEnsemble}=require('../demo/thermo.js');
const {IsingModel,criticalTemperature,spontaneousMagnetization}=require('../demo/model.js');
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,a+' differs from '+b);
test('field work, local flips and global inversion have the correct energy',()=>{
 const m=new IsingModel(8,3.1,19,'random',.37);
 for(let k=0;k<m.n;k++){
  const e=m.totalEnergy(),d=m.delta(k);m.spins[k]*=-1;
  close(m.totalEnergy()-e,d);m.spins[k]*=-1;
 }
 const e=m.energy,M=m.magnetization;m.setField(-.82);
 close(m.energy-e,-(-.82-.37)*M);m.sweep(150);close(m.energy,m.totalEnergy(),1e-8);
 const before=m.energy,M0=m.magnetization;m.invert();
 close(m.energy-before,2*m.field*M0);close(m.energy,m.totalEnergy(),1e-8);close(m.magnetization,-M0);
});
test('fast sweep is identical to individual seeded proposals',()=>{
 const a=new IsingModel(12,4.2,31,'random',-.2),b=new IsingModel(12,4.2,31,'random',-.2);
 a.sweep(20);for(let i=0;i<20*b.n;i++)b.attempt();assert.deepEqual(a.snapshot(),b.snapshot());
});
test('Wolff flips exactly the reported cluster and maintains energy and M',()=>{
 const m=new IsingModel(12,criticalTemperature,815);
 for(let j=0;j<120;j++){
  const before=m.spins.slice(),c=m.wolff(),set=new Set(c.sites);assert.equal(set.size,c.size);
  for(let k=0;k<m.n;k++)assert.equal(m.spins[k],before[k]*(set.has(k)?-1:1));
  close(m.energy,m.totalEnergy());close(m.magnetization,m.spins.reduce((a,b)=>a+b,0));
 }
 m.setField(.01);assert.throws(()=>m.wolff(),/h = 0/);
});
test('zero-T ordered Wolff flips all spins without changing energy',()=>{
 const m=new IsingModel(8,0,1,'up'),e=m.energy;
 assert.equal(m.wolff().size,m.n);assert.equal(m.magnetization,-m.n);assert.equal(m.energy,e);
 m.invert();assert.equal(m.energy,e);assert.equal(m.magnetization,m.n);assert.equal(m.domainWallFraction(),0);
});
const ensemble=new ExactEnsemble();
test('exact enumeration covers 65536 states and correct ground-state degeneracy',()=>{
 assert.equal(ensemble.groups.reduce((a,g)=>a+g.g,0),65536);
 const z=ensemble.at(0,0);close(z.e,-3);close(z.s,Math.log(2)/16);close(z.m,0);close(z.absM,1);
 const p=ensemble.at(0,.3);close(p.m,1);close(p.s,0);close(p.e,-3.3);
});
test('infinite-T entropy is ln 2, magnetization distribution is binomial',()=>{
 const p=ensemble.at(1e10,.4);close(p.s,Math.log(2));close(p.e,0,1e-8);
 let choose=1;for(let k=0;k<=16;k++){if(k)choose=choose*(17-k)/k;close(p.distribution[k],choose/65536);}
});
test('entropy and Cv satisfy thermodynamic derivatives at fixed field',()=>{
 for(const t of [1.5,3.64,7]){
  const h=.23,eps=1e-4,p=ensemble.at(t,h),a=ensemble.at(t-eps,h),b=ensemble.at(t+eps,h);
  close(p.e-p.t*p.s,p.f,1e-10);close((b.e-a.e)/(2*eps),p.cv,1e-7);
  close((b.s-a.s)/(2*eps),p.cv/t,1e-7);close(p.distribution.reduce((a,b)=>a+b,0),1);
 }
});
test('field reversal mirrors the exact ensemble',()=>{
 const a=ensemble.at(3.1,.4),b=ensemble.at(3.1,-.4),z=ensemble.at(3.1,0);
 close(a.m,-b.m);close(a.s,b.s);close(a.e,b.e);close(z.m,0);
 a.distribution.forEach((p,i)=>close(p,b.distribution[16-i]));assert.ok(a.m>z.m&&z.m>b.m);
});
test('hexagonal Bravais exact magnetization has Tc and exponent 1/8',()=>{
 close(criticalTemperature,3.640956906507349,1e-12);close(spontaneousMagnetization(0),1);
 assert.equal(spontaneousMagnetization(criticalTemperature),0);assert.equal(spontaneousMagnetization(7),0);
 const a=spontaneousMagnetization(criticalTemperature-1e-5),b=spontaneousMagnetization(criticalTemperature-1e-6);
 close(Math.log(a/b)/Math.log(10),.125,1e-5);
});
test('both Monte Carlo samplers reproduce independently enumerated equilibrium moments',()=>{
 for(const [h,method]of [[0,'wolff'],[.35,'metropolis']]){
  const m=new IsingModel(4,4,723,'random',h),target=ensemble.at(4,h);
  for(let i=0;i<1000;i++)method==='wolff'?m.wolff():m.sweep();
  let energy=0,absM=0,mag=0;
  for(let i=0;i<30000;i++){
   method==='wolff'?m.wolff():m.sweep();energy+=m.energy/m.n;absM+=Math.abs(m.magnetization/m.n);mag+=m.magnetization/m.n;
  }
  close(energy/30000,target.e,.035);close(absM/30000,target.absM,.02);close(mag/30000,target.m,.03);
 }
});
