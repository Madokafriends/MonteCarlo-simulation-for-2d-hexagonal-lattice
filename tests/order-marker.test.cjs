const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const physics=require('../demo/model.js');
const paths=require('../demo/paths.js');

test('instantaneous magnetization is plotted at zero and finite fields without changing the model',()=>{
  const markers=[],labels=[];
  let arc;
  const ctx=new Proxy({
    arc:(...args)=>{arc=args;},
    fill(){markers.push({arc,color:this.fillStyle});},
    fillText:text=>labels.push(text),
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:600,height:285})};
  const sandbox={devicePixelRatio:1,SpinPhysics:physics,SpinPaths:paths};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../demo/plots.js'),'utf8'),sandbox);
  for(const field of [0,.4,-.4]){
    const model=new physics.IsingModel(8,2.8,42,'random',field),before=model.snapshot();
    for(const showLive of [false,true]){
      markers.length=0;labels.length=0;
      sandbox.SpinPlots.order(canvas,model,{showLive});
      const live=markers.filter(marker=>marker.color===sandbox.SpinPlots.C.gold);
      assert.equal(live.length,showLive?1:0);
      if(showLive){
        const m=model.magnetization/model.n;
        assert.ok(Math.abs(live[0].arc[0]-(40+model.temperature/8*(582-40)))<1e-9);
        assert.ok(Math.abs(live[0].arc[1]-(255-(m+1.12)/2.24*(255-26)))<1e-9);
        assert.ok(labels.includes('Instantaneous m · h = '+field.toFixed(2)));
      }
      assert.deepEqual(model.snapshot(),before);
    }
  }
});
