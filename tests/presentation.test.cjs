const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const physics = require('../demo/model.js');
const presentation = require('../demo/presentation.js');

test('reveal travels from left to right and completes all columns', () => {
  const {revealProgress: p} = presentation;
  for (let x = 0; x <= 1; x += .05) {
    assert.equal(p(x, 0), 0);
    assert.equal(p(x, 1800), 1);
    let previous = 0;
    for (let t = 0; t <= 1800; t += 30) {
      assert.ok(p(x, t) >= previous);
      previous = p(x, t);
    }
  }
  assert.ok(p(0, 650) > p(.5, 650));
  assert.ok(p(.5, 1100) > p(1, 1100));
});

test('only changed spins rotate, ending at the correct binary orientation', () => {
  for (const spin of [-1, 1]) {
    for (const p of [0, .25, .5, .75, 1]) {
      const still = presentation.spinPose(spin, spin, p);
      assert.equal(still.lift, 0);
      assert.equal(still.moving, false);
      assert.ok(Math.abs(Math.cos(still.angle) - spin) < 1e-12);
    }
    const begin = presentation.spinPose(spin, -spin, 0);
    const end = presentation.spinPose(spin, -spin, 1);
    assert.ok(Math.abs(Math.cos(begin.angle) - spin) < 1e-12);
    assert.ok(Math.abs(Math.cos(end.angle) + spin) < 1e-12);
    assert.ok(presentation.spinPose(spin, -spin, .5).lift > 0);
  }
});

test('means use recorded configurations and retain signed magnetization', () => {
  const samples = [{x:3,m:1,e:-3}, {x:4,m:-1,e:-3}, {x:10,m:.5,e:-1.5}];
  assert.deepEqual(presentation.sampleMeans(samples), {count:3,m:1/6,e:-2.5});
  assert.deepEqual(presentation.sampleMeans([]), {count:0,m:null,e:null});
  assert.deepEqual(presentation.sampleMeans([samples[2]]), {count:1,m:.5,e:-1.5});
});

// A drawing-only canvas harness exercises the real renderer without a browser RNG
// or simulation mocks. Pixel appearance is verified separately in the browser.
function canvas() {
  const context = new Proxy({
    createImageData: (w,h) => ({data:new Uint8ClampedArray(w*h*4)}),
    createRadialGradient: () => ({addColorStop(){}}),
    createLinearGradient: () => ({addColorStop(){}}),
  }, {get:(target,key)=>key in target ? target[key] : ()=>{}});
  return {width:640,height:400,getBoundingClientRect:()=>({width:640,height:400}),getContext:()=>context};
}
test('display replay leaves the computed MC state, counters and RNG unchanged', () => {
  const sandbox = {SpinPhysics:physics,SpinPresentation:presentation,
    document:{createElement:canvas},devicePixelRatio:1};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../demo/plots.js'),'utf8'), sandbox);
  for (const algorithm of ['metropolis','wolff']) {
    const model = new physics.IsingModel(16,physics.criticalTemperature,42);
    const view = new sandbox.SpinPlots.LatticeView(canvas());
    view.setModel(model);view.mode='spins';view.draw(0);
    const before = model.spins.slice();
    if(algorithm==='wolff')model.wolff();else model.sweep();
    const expected = JSON.stringify(model.snapshot());
    assert.ok(view.startReplay(before,100));
    for (let time=100;time<=1900;time+=25)view.draw(0,null,time);
    assert.equal(JSON.stringify(model.snapshot()),expected);
    view.replay=null;view.draw(0,null,2000);
    assert.equal(JSON.stringify(model.snapshot()),expected);
    assert.equal(view.startReplay(model.spins.slice(),2100),false);
  }
});
