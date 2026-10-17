(function(){
'use strict';
const $=id=>document.getElementById(id),{IsingModel}=SpinPhysics,P=SpinPlots;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const view=new P.LatticeView($('lattice'));
const ensembles=new Map();
let model,selected=0,running=false,history=[],exact,criticalZoom=false;
let dirty=true,thermoDirty=true,uiDirty=true,latticeVisible=true,analysisVisible=true;
let warmupToken=0,warming=false,pending=0,lastFrame=0,lastUI=0;
const signed=(v,d=2)=>{const a=Math.abs(v).toFixed(d);return (+a===0?'':v>0?'+':'−')+a;};
function position(){return model.attempts/model.n;}
function spinZoom(){return model.size>=128||$('lattice').getBoundingClientRect().width<450?8:4;}
function record(){history.push({x:position(),m:model.magnetization/model.n,e:model.energy/model.n});if(history.length>240)history.shift();}
function updateStepControls(){
  const replaying=!!view.replay,label=warming?'Preparing…':replaying?'Finish replay':'Single step';
  for(const id of ['step','spinStep']){
    $(id).disabled=warming;$(id).textContent=label;
    $(id).title=replaying?'Display the completed sweep without an additional update.':'Advance one Metropolis sweep.';
  }
  $('play').disabled=warming;
  $('stepDescription').textContent=warming?'Initial-state preparation':replaying?'Left-to-right spin-flip replay':'Metropolis · One sweep per step';
}
function finishReplay(){
  view.replay=null;updateStepControls();
  $('stageBadge').textContent='Current configuration';
  $('lattice').setAttribute('aria-busy','false');dirty=true;
}
function newSegment(){
  finishReplay();history=[];record();pending=0;dirty=true;uiDirty=true;thermoDirty=true;
}
function setRunning(value){
  if(warming)return;
  finishReplay();running=value;pending=0;uiDirty=true;dirty=true;
  $('play').textContent=running?'Ⅱ Pause':'▶ Run';$('play').setAttribute('aria-pressed',String(running));
  $('runStatus').textContent=running?'● Running':'Paused';$('runStatus').classList.toggle('running',running);
}
function controls(){
  const spec=SpinPhysics.latticeSpec(model.lattice);
  $('latticeType').value=model.lattice;
  $('modelGeometry').textContent=spec.label+' lattice · '+model.coordination+' neighbours';
  $('criticalValue').textContent=model.criticalTemperature.toFixed(3);
  $('criticalPresetTemp').textContent='T ≈ '+model.criticalTemperature.toFixed(3)+' · h = 0';
  $('orderReference').textContent='Infinite '+spec.label.replace(/^./,c=>c.toLowerCase())+' lattice · Exact zero-field result';
  $('distributionReference').textContent='4 × 4 · '+spec.label+' · Exact ensemble';
  $('lattice').setAttribute('aria-label',spec.label+' lattice spin configuration. Click to select a site, use arrow keys to select neighbours, or drag to pan when magnified.');
  $('temperature').value=model.temperature;$('tempNumber').value=model.temperature.toFixed(3);
  $('field').value=model.field;$('fieldNumber').value=model.field.toFixed(2);
  updateStepControls();
  $('fieldIndicator').textContent=model.field===0?'':'Field '+(model.field>0?'↑ ':'↓ ')+signed(model.field);
  $('fieldIndicator').style.color=model.field>0?P.C.up:P.C.down;
}
function setParameters(t,h){
  if(!Number.isFinite(t)||!Number.isFinite(h)){controls();return;}
  warmupToken++;warming=false;setRunning(running);
  model.setTemperature(Math.max(0,Math.min(8,t)));model.setField(Math.max(-2,Math.min(2,h)));
  newSegment();controls();presetSelection(null);refreshAll();
}
function seedValue(){
  const seed=Number($('seed').value);
  if(!Number.isInteger(seed)||seed<0||seed>4294967295){$('seed').value='42';return 42;}return seed;
}
function reset(initial='random'){
  warmupToken++;warming=false;setRunning(false);
  const lattice=$('latticeType').value;
  model=new IsingModel(+$('size').value,model?model.temperature:SpinPhysics.criticalTemperatureFor(lattice),seedValue(),initial,model?model.field:0,lattice);
  selected=Math.floor(model.size/2)*model.size+Math.floor(model.size/2);
  view.setModel(model);view.zoom=view.targetZoom=view.mode==='spins'?spinZoom():1;
  document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.zoom===view.targetZoom)));
  newSegment();controls();presetSelection(null);refreshAll();
}
function changeLattice(){
  const lattice=$('latticeType').value;
  if(lattice===model.lattice)return;
  warmupToken++;warming=false;setRunning(false);drag=null;
  model.setLattice(lattice);view.setModel(model);view.focus(selected);
  newSegment();controls();presetSelection(null);refreshAll();
}
function presetSelection(name){
  document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.toggle('active',b.dataset.preset===name);b.setAttribute('aria-pressed',String(b.dataset.preset===name));});
}
function refreshRegime(){
  const t=model.temperature,h=model.field,TC=model.criticalTemperature;
  let tag,title,text;
  if(h!==0){
    tag='Finite magnetic field';title='Field-induced spin alignment';
    text='The external field favours '+(h>0?'positive':'negative')+' magnetization. Thermal fluctuations compete with the field and ferromagnetic exchange.';
  }else if(t<TC-.2){
    tag='Ordered phase · T < Tc';title='Spontaneous magnetization';
    text='At h = 0 and T < Tc, the infinite lattice has two ordered phases with magnetization ±m₀(T). At nonzero temperature, thermal fluctuations can still reverse individual spins.';
  }else if(t>TC+.3){
    tag='Disordered phase · T > Tc';title='Paramagnetic disorder';
    text='Spontaneous magnetization vanishes above Tc. Finite configurations retain local correlations and fluctuate about zero magnetization.';
  }else{
    tag='Critical regime · T ≈ Tc';title='Correlations across length scales';
    text='The growing correlation length produces domains over a range of scales. Local Metropolis sampling exhibits critical slowing down.';
  }
  $('regimeTag').textContent=tag;$('regimeTitle').textContent=title;$('regimeText').textContent=text;
}
function refreshThermo(){
  if(!ensembles.has(model.lattice))ensembles.set(model.lattice,new SpinThermo.ExactEnsemble(4,4,model.lattice));
  const ensemble=ensembles.get(model.lattice);
  exact=ensemble.at(model.temperature,model.field);
  $('distributionCaption').textContent='T = '+model.temperature.toFixed(3)+' · h = '+signed(model.field)+
    ' · Canonical distribution over all '+ensemble.stateCount.toLocaleString('en-US')+' configurations.';
  $('distribution').setAttribute('aria-label','Exact magnetization distribution for '+ensemble.n+' spins on a '+ensemble.columns+' by '+ensemble.rows+' periodic '+SpinPhysics.latticeSpec(model.lattice).label.replace(/^./,c=>c.toLowerCase())+' lattice.');
  thermoDirty=false;
}
function updateNumbers(){
  const m=model.magnetization/model.n;
  $('magnetization').textContent=signed(m,3);$('magnetization').style.color=m>=0?P.C.up:P.C.down;
  $('absoluteM').textContent='|m| = '+Math.abs(m).toFixed(3);$('energy').textContent=(model.energy/model.n).toFixed(3);
  $('walls').textContent=(100*model.domainWallFraction()).toFixed(1)+'%';
  $('sweeps').textContent=position().toLocaleString('en-US',{maximumFractionDigits:1});
  $('sizeLabel').textContent=SpinPhysics.latticeSpec(model.lattice).label+' · '+model.size+' × '+model.size+' · Periodic';
  refreshRegime();
}
function drawAnalysis(){
  if(thermoDirty)refreshThermo();
  $('criticalZoom').textContent=criticalZoom?'Full temperature range':'Zoom near Tc';
  $('criticalZoom').setAttribute('aria-pressed',String(criticalZoom));
  const m0=SpinPhysics.spontaneousMagnetization(model.temperature,model.lattice),TC=model.criticalTemperature;
  const captions=[model.field!==0
    ?'The curves are the exact h = 0 reference; the simulation uses h = '+signed(model.field)+'.'
    :'T = '+model.temperature.toFixed(3)+' · m₀(T) = '+m0.toFixed(3)+'. The two branches are related by spin inversion.'];
  if(criticalZoom&&Math.abs(model.temperature-TC)>.1)captions.push('The selected temperature lies outside the magnified interval.');
  if($('showLiveM').checked)captions.push('Gold marker: instantaneous m = '+signed(model.magnetization/model.n,3)+' at the current T and h.');
  $('orderCaption').textContent=captions.join(' ');
  if(!analysisVisible)return;
  P.order($('orderPlot'),model,{zoom:criticalZoom,showLive:$('showLiveM').checked});
  P.distribution($('distribution'),exact);
}
function refreshAll(){
  updateNumbers();drawAnalysis();
  P.trace($('trace'),history,'m');P.trace($('energyTrace'),history,'e');
  dirty=true;uiDirty=false;
}
async function preset(name){
  warmupToken++;warming=false;setRunning(false);const token=warmupToken;
  const lattice=$('latticeType').value,TC=SpinPhysics.criticalTemperatureFor(lattice);
  const config={cold:{t:1.5,initial:'up',sweeps:2},critical:{t:TC,initial:'random',sweeps:120},hot:{t:7,initial:'random',sweeps:3}}[name];
  model=new IsingModel(+$('size').value,config.t,seedValue(),config.initial,0,lattice);
  selected=Math.floor(model.size/2)*model.size+Math.floor(model.size/2);
  view.setModel(model);view.zoom=view.targetZoom=view.mode==='spins'?spinZoom():1;
  warming=true;controls();presetSelection(name);newSegment();refreshAll();
  document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.zoom===view.targetZoom)));
  $('runStatus').textContent='Preparing';
  // Every preset uses only random-site Metropolis updates, yielded in bounded blocks.
  for(let i=0;i<config.sweeps*4;){
    if(token!==warmupToken)return;
    const until=performance.now()+5;
    do{model.sweep(.25);i++;}while(i<config.sweeps*4&&performance.now()<until);
    dirty=true;await new Promise(requestAnimationFrame);
  }
  if(token!==warmupToken)return;
  warming=false;newSegment();controls();refreshAll();setRunning(false);
}
function step(){
  if(warming)return;
  if(view.replay){finishReplay();return;}
  setRunning(false);
  const before=view.mode==='spins'&&!reduced?model.spins.slice():null;
  model.sweep();record();refreshAll();
  if(view.mode==='spins'){
    const bar=$('spinTransport').getBoundingClientRect();
    if(bar.top<0||bar.bottom>innerHeight)$('spinTransport').scrollIntoView({block:'start',behavior:'instant'});
  }
  const duration={slow:3600,normal:1800,fast:1000}[$('speed').value];
  if(before&&view.startReplay(before,performance.now(),selected,duration)){
    updateStepControls();$('stageBadge').textContent='Spin-flip replay';$('lattice').setAttribute('aria-busy','true');
  }
}
function selectSite(k){selected=k;setRunning(false);refreshAll();}
$('criticalZoom').addEventListener('click',()=>{criticalZoom=!criticalZoom;drawAnalysis();});
$('showLiveM').addEventListener('change',drawAnalysis);
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset)));
document.querySelectorAll('[data-initial]').forEach(b=>b.addEventListener('click',()=>reset(b.dataset.initial)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
  finishReplay();
  view.mode=b.dataset.view;
  const targetSpinZoom=spinZoom();
  if(view.mode==='spins'&&view.targetZoom<targetSpinZoom){view.targetZoom=targetSpinZoom;view.focus(selected);}
  document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  document.querySelectorAll('[data-zoom]').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.zoom===view.targetZoom)));
  $('viewHint').textContent=view.mode==='walls'?'Boundaries between antialigned nearest neighbours.':view.mode==='spins'?'Binary moments s = ±1. Drag to pan the magnified lattice.':'';
  $('viewHint').hidden=view.mode==='domains';
  dirty=true;
}));
document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{
  finishReplay();
  view.targetZoom=+b.dataset.zoom;if(view.targetZoom>1)view.focus(selected);
  document.querySelectorAll('[data-zoom]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));dirty=true;
}));

$('temperature').addEventListener('input',e=>setParameters(+e.target.value,model.field));
$('field').addEventListener('input',e=>setParameters(model.temperature,+e.target.value));
function commitNumber(id){
  const input=$(id),isTemperature=id==='tempNumber';
  if(input.value===''||!Number.isFinite(+input.value)){controls();return;}
  const value=+input.value,current=isTemperature?+model.temperature.toFixed(3):+model.field.toFixed(2);
  if(value!==current)setParameters(isTemperature?value:model.temperature,isTemperature?model.field:value);
}
for(const id of ['tempNumber','fieldNumber']){
  $(id).addEventListener('change',()=>commitNumber(id));
  $(id).addEventListener('blur',()=>commitNumber(id));
  $(id).addEventListener('keydown',e=>{if(e.key==='Enter'){commitNumber(id);e.currentTarget.blur();}});
}
$('criticalTemp').addEventListener('click',()=>setParameters(model.criticalTemperature,model.field));
$('latticeType').addEventListener('change',changeLattice);
$('zeroField').addEventListener('click',()=>setParameters(model.temperature,0));
$('play').addEventListener('click',()=>setRunning(!running));$('step').addEventListener('click',step);
$('spinStep').addEventListener('click',step);
$('size').addEventListener('change',()=>reset());$('seed').addEventListener('change',()=>reset());
$('speed').addEventListener('change',()=>{pending=0;});
let drag=null;
$('lattice').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  finishReplay();
  drag={x:e.clientX,y:e.clientY,fx:view.focusX,fy:view.focusY,moved:false};
  if(view.targetZoom>1)e.currentTarget.setPointerCapture(e.pointerId);
});
$('lattice').addEventListener('pointermove',e=>{
  if(!drag||view.targetZoom<=1)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
  if(!drag.moved)return;
  const s=view.layout?view.layout.spacing:1;
  view.focusX=Math.max(0,Math.min(view.widthUnits,drag.fx-dx/s));
  view.focusY=Math.max(0,Math.min(view.heightUnits,drag.fy-dy/s));dirty=true;
});
$('lattice').addEventListener('pointerup',e=>{
  if(!drag)return;
  if(!drag.moved){const r=e.currentTarget.getBoundingClientRect();selectSite(view.locate(e.clientX-r.left,e.clientY-r.top));}
  drag=null;
});
$('lattice').addEventListener('pointercancel',()=>{drag=null;});
$('lattice').addEventListener('keydown',e=>{
  const keys={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:model.lattice==='square'?3:4};
  if(keys[e.key]===undefined)return;e.preventDefault();selectSite(model.neighbors[selected][keys[e.key]]);if(view.targetZoom>1)view.focus(selected);
});
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY','A'].includes(e.target.tagName)){e.preventDefault();setRunning(!running);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setRunning(false);});
new ResizeObserver(()=>{dirty=true;uiDirty=true;}).observe($('laboratory'));
new IntersectionObserver(entries=>{latticeVisible=entries[0].isIntersecting;if(latticeVisible)dirty=true;}).observe($('lattice'));
new IntersectionObserver(entries=>{analysisVisible=entries[0].isIntersecting;if(analysisVisible)uiDirty=true;}).observe(document.querySelector('.understand'));
function frame(now){
  const dt=Math.min(100,Math.max(0,now-lastFrame))/1000;lastFrame=now;
  if(view.replay&&now-view.replay.time>=view.replay.duration)finishReplay();
  if(running&&!warming){
    const pace=$('speed').value,before=position(),deadline=performance.now()+6;
    pending=Math.min(model.n*6,pending+model.n*({slow:6,normal:45,fast:240}[pace])*dt);
    while(pending>=1&&performance.now()<deadline){
      const batch=Math.min(8192,Math.floor(pending));model.sweep(batch/model.n);pending-=batch;
    }
    if(position()!==before){dirty=true;uiDirty=true;}
    if(now-lastUI>150&&position()!==history[history.length-1]?.x){record();}
  }
  if(dirty&&latticeVisible){dirty=view.draw(selected,null,now,reduced);}
  if(uiDirty&&now-lastUI>150){refreshAll();lastUI=now;}

  requestAnimationFrame(frame);
}
model=new IsingModel(64,SpinPhysics.criticalTemperatureFor($('latticeType').value),42,'random',0,$('latticeType').value);view.setModel(model);selected=2080;record();controls();refreshAll();
requestAnimationFrame(frame);preset('critical');
})();
