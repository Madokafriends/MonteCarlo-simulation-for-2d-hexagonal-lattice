(function(root){
'use strict';
const C={up:'#68d6dc',down:'#edaa77',gold:'#e5ca84',text:'#dbe6ef',muted:'#8da3b8',line:'#293949',bg:'#0c141f'};
function fit(canvas){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),ctx=canvas.getContext('2d');
  if(!r.width||!r.height)return null;
  const w=Math.round(r.width*d),h=Math.round(r.height*d);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  return {ctx,w:r.width,h:r.height};
}
function label(ctx,text,x,y,color=C.muted,align='left',size=10){
  ctx.fillStyle=color;ctx.font=size+'px Cambria, Georgia, serif';ctx.textAlign=align;ctx.fillText(text,x,y);
}
function chart(canvas,{xmin=0,xmax=8,ymin=0,ymax=1,xticks=[0,2,4,6,8],yticks=[0,.5,1],xlabel='T',ylabel='',right=18}={}){
  const f=fit(canvas);if(!f)return null;
  const {ctx,w,h}=f,l=40,r=w-right,t=26,b=h-30;
  const x=v=>l+(v-xmin)/(xmax-xmin)*(r-l),y=v=>b-(v-ymin)/(ymax-ymin)*(b-t);
  ctx.lineWidth=.7;
  for(const v of yticks){ctx.strokeStyle=C.line;ctx.beginPath();ctx.moveTo(l,y(v));ctx.lineTo(r,y(v));ctx.stroke();label(ctx,String(v),l-9,y(v)+3,C.muted,'right');}
  for(const v of xticks)label(ctx,String(v),x(v),b+17,C.muted,'center');
  label(ctx,ylabel,l,12);label(ctx,xlabel,r,h-1,C.muted,'right');
  return {...f,l,r,t,b,x,y};
}
function line(g,points,color,width=1.8,dash=[]){
  const {ctx}=g;ctx.beginPath();ctx.setLineDash(dash);
  points.forEach(([x,y],i)=>i?ctx.lineTo(g.x(x),g.y(y)):ctx.moveTo(g.x(x),g.y(y)));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([]);
}
function dot(g,x,y,color,r=4){g.ctx.beginPath();g.ctx.arc(g.x(x),g.y(y),r,0,2*Math.PI);g.ctx.fillStyle=color;g.ctx.fill();}
function vertical(g,t,color=C.gold){g.ctx.setLineDash([3,4]);g.ctx.strokeStyle=color;g.ctx.lineWidth=1;g.ctx.beginPath();g.ctx.moveTo(g.x(t),g.t);g.ctx.lineTo(g.x(t),g.b);g.ctx.stroke();g.ctx.setLineDash([]);}
function order(canvas,model,{zoom=false,showLive=false}={}){
  const tc=SpinPhysics.criticalTemperatureFor(model.lattice),m0=t=>SpinPhysics.spontaneousMagnetization(t,model.lattice);
  const g=chart(canvas,{xmin:zoom?tc-.1:0,xmax:zoom?tc+.1:8,
    xticks:zoom?[tc-.08,tc,tc+.08].map(t=>+t.toFixed(3)):[0,2,4,6,8],
    ymin:-1.12,ymax:1.12,yticks:[-1,0,1],ylabel:'Spontaneous magnetization ±m₀',xlabel:'Temperature T →'});
  if(!g)return;
  const pts=SpinPaths.orderCurve(model.lattice),{ctx}=g;
  ctx.save();ctx.beginPath();ctx.rect(g.l,g.t,g.r-g.l,g.b-g.t);ctx.clip();
  line(g,pts,C.up,2.2);line(g,pts.map(([t,m])=>[t,-m]),C.down,2.2);
  vertical(g,tc,'#6a7e91');vertical(g,model.temperature,'#b9a7ee');
  if(model.field===0){
    dot(g,model.temperature,m0(model.temperature),C.up,4);
    dot(g,model.temperature,-m0(model.temperature),C.down,4);
  }
  if(showLive)dot(g,model.temperature,model.magnetization/model.n,C.gold,4.5);
  dot(g,tc,0,'#e8eef2',3);ctx.restore();
  label(ctx,'+m₀ · ↑',g.l+12,g.y(zoom?.45:.68),C.up,'left',12);
  label(ctx,'−m₀ · ↓',g.l+12,g.y(zoom?-.45:-.68),C.down,'left',12);
  label(ctx,'Tc',g.x(tc)+7,g.y(0)+19,C.text);
  label(ctx,'m₀ = 0',g.r-4,g.y(0)-12,C.muted,'right',10);
  if(showLive)label(ctx,'Instantaneous m · h = '+model.field.toFixed(2),g.r,12,C.gold,'right',10);
}
function fieldLimits(canvas,t,h){
  const limits=SpinPaths.fieldLimits(t),g=chart(canvas,{xmin:-1,xmax:1,ymin:-1.13,ymax:1.13,xticks:[],yticks:[-1,0,1],ylabel:'One-sided limits of m',xlabel:''});
  if(!g)return;
  const {ctx}=g;
  for(const [sign,value,color] of [[-1,limits.minus,C.down],[1,limits.plus,C.up]]){
    ctx.globalAlpha=h===0||Math.sign(h)===sign?1:.72;
    line(g,[[sign*.82,value],[sign*.18,value]],color,3);
    dot(g,sign*.18,value,C.bg,5);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    label(ctx,(value>0?'+':'')+value.toFixed(3),g.x(sign*.54),g.y(value)-12,color,'center',15);
    ctx.globalAlpha=1;
    label(ctx,sign<0?'h → 0⁻':'h → 0⁺',g.x(sign*.53),g.b+20,color,'center',12);
  }
  if(limits.jump>0){
    line(g,[[0,limits.minus],[0,limits.plus]],C.gold,1.4,[3,4]);
    for(const v of [limits.minus,limits.plus])line(g,[[-.07,v],[.07,v]],C.gold,1.5);
  }
  const y=g.y(0)-8;ctx.fillStyle=C.bg;ctx.fillRect(g.x(0)-43,y-15,86,23);
  label(ctx,'Δm = '+limits.jump.toFixed(3),g.x(0),y+1,C.gold,'center',12);
  label(ctx,'T = '+t.toFixed(3),g.r,12,C.muted,'right');
}
function distribution(canvas,exact){
  const max=Math.max(.12,...exact.distribution)*1.12;
  const g=chart(canvas,{xmin:-1.1,xmax:1.1,ymax:max,xticks:[-1,-.5,0,.5,1],yticks:[0,+(max/2).toFixed(2),+max.toFixed(2)],xlabel:'m',ylabel:'P(m)'});
  if(!g)return;
  const width=(g.x(1)-g.x(-1))/exact.n*.8;
  exact.distribution.forEach((p,i)=>{
    const m=(2*i-exact.n)/exact.n;g.ctx.fillStyle=m<0?C.down:m>0?C.up:'#c6d5df';
    g.ctx.globalAlpha=.88;g.ctx.fillRect(g.x(m)-width/2,g.y(p),width,g.b-g.y(p));
  });g.ctx.globalAlpha=1;
  label(g.ctx,exact.n+' spins · Same T, h',g.r,g.t+10,C.gold,'right');
}
function entropy(canvas,curve,exact){
  const cvMax=Math.max(1.5,Math.ceil(Math.max(...curve.map(p=>p.cv))*2)/2);
  const g=chart(canvas,{ymax:.73,yticks:[0,.35,.693],ylabel:'S / NkB',right:45});if(!g)return;
  line(g,curve.map(p=>[p.t,p.s]),C.up,2);
  line(g,curve.map(p=>[p.t,p.cv/cvMax*.73]),C.gold,1.6);
  for(const c of [0,cvMax/2,cvMax])label(g.ctx,c.toFixed(2),g.r+7,g.y(c/cvMax*.73)+3,C.gold,'left',9);
  label(g.ctx,'C / NkB',g.r+30,12,C.gold,'right',9);
  vertical(g,exact.t);dot(g,exact.t,exact.s,C.up);
}
function phaseMap(canvas,t,h,path='free',fixedT=2.5){
  const tc=SpinPhysics.criticalTemperature,pathColor='#b9a7ee';
  const g=chart(canvas,{xmin:0,xmax:8,ymin:-2,ymax:2,yticks:[-2,0,2],xticks:[0,2,4,6,8],ylabel:'Field h ↑',xlabel:'Temperature T →',right:18});if(!g)return null;
  const {ctx}=g;
  ctx.fillStyle='#68d6dc10';ctx.fillRect(g.l,g.t,g.r-g.l,g.y(0)-g.t);
  ctx.fillStyle='#edaa7710';ctx.fillRect(g.l,g.y(0),g.r-g.l,g.b-g.y(0));
  if(path==='thermal'){
    ctx.globalAlpha=.28;line(g,[[.3,0],[7.5,0]],pathColor,9);ctx.globalAlpha=1;
    line(g,[[tc+.12,0],[7.5,0]],pathColor,1.5,[5,4]);
    line(g,[[7.15,.13],[7.5,0],[7.15,-.13]],pathColor,2);
    label(ctx,'A → h = 0',g.x(5.6),g.y(-.62),pathColor,'center',11);
  }else if(path==='field'){
    ctx.globalAlpha=.25;line(g,[[fixedT,-1.6],[fixedT,1.6]],pathColor,8);ctx.globalAlpha=1;
    line(g,[[fixedT,-1.6],[fixedT,1.6]],pathColor,1.5,[5,4]);
    line(g,[[fixedT-.13,1.32],[fixedT,1.6],[fixedT+.13,1.32]],pathColor,2);
    label(ctx,'B ↑ T = '+fixedT.toFixed(2),g.r-4,g.t+18,pathColor,'right',11);
  }
  line(g,[[0,0],[tc,0]],C.gold,3);dot(g,tc,0,C.gold,5);
  label(ctx,'↑ favoured',g.x(.5),g.y(1.3),C.up);label(ctx,'↓ favoured',g.x(.5),g.y(-1.3),C.down);
  label(ctx,'No jump at h = 0',g.x(5.9),g.y(.4),C.muted,'center',10);
  label(ctx,'Phase coexistence',g.x(1.5),g.y(0)-12,C.gold,'center',10);label(ctx,'Tc',g.x(tc)+8,g.y(0)+18,C.gold);
  dot(g,t,h,'#f4f6f8',5);ctx.strokeStyle=C.bg;ctx.lineWidth=1.5;ctx.stroke();
  return g;
}
function trace(canvas,history,observable='m'){
  const last=history.length?history[history.length-1].x:0,first=history.length?history[0].x:0;
  const end=Math.max(first+1,last);
  let ymin=-1.12,ymax=1.12,yticks=[-1,0,1];
  if(observable==='e'){
    const values=history.map(p=>p.e),lo=Math.min(0,...values),hi=Math.max(0,...values);
    const padding=Math.max(.15,(hi-lo)*.12);
    ymin=Math.floor((lo-padding)*10)/10;ymax=Math.ceil((hi+padding)*10)/10;
    yticks=[ymin,+(ymin/2).toFixed(1),0];
    if(ymax>.5)yticks.push(+(ymax/2).toFixed(1),ymax);
    yticks=[...new Set(yticks)].sort((a,b)=>a-b);
  }
  const g=chart(canvas,{xmin:first,xmax:end,ymin,ymax,yticks,
    xticks:[first,(first+end)/2,end].map(x=>+x.toFixed(1)),
    xlabel:'Monte Carlo sweeps',ylabel:observable==='m'?'m':'E / NJ'});
  if(!g)return;
  line(g,history.map(p=>[p.x,p[observable]]),observable==='m'?C.up:C.down,1.7);
  if(history.length)dot(g,last,history[history.length-1][observable],C.text,3);
}
function arrow(ctx,x,y,spin,scale,color){
  const a=scale*.31,d=-spin;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,scale*.09);
  ctx.beginPath();ctx.moveTo(x,y-d*a);ctx.lineTo(x,y+d*a);
  ctx.moveTo(x-a*.52,y+d*a*.36);ctx.lineTo(x,y+d*a);ctx.lineTo(x+a*.52,y+d*a*.36);ctx.stroke();
}
// Sphere, axial moment and equatorial ring: a schematic binary moment,
// not a trajectory of an electron or a physical rotation between Ising states.
function spinGlyph(ctx,x,y,scale,before,after=before,progress=0){
  const pose=SpinPresentation.spinPose(before,after,progress);
  const up=[104,214,220],down=[237,170,119],a=before>0?up:down,b=after>0?up:down;
  const rgb=a.map((v,i)=>Math.round(v+(b[i]-v)*pose.mix));
  const color='rgb('+rgb.join(',')+')',dark='rgb('+rgb.map(v=>Math.round(v*.32)).join(',')+')';
  ctx.save();ctx.translate(x,y-pose.lift*scale);ctx.scale(scale,scale);
  ctx.fillStyle='#00000038';ctx.beginPath();ctx.ellipse(.035,.29+pose.lift,.24,.06,0,0,2*Math.PI);ctx.fill();
  ctx.save();ctx.rotate(pose.angle);
  ctx.lineWidth=.024;ctx.strokeStyle=dark;
  ctx.beginPath();ctx.moveTo(0,-.4);ctx.lineTo(0,.38);ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,0,.36,.12,-.18,Math.PI,Math.PI*2);ctx.strokeStyle=color;ctx.globalAlpha=.45;ctx.stroke();
  ctx.restore();
  const light=ctx.createRadialGradient(-.08,-.09,.015,0,0,.25);
  light.addColorStop(0,'#edfaff');light.addColorStop(.28,color);light.addColorStop(.72,color);light.addColorStop(1,dark);
  ctx.beginPath();ctx.arc(0,0,.235,0,2*Math.PI);ctx.fillStyle=light;ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=.009;ctx.stroke();
  ctx.save();ctx.rotate(pose.angle);
  ctx.beginPath();ctx.ellipse(0,0,.36,.12,-.18,0,Math.PI);ctx.strokeStyle='#eaf6f4c4';ctx.lineWidth=.018;ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-.18);ctx.lineTo(0,-.39);ctx.strokeStyle='#dff5f4';ctx.lineWidth=.025;ctx.stroke();
  const cone=ctx.createLinearGradient(-.05,0,.05,0);cone.addColorStop(0,color);cone.addColorStop(.45,'#f4ffff');cone.addColorStop(1,color);
  ctx.beginPath();ctx.moveTo(0,-.48);ctx.lineTo(-.055,-.35);ctx.lineTo(.055,-.35);ctx.closePath();ctx.fillStyle=cone;ctx.fill();
  ctx.restore();ctx.restore();
}
function neighbors(canvas,model,selected){
  const f=fit(canvas);if(!f)return;
  const {ctx,w,h}=f,cx=w/2,cy=h/2+3,spacing=Math.min(w*.26,h*.29),radius=Math.min(24,spacing*.24);
  const row=Math.floor(selected/model.size),col=selected%model.size;
  const spec=SpinPhysics.latticeSpec(model.lattice);
  const center={x:cx,y:cy,k:selected};
  const pts=[center];
  for(const k of model.neighbors[selected]){
    const r=Math.floor(k/model.size),c=k%model.size;
    let dr=r-row,dc=c-col;
    if(dr>model.size/2)dr-=model.size;if(dr<-model.size/2)dr+=model.size;
    if(dc>model.size/2)dc-=model.size;if(dc<-model.size/2)dc+=model.size;
    pts.push({x:cx+(dc+spec.rowOffset*((r%2)-(row%2)))*spacing,y:cy+dr*spec.rowSpacing*spacing,k});
  }
  for(const p of pts.slice(1)){
    const aligned=model.spins[p.k]===model.spins[selected];
    ctx.strokeStyle=aligned?'#4b8f99':'#b38365';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();
    const x=(cx+p.x)/2,y=(cy+p.y)/2;ctx.fillStyle=C.bg;ctx.fillRect(x-14,y-10,28,18);
    label(ctx,aligned?'−J':'+J',x,y+3,aligned?C.up:C.down,'center',11);
  }
  for(const p of pts){
    const s=model.spins[p.k];ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=s>0?C.up:C.down;ctx.fill();arrow(ctx,p.x,p.y,s,radius*1.7,C.bg);
    if(p.k===selected){ctx.beginPath();ctx.arc(p.x,p.y,radius+5,0,2*Math.PI);ctx.strokeStyle=C.gold;ctx.lineWidth=1;ctx.stroke();}
  }
  label(ctx,'sᵢ',cx,cy+radius+24,C.gold,'center',13);
  label(ctx,'Aligned: −J     Antialigned: +J',w/2,h-8,C.muted,'center',10);
}
class LatticeView{
  constructor(canvas){
    this.canvas=canvas;this.zoom=1;this.targetZoom=1;this.mode='domains';
    this.focusX=0;this.focusY=0;this.layout=null;this.raster=document.createElement('canvas');this.rctx=this.raster.getContext('2d');
    this.replay=null;this.glyphs={};
    for(const spin of [-1,1]){
      const glyph=document.createElement('canvas');glyph.width=glyph.height=128;
      spinGlyph(glyph.getContext('2d'),64,64,120,spin);this.glyphs[spin]=glyph;
    }
  }
  setModel(model){
    this.replay=null;
    this.model=model;
    const spec=SpinPhysics.latticeSpec(model.lattice);
    this.rowOffset=spec.rowOffset;this.rowSpacing=spec.rowSpacing;this.yOffset=spec.yOffset;
    this.widthUnits=model.size+this.rowOffset;this.heightUnits=(model.size-1)*this.rowSpacing+2*this.yOffset;
    this.focusX=this.widthUnits/2;this.focusY=this.heightUnits/2;
    const L=model.size,unit=L<=64?4:2;
    this.unit=unit;this.raster.width=Math.ceil(this.widthUnits*unit);this.raster.height=Math.ceil(this.heightUnits*unit);
    this.image=this.rctx.createImageData(this.raster.width,this.raster.height);
    this.pixels=new Uint32Array(this.image.data.buffer);this.map=new Int32Array(this.pixels.length);this.map.fill(-1);
    for(let py=0;py<this.raster.height;py++)for(let px=0;px<this.raster.width;px++){
      if(model.lattice==='square'){
        this.map[py*this.raster.width+px]=Math.floor(py/unit)*L+Math.floor(px/unit);continue;
      }
      const x=(px+.5)/unit-.5,y=(py+.5)/unit-this.yOffset,r0=Math.round(y/this.rowSpacing);
      let best=Infinity,index=-1;
      for(let r=r0-1;r<=r0+1;r++){
        if(r<0||r>=L)continue;
        const c=Math.round(x-this.rowOffset*(r%2));if(c<0||c>=L)continue;
        const d=(x-c-this.rowOffset*(r%2))**2+(y-r*this.rowSpacing)**2;
        if(d<best&&d<.34){best=d;index=r*L+c;}
      }
      this.map[py*this.raster.width+px]=index;
    }
    // Palette is written in platform byte order through one shared typed-array view.
    const pack=(r,g,b)=>{const a=new Uint8Array([r,g,b,255]);return new Uint32Array(a.buffer)[0];};
    this.palette={up:pack(104,214,220),down:pack(237,170,119),bg:pack(12,20,31),wall:pack(229,202,132),dim:pack(25,40,53),flash:pack(251,235,176)};
  }
  locate(x,y){
    if(!this.layout)return 0;
    const {ox,oy,spacing}=this.layout,L=this.model.size;
    const wx=(x-ox)/spacing-.5,wy=(y-oy)/spacing-this.yOffset,r0=Math.max(0,Math.min(L-1,Math.round(wy/this.rowSpacing)));
    let best=Infinity,k=0;
    for(let r=Math.max(0,r0-1);r<=Math.min(L-1,r0+1);r++){
      const c=Math.max(0,Math.min(L-1,Math.round(wx-this.rowOffset*(r%2))));
      const d=(wx-c-this.rowOffset*(r%2))**2+(wy-r*this.rowSpacing)**2;
      if(d<best){best=d;k=r*L+c;}
    }return k;
  }
  siteX(r,c){return c+this.rowOffset*(r%2)+.5;}
  siteY(r){return r*this.rowSpacing+this.yOffset;}
  focus(k){const L=this.model.size,r=Math.floor(k/L);this.focusX=this.siteX(r,k%L);this.focusY=this.siteY(r);}
  startReplay(before,time,selected=0,duration=1800){
    if(!before.some((spin,k)=>spin!==this.model.spins[k]))return false;
    // Snap a pending zoom before capturing the visible horizontal extent.
    this.zoom=this.targetZoom;this.draw(selected,null,time,true);
    const {ox,spacing}=this.layout,width=this.canvas.getBoundingClientRect().width;
    this.replay={before,after:this.model.spins.slice(),time,duration,
      left:Math.max(.5,-ox/spacing),right:Math.min(this.model.size,(width-ox)/spacing)};
    return true;
  }
  drawSpins(ctx,geometry,spins,now,reduced){
    const {ox,oy,spacing,rmin,rmax,cmin,cmax,w,h}=geometry,m=this.model,L=m.size;
    const replay=!reduced?this.replay:null,elapsed=replay?now-replay.time:0;
    if(spacing<8){
      // At overview scale the glyph detail is subpixel; batch compact moments.
      for(const sign of [-1,1]){
        ctx.beginPath();
        for(let r=rmin;r<=rmax;r++)for(let c=cmin;c<=cmax;c++){
          const k=r*L+c,column=this.siteX(r,c);
          const p=replay?SpinPresentation.revealProgress((column-replay.left)/Math.max(1,replay.right-replay.left),elapsed,replay.duration):1;
          const spin=replay?(p<.5?replay.before[k]:replay.after[k]):spins[k];
          if(spin!==sign)continue;
          const x=ox+column*spacing,y=oy+(this.siteY(r))*spacing;
          ctx.moveTo(x+spacing*.3,y);ctx.arc(x,y,spacing*.3,0,Math.PI*2);
        }
        ctx.fillStyle=sign>0?C.up:C.down;ctx.fill();
      }
      return;
    }
    ctx.beginPath();
    for(let r=rmin;r<=rmax;r++)for(let c=cmin;c<=cmax;c++){
      const k=r*L+c,x=ox+(this.siteX(r,c))*spacing,y=oy+(this.siteY(r))*spacing;
      for(const j of m.neighbors[k]){
        if(j<=k)continue;
        const rr=Math.floor(j/L),xx=ox+(this.siteX(rr,j%L))*spacing,yy=oy+(this.siteY(rr))*spacing;
        if(Math.hypot(xx-x,yy-y)>spacing*1.1)continue;
        ctx.moveTo(x,y);ctx.lineTo(xx,yy);
      }
    }
    ctx.strokeStyle='#20394a';ctx.lineWidth=.7;ctx.stroke();
    if(replay){
      const front=(elapsed/replay.duration-.14)/.72;
      const x=ox+(replay.left+front*(replay.right-replay.left))*spacing;
      const band=Math.max(20,w*.07),wash=ctx.createLinearGradient(x-band,0,x+band,0);
      wash.addColorStop(0,'#e5ca8400');wash.addColorStop(.5,'#e5ca8414');wash.addColorStop(1,'#e5ca8400');
      ctx.fillStyle=wash;ctx.fillRect(x-band,0,band*2,h);
    }
    ctx.imageSmoothingEnabled=true;
    for(let r=rmin;r<=rmax;r++)for(let c=cmin;c<=cmax;c++){
      const k=r*L+c,column=this.siteX(r,c),x=ox+column*spacing,y=oy+(this.siteY(r))*spacing;
      const before=replay?replay.before[k]:spins[k],after=replay?replay.after[k]:spins[k];
      const p=replay?SpinPresentation.revealProgress((column-replay.left)/Math.max(1,replay.right-replay.left),elapsed,replay.duration):1;
      if(before!==after&&p>0&&p<1){spinGlyph(ctx,x,y,spacing,before,after,p);}
      else{
        const s=p<1?before:after;
        // Cached shaded glyphs keep large lattices responsive during continuous updates.
        const d=spacing*128/120;ctx.drawImage(this.glyphs[s],x-d/2,y-d/2,d,d);
      }
    }
  }
  draw(selected,flash=null,now=0,reduced=false){
    const f=fit(this.canvas);if(!f||!this.model)return false;
    const {ctx,w,h}=f,L=this.model.size,m=this.model,animated=Math.abs(this.targetZoom-this.zoom)>.005;
    this.zoom=reduced?this.targetZoom:this.zoom+(this.targetZoom-this.zoom)*.2;
    if(!animated)this.zoom=this.targetZoom;
    const base=Math.min((w-36)/this.widthUnits,(h-58)/this.heightUnits);
    const spacing=base*this.zoom;
    const totalW=this.widthUnits*spacing,totalH=this.heightUnits*spacing;
    let ox=w/2-this.focusX*spacing,oy=h/2-this.focusY*spacing;
    if(totalW<w)ox=(w-totalW)/2;else ox=Math.max(w-totalW,Math.min(0,ox));
    if(totalH<h-32)oy=(h-totalH)/2+5;else oy=Math.max(h-totalH,Math.min(0,oy));
    this.layout={ox,oy,spacing};
    const age=flash?(now-flash.time):Infinity,highlight=flash&&age<1300;
    const spins=highlight&&age<350&&!reduced?flash.before:m.spins;
    const map=this.map,pix=this.pixels,P=this.palette,rw=this.raster.width;
    const rmin=Math.max(0,Math.floor((-oy/spacing-this.yOffset)/this.rowSpacing)-1),rmax=Math.min(L-1,Math.ceil(((h-oy)/spacing-this.yOffset)/this.rowSpacing)+1);
    const cmin=Math.max(0,Math.floor(-ox/spacing)-2),cmax=Math.min(L-1,Math.ceil((w-ox)/spacing));
    if(this.mode==='spins'){
      this.drawSpins(ctx,{ox,oy,spacing,rmin,rmax,cmin,cmax,w,h},spins,now,reduced);
    }else if(spacing>=10){
      if(this.mode==='walls'){
        ctx.beginPath();
        for(let r=rmin;r<=rmax;r++)for(let c=cmin;c<=cmax;c++){
          const k=r*L+c,x=ox+(this.siteX(r,c))*spacing,y=oy+(this.siteY(r))*spacing;
          for(const j of m.neighbors[k]){
            if(j<=k||spins[j]===spins[k])continue;
            const rr=Math.floor(j/L),xx=ox+(this.siteX(rr,j%L))*spacing,yy=oy+(this.siteY(rr))*spacing;
            const dx=xx-x,dy=yy-y;if(Math.hypot(dx,dy)>spacing*1.1)continue;
            const half=m.lattice==='square'?.5:1/(2*Math.sqrt(3));
            const mx=(x+xx)/2,my=(y+yy)/2,nx=-dy*half,ny=dx*half;
            ctx.moveTo(mx-nx,my-ny);ctx.lineTo(mx+nx,my+ny);
          }
        }
        ctx.strokeStyle=C.gold;ctx.lineWidth=Math.max(1.2,spacing*.035);ctx.stroke();
      }else{
      // Vector Voronoi cells are hexagons for hexagonal Bravais and squares for square lattices.
      // Batch paths by color instead of repainting every pixel of the full lattice.
      for(const group of [-1,1,2]){
        ctx.beginPath();
        for(let r=rmin;r<=rmax;r++)for(let c=cmin;c<=cmax;c++){
          const k=r*L+c,value=highlight&&age<950&&flash.mask[k]?2:spins[k];if(value!==group)continue;
          const x=ox+(this.siteX(r,c))*spacing,y=oy+(this.siteY(r))*spacing;
          const half=spacing*.505,short=spacing*.291,long=spacing*.582;
          if(m.lattice==='square')ctx.rect(x-half,y-half,2*half,2*half);
          else{
            ctx.moveTo(x,y-long);ctx.lineTo(x+half,y-short);ctx.lineTo(x+half,y+short);
            ctx.lineTo(x,y+long);ctx.lineTo(x-half,y+short);ctx.lineTo(x-half,y-short);ctx.closePath();
          }
        }
        ctx.fillStyle=group===2?'#fbebb0':group>0?C.up:C.down;ctx.fill();
      }
      }
    }else{
    for(let p=0;p<map.length;p++){
      const k=map[p];
      if(k<0){pix[p]=P.bg;continue;}
      if(this.mode==='walls'){
        const right=map[p+1],below=map[p+rw];
        const wall=(right>=0&&spins[k]!==spins[right])||(below>=0&&spins[k]!==spins[below]);
        pix[p]=wall?P.wall:P.dim;
      }else pix[p]=spins[k]>0?P.up:P.down;
      if(highlight&&flash.mask[k]&&age<950)pix[p]=P.flash;
    }
    this.rctx.putImageData(this.image,0,0);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(this.raster,ox,oy,this.raster.width/this.unit*spacing,this.raster.height/this.unit*spacing);
    }
    const sr=Math.floor(selected/L),sx=ox+(this.siteX(sr,selected%L))*spacing,sy=oy+(this.siteY(sr))*spacing;
    if(spacing>14&&this.mode!=='spins'){
      for(const k of m.neighbors[selected]){
        const rr=Math.floor(k/L),xx=ox+(this.siteX(rr,k%L))*spacing,yy=oy+(this.siteY(rr))*spacing;
        if(Math.hypot(xx-sx,yy-sy)<spacing*1.1){ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(xx,yy);ctx.strokeStyle='#0c141fa0';ctx.lineWidth=1.4;ctx.stroke();}
      }
    }
    ctx.beginPath();ctx.arc(sx,sy,Math.max(4,spacing*.54),0,2*Math.PI);ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6;ctx.stroke();
    return animated||(highlight&&age<1300)||!!this.replay;
  }
}
root.SpinPlots={C,fit,order,fieldLimits,distribution,entropy,phaseMap,trace,neighbors,LatticeView};
})(typeof globalThis!=='undefined'?globalThis:this);
