const {test}=require('node:test');
const assert=require('node:assert/strict');
const {criticalTemperature:tc,spontaneousMagnetization:m0}=require('../demo/model.js');
const {point,fieldLimits,checkpoints,orderCurve}=require('../demo/paths.js');

test('guided paths cross the intended boundary while holding the other parameter fixed',()=>{
  for(const t of [0,2.5,tc,8])assert.deepEqual(point('thermal',t),{t,h:0});
  for(const h of [-.8,0,.8])assert.deepEqual(point('field',h,2.5),{t:2.5,h});
  assert.equal(point('field',0,tc).t,tc);
  assert.equal(checkpoints('thermal')[1],tc);assert.equal(checkpoints('field')[1],0);
  assert.throws(()=>point('field',NaN),TypeError);
});
test('low-temperature field discontinuity equals the difference of symmetry-related pure phases',()=>{
  for(const t of [.5,2.5,tc-.001]){
    const p=fieldLimits(t);
    assert.equal(p.kind,'first');assert.equal(p.plus,-p.minus);
    assert.equal(p.jump,p.plus-p.minus);assert.equal(p.jump,2*m0(t));assert.ok(p.jump>0);
  }
});
test('zero field jump distinguishes a critical endpoint from a smooth high-temperature response',()=>{
  assert.equal(fieldLimits(tc).jump,0);assert.equal(fieldLimits(tc).kind,'critical');
  assert.equal(fieldLimits(tc+.01).jump,0);assert.equal(fieldLimits(tc+.01).kind,'smooth');
  assert.ok(fieldLimits(tc-1e-6).jump<fieldLimits(tc-1e-4).jump);
});
test('plotted thermal branches resolve the continuous approach and never invent a nonzero endpoint',()=>{
  const curve=orderCurve();
  for(let i=1;i<curve.length;i++){
    assert.ok(curve[i][0]>curve[i-1][0]);assert.ok(curve[i][1]<=curve[i-1][1]+1e-12);
  }
  const at=curve.findIndex(([t])=>t===tc);
  assert.equal(curve[at][1],0);assert.ok(curve[at-1][1]<.02);
  assert.deepEqual(curve.at(-1),[8,0]);
});
