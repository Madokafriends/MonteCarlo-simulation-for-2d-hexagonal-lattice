(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./model.js'):root.SpinPhysics);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SpinPaths=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(physics){
  'use strict';
  function fieldLimits(t,lattice='triangular'){
    const tc=physics.criticalTemperatureFor(lattice),amplitude=physics.spontaneousMagnetization(t,lattice);
    return {minus:-amplitude,plus:amplitude,jump:2*amplitude,
      kind:t<tc?'first':t===tc?'critical':'smooth'};
  }
  function point(path,value,fixedT=2.5){
    if(!Number.isFinite(value)||!Number.isFinite(fixedT))throw new TypeError('Finite path parameters required');
    return path==='thermal'?{t:Math.max(0,Math.min(8,value)),h:0}:
      {t:Math.max(.5,Math.min(6,fixedT)),h:Math.max(-.8,Math.min(.8,value))};
  }
  function checkpoints(path,lattice='triangular'){
    const tc=physics.criticalTemperatureFor(lattice);
    return path==='thermal'?[tc-.2,tc,tc+.2]:[-.2,0,.2];
  }
  // Logarithmic refinement resolves the steep beta=1/8 approach without an artificial final jump.
  function orderCurve(lattice='triangular'){
    const tc=physics.criticalTemperatureFor(lattice),m0=t=>physics.spontaneousMagnetization(t,lattice);
    const points=[];
    for(let t=0;t<tc-.1;t+=.015)points.push([t,m0(t)]);
    for(let exponent=1;exponent<=14;exponent+=.08){const t=tc-10**-exponent;points.push([t,m0(t)]);}
    points.push([tc,0],[8,0]);return points;
  }
  return {fieldLimits,point,checkpoints,orderCurve};
});
