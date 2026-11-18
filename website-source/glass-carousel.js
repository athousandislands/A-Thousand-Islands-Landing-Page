import { createCarouselCaption } from './carousel-caption.js';
import { CAROUSEL_PROJECTS } from './carousel-projects.js';
import { carouselDefaults, carouselMetrics, gestureAxis, hitCarouselCard, neighbors, springStep, wrap } from './glass-carousel-model.js';
import { deviceProfile, isPhoneLayout, watchDeviceProfile } from './device-profile.js';

const vertex=`#version 300 es
in vec2 aPosition;
out vec2 uv;
void main(){uv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform vec2 uSize;
uniform float uPosition,uWidth,uHeight,uStep,uGlass,uRim,uFold,uStretch,uCurve,uFade,uDispersion,uReach,uImageScale,uRise,uDepth,uTravelArc,uVelocity,uMotionPull;
uniform int uCount;
uniform vec3 uColors[16];
uniform float uImages[16];
uniform vec4 uArtwork[16];
uniform float uAspect;
uniform float uPillImages[16];
uniform sampler2D uAtlas;
float pill(vec2 p,vec2 halfSize){vec2 q=abs(p)-vec2(halfSize.x-halfSize.y,0.);return length(max(q,0.))+min(max(q.x,q.y),0.)-halfSize.y;}
void main(){
 vec2 p=(uv-.5)*uSize;
 float side=abs(p.x)/(uSize.x*.5);
 float t=clamp((side-(1.-uRim))/max(.05,uRim),0.,1.);
 float shape=(1.-exp(-3.*pow(t,uCurve)))/(1.-exp(-3.));
 float reach=max(.4,1.+(uReach-1.)*shape*uGlass);
 float centre=floor(uPosition+.5);
 vec4 result=vec4(0.);
 // Card identity comes from its position on the unwarped track. Refraction
 // can fold pixels within a card, but can never select a different project.
 for(int slot=-3;slot<=3;slot++){
  float item=centre+float(slot);
  int index=int(mod(mod(item,float(uCount))+float(uCount),float(uCount)));
  float distanceFromCentre=clamp(abs((item-uPosition)*uStep)/(uSize.x*.5),0.,1.);
  float path=smoothstep(0.,1.,distanceFromCentre);
  float plane=1.+uDepth*path;
  float lift=uRise*uHeight*shape*uGlass+uTravelArc*uHeight*path;
  float centreY=uSize.y*.035+lift;
  float maxStretch=max(1.,(uSize.y-2.*abs(centreY)-20.)/(uHeight*plane));
  float stretch=1.+min(uStretch*uGlass,maxStretch-1.)*shape;
  float velocityScale=1.+min(.08,abs(uVelocity)*uMotionPull);
  vec2 local=vec2((p.x-(item-uPosition)*uStep)/(reach*plane*velocityScale),(p.y-centreY)/(stretch*plane));
  float distance=pill(local,vec2(uWidth,uHeight)*.5);
  float aa=max(fwidth(distance),.8);
  float alpha=(1.-smoothstep(-aa,aa,distance))*(1.-smoothstep(1.-max(.0001,uFade),1.,side));
  if(alpha>.001){
   vec3 color=uColors[index];
   if(uImages[index]>.5){
    float lens=uGlass*pow(t,uCurve),vertical=local.y/uHeight;
    // The image has its own cylindrical lens map, independent of the silhouette.
    // Magnify the middle vertically; turn the outer texture back through glass.
    float x=local.x/(uWidth*uImageScale)+.5+sign(p.x)*lens*uFold*.16;
    float y=.5-(vertical*(1.-min(.75,lens*.55))+sign(vertical)*pow(abs(vertical)*2.,3.)*lens*uFold*.58)/uImageScale;
    vec4 framing=uArtwork[index];
    // Full-bleed photographs cover the capsule with their own pixels. Uniform
    // scaling preserves proportions while the capsule itself supplies the clip.
    if(framing.w>1.5)framing.x=max(framing.x,max(uAspect/1.5,1.)/uImageScale);
    x=.5+((x-.5)*uAspect/1.5-framing.y)/framing.x;
    y=.5+((y-.5)-framing.z)/framing.x;
    if(framing.w>1.5){x=clamp(x,.001,.999);y=clamp(y,.001,.999);}
    vec2 mirrored=vec2(x,y);
    vec2 cardUV=clamp(mirrored,vec2(.001),vec2(.999));
    if(uPillImages[index]>.5){
     // Supplied PNGs have transparent capsule corners. Keep refracted samples
     // inside that source silhouette instead of pulling empty corners into view.
     float dx=max(abs((cardUV.x-.5)*1.5)-.25,0.);
     float span=sqrt(max(.0001,.25-dx*dx));
     cardUV.y=clamp(cardUV.y,.5-span+.008,.5+span-.008);
    }
    vec2 tex=vec2(cardUV.x,(float(index)+cardUV.y)/float(uCount));
    float shift=uDispersion*t*t*uGlass;
    if(x>=0.&&x<=1.&&y>=0.&&y<=1.)color=vec3(texture(uAtlas,tex+vec2(shift,0.)).r,texture(uAtlas,tex).g,texture(uAtlas,tex-vec2(shift,0.)).b);
    if(framing.w>.5&&framing.w<1.5){float edge=min(min(x,1.-x),min(y,1.-y));color=mix(uColors[index],color,smoothstep(0.,.075,edge));}
   }
   result=vec4(color*alpha+result.rgb*(1.-alpha),alpha+result.a*(1.-alpha));
  }
 }
 outColor=result;
}`;
export function initGlassCarousel() {
 const root=document.querySelector('.glass-carousel'); if(!root)return;
 const projects=CAROUSEL_PROJECTS.slice(0,16); if(!projects.length)return;
 const stage=root.querySelector('.carousel-stage'), canvas=stage.querySelector('canvas');
 const labels=root.querySelector('.carousel-labels'), fallback=root.querySelector('.carousel-fallback');
 const live=root.querySelector('[aria-live]');
 const hint=root.querySelector('.carousel-hint');
 let introRemaining=2;
 function engage(){introRemaining=0;root.dataset.engaged='true';}
 root.querySelector('.carousel-list').replaceChildren(...projects.map(project=>{const li=document.createElement('li');li.textContent=project.title;return li;}));
 const selectionHint=()=>deviceProfile()==='desktop'?'Click or swipe to explore':'Touch or swipe to explore';
 hint.textContent=selectionHint();hint.style.opacity='0';
 const hintMotion=createCarouselCaption(hint,{exitDuration:950,exitShift:0});
 const hintFooter=root.querySelector('.carousel-footer');
 const motionMedia=matchMedia('(prefers-reduced-motion:reduce)');
 const reduced={get matches(){return motionMedia.matches||new URLSearchParams(location.search).get('carouselMotion')==='reduce';},addEventListener:(...args)=>motionMedia.addEventListener(...args)};
 root.dataset.motion=reduced.matches?'reduced':'full';
 const carouselProfile=()=>deviceProfile()==='phone'&&!isPhoneLayout()?'desktop':deviceProfile();
 let device=carouselProfile(),config=carouselDefaults(device), current=0,target=0,velocity=0,frame=0,last=0,timer=0;
 let visible=false,focused=false,drag=null,paused=false,active=0,framedArrival=false;
 let w=1,h=1,cardW=1,cardH=1,step=1,gl,program,locations={},atlas;
 const artwork=projects.map(p=>({...p.framing}));
 const colors=new Float32Array(48),imageFlags=new Float32Array(16),pillFlags=new Float32Array(16);
 projects.forEach((project,index)=>pillFlags[index]=project.pillTexture?1:0);
 const label=document.createElement('span');label.className='carousel-label';labels.append(label);
 const caption=createCarouselCaption(label);
 const deviceConfigs=new Map();root.dataset.device=device;
 function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
 function setup(){
  if(new URLSearchParams(location.search).get('carouselFallback')==='1')return;
  try {
   gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'});if(!gl)return;
   program=gl.createProgram();const shaders=[compile(gl.VERTEX_SHADER,vertex),compile(gl.FRAGMENT_SHADER,fragment)];shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);shaders.forEach(s=>gl.deleteShader(s));if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const attribute=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
   for(const name of ['Size','Position','Width','Height','Step','Glass','Rim','Fold','Stretch','Curve','Fade','Dispersion','Reach','ImageScale','Rise','Depth','TravelArc','Velocity','MotionPull','Count','Colors[0]','Images[0]','PillImages[0]','Artwork[0]','Aspect','Atlas'])locations[name]=gl.getUniformLocation(program,'u'+name);
   atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   root.dataset.renderer='webgl2';
  } catch(error){console.warn('Carousel using still fallback:',error.message);gl=null;}
 }
 function updateColors(){projects.forEach((p,i)=>{const hex=p.color.replace('#','');colors.set([0,2,4].map(j=>parseInt(hex.slice(j,j+2),16)/255),i*3);});}
 let imageLoading=false;
 async function loadImages(){
  if(!gl||imageLoading||!projects.some(p=>p.image))return;imageLoading=true;
  const cellH=Math.min(720,Math.floor(gl.getParameter(gl.MAX_TEXTURE_SIZE)/projects.length)),cellW=Math.round(cellH*1.5);
  const sheet=document.createElement('canvas');sheet.width=cellW;sheet.height=cellH*projects.length;const ctx=sheet.getContext('2d');
  if(!ctx){useFallback();return;}
  await Promise.all(projects.map(async(p,i)=>{if(!p.image)return;try{const img=new Image();img.crossOrigin='anonymous';img.src=p.image;await img.decode();const crop=p.crop||{x:0,y:0,width:img.width,height:img.height};const scale=Math.max(cellW/crop.width,cellH/crop.height);ctx.save();ctx.beginPath();ctx.rect(0,i*cellH,cellW,cellH);ctx.clip();ctx.drawImage(img,crop.x,crop.y,crop.width,crop.height,(cellW-crop.width*scale)/2,i*cellH+(cellH-crop.height*scale)/2,crop.width*scale,crop.height*scale);ctx.restore();imageFlags[i]=1;}catch{imageFlags[i]=0;}}));
  if(!gl)return;
  if(projects.some((project,index)=>project.image&&!imageFlags[index])){useFallback();return;}
  try{gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sheet);if(gl.getError()!==gl.NO_ERROR){useFallback();return;}root.dataset.loadedImages=String(imageFlags.reduce((sum,value)=>sum+value,0));render();}catch{useFallback();}
 }
 function layout(){
  if(!gl)return;
  w=stage.clientWidth;
  const measure=device==='phone'?Math.min(w,innerHeight):w;
  const metrics=carouselMetrics(measure,config);cardW=metrics.cardW;cardH=metrics.cardH;step=metrics.step;
  const size=`${metrics.height}px`;if(stage.style.height!==size)stage.style.height=size;
  h=stage.clientHeight;
  const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
  gl.viewport(0,0,canvas.width,canvas.height);render();
 }
 function announce(){const index=wrap(Math.round(current),projects.length);if(index!==active){active=index;live.textContent=`${projects[index].title}, ${index+1} of ${projects.length}`;}root.dataset.active=String(index);}
 function render(){
  if(!gl)return;
  announce();
  const settled=!drag&&Math.abs(current-target)<.001&&Math.abs(velocity)<.01;
  hintMotion.update(selectionHint(),{ready:introRemaining===0&&settled&&root.dataset.engaged!=='true',visible:visible&&!document.hidden,reduced:reduced.matches});
  const promptTop=h*.465+cardH*.5+Math.min(16,h*.035)+38;
  hintFooter.style.top=`${promptTop}px`;
  // Compact stages can end before the prompt. Reserve its real height so the
  // following Contact material never paints over it on phones or tablets.
  root.style.paddingBottom=`${Math.max(0,promptTop+36-h)}px`;
  label.style.top=`${h*.465+cardH*.5+Math.min(16,h*.035)}px`;
  caption.update(projects[active].title,{
   ready:reduced.matches||!gl||(!drag&&Math.abs(current-Math.round(current))<.12&&Math.abs(velocity)<.8),
   visible:visible&&!document.hidden,reduced:reduced.matches,
  });
  gl.useProgram(program);gl.uniform1f(locations.Aspect,config.aspect);gl.uniform4fv(locations['Artwork[0]'],new Float32Array(artwork.flatMap((a,i)=>[a.size,a.x/100,a.y/100,projects[i].fullBleed?2:projects[i].edgeBlend?1:0])));gl.uniform2f(locations.Size,w,h);gl.uniform1f(locations.Position,current);gl.uniform1f(locations.Velocity,reduced.matches?0:velocity);gl.uniform1f(locations.Width,cardW);gl.uniform1f(locations.Height,cardH);gl.uniform1f(locations.Step,step);gl.uniform1f(locations.Glass,reduced.matches?0:config.glass);gl.uniform1f(locations.Rim,config.rim);for(const name of ['fold','stretch','curve','fade','dispersion','reach','imageScale','rise','depth','travelArc','motionPull'])gl.uniform1f(locations[name[0].toUpperCase()+name.slice(1)],reduced.matches&&['depth','travelArc','motionPull'].includes(name)?0:config[name]);gl.uniform1i(locations.Count,projects.length);gl.uniform3fv(locations['Colors[0]'],colors);gl.uniform1fv(locations['Images[0]'],imageFlags);gl.uniform1fv(locations['PillImages[0]'],pillFlags);gl.uniform1i(locations.Atlas,0);gl.drawArrays(gl.TRIANGLES,0,6);
  root.dataset.position=current.toFixed(3);root.dataset.neighbors=neighbors(current,projects.length).join(',');root.dataset.pillWidth=cardW.toFixed(1);
 }
 function runnable(){return gl&&visible&&!document.hidden&&!drag;}
 function animate(now){frame=0;if(!runnable())return;const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;[current,velocity]=springStep(current,velocity,target,dt,config.spring);if(Math.abs(current-target)<.0001&&Math.abs(velocity)<.001){current=target;velocity=0;last=0;render();return;}render();request();}
 function request(){if(!frame&&runnable()){frame=requestAnimationFrame(animate);}}
 function halt(){cancelAnimationFrame(frame);frame=0;last=0;}
 function useFallback(){
  const hadFocus=stage.contains(document.activeElement);
  halt();clearTimeout(timer);clearTimeout(wheelTimer);
  gl=null;visible=false;drag=null;
  root.style.removeProperty('padding-bottom');
  root.dataset.renderer='fallback';
  if(hadFocus)fallback.querySelectorAll('a')[active]?.focus({preventScroll:true});
 }
 function schedule(delay=config.seconds*1000){
  clearTimeout(timer);
  if(!visible||document.hidden||paused||drag||focused)return;
  if(reduced.matches||!gl){introRemaining=0;render();return;}
  if(introRemaining<=0)return;
  timer=setTimeout(()=>{
   if(introRemaining<=0)return;
   introRemaining--;root.dataset.introMoves=String(2-introRemaining);
   live.setAttribute('aria-live','off');target=Math.round(target)+1;request();schedule();
  },delay);
 }
 function navigate(amount){engage();manual();target=Math.round(target)+amount;if(reduced.matches||!gl){current=target;velocity=0;render();}else request();schedule(3000);}
 function manual(){live.setAttribute('aria-live','polite');clearTimeout(timer);clearTimeout(wheelTimer);}
 let wheelTimer;
 function cardAt(event){const rect=stage.getBoundingClientRect();return hitCarouselCard(event.clientX-rect.left,event.clientY-rect.top,{w,h,cardW,cardH,step,current,velocity,config,reduced:reduced.matches,fallback:!gl});}
 function dispatchSelection(index) {
  root.dispatchEvent(new CustomEvent('carousel:select', {
   bubbles: true,
   detail: { index, project: projects[index] },
  }));
 }
 function select(item) {
  if (item === null) return;
  engage();
  manual();
  target = item;
  velocity = 0;
  const index = wrap(item, projects.length);
  root.dataset.selected = String(index);
  live.textContent = `${projects[index].title} selected`;

  if (reduced.matches || !gl || Math.abs(current - target) < .001) {
   current = target;
   render();
  } else request();
  // Start navigation on activation. The card can move during the page fade.
  dispatchSelection(index);
 }
 function beginDrag(event){
  focused=false;manual();halt();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:current,axis:'pending',item:cardAt(event)};
 }
 function moveDrag(event, touchEvent){
  if(drag&&drag.id===event.pointerId){
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(drag.axis==='pending')drag.axis=gestureAxis(dx,dy);
   if(drag.axis==='vertical'){finish(event,true);return;}
   if(drag.axis!=='horizontal')return;
   if(touchEvent){
    if(!touchEvent.cancelable){finish(event,true);return;}
    touchEvent.preventDefault();
   }else if(!stage.hasPointerCapture(event.pointerId))stage.setPointerCapture(event.pointerId);
   stage.dataset.dragging='true';engage();
   current=drag.start-dx/step*config.drag;target=current;velocity=0;render();return;
  }
 }
 const usesTouchEvents=()=>Boolean(window.TouchEvent && window.navigator?.maxTouchPoints);
 stage.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||(event.pointerType==='touch'&&usesTouchEvents()))return;
  beginDrag(event);
 });
 stage.addEventListener('pointermove',event=>moveDrag(event));
 // Claim only horizontal touch gestures. Vertical scrolling and pinch zoom
 // remain native even in browsers that cancel the pointer stream early.
 const touchPoint=point=>({pointerId:'touch',clientX:point.clientX,clientY:point.clientY});
 stage.addEventListener('touchstart',event=>{
  if(!usesTouchEvents())return;
  if(event.touches.length===1)beginDrag(touchPoint(event.touches[0]));
  else if(drag?.id==='touch')finish({pointerId:'touch'},true);
 },{passive:true});
 stage.addEventListener('touchmove',event=>{
  if(event.touches.length===1)moveDrag(touchPoint(event.touches[0]),event);
  else if(drag?.id==='touch')finish({pointerId:'touch'},true);
 },{passive:false});
 stage.addEventListener('touchend',event=>finish(touchPoint(event.changedTouches[0])),{passive:true});
 stage.addEventListener('touchcancel',()=>finish({pointerId:'touch'},true),{passive:true});
 function finish(event,cancelled=false){
  if(!drag||event.pointerId!==drag.id)return;
  const gesture=drag;drag=null;stage.dataset.dragging='false';
  if(gesture.id!=='touch'&&stage.hasPointerCapture(gesture.id))stage.releasePointerCapture(gesture.id);
  const tap=!cancelled&&gesture.axis==='pending'&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<8;
  if(tap&&gesture.item!==null){select(gesture.item);return;}
  target=Math.round(cancelled?gesture.start:current);
  const dx=event.clientX-gesture.x;
  if(!cancelled&&gesture.axis==='horizontal'&&Math.abs(dx)>=24&&target===Math.round(gesture.start)){
   target-=Math.sign(dx);
  }
  if(reduced.matches||!gl){current=target;render();}else request();schedule(3000);
 }
 window.addEventListener('pointerup',event=>finish(event));
 stage.addEventListener('pointercancel',event=>finish(event,true));
 stage.addEventListener('lostpointercapture',event=>finish(event,true));
 stage.addEventListener('wheel',event=>{if(event.ctrlKey)return;if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)&&!event.shiftKey)return;event.preventDefault();event.stopPropagation();engage();manual();target+=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*.003*config.wheel;if(!reduced.matches&&gl)request();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{target=Math.round(target);if(reduced.matches||!gl){current=target;render();}else request();schedule(3000);},140);},{passive:false});
 stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End',' ','Enter'].includes(event.key))return;event.preventDefault();focused=true;if(event.key==='Enter')select(Math.round(current));else if(event.key===' ')togglePlayback();else if(event.key==='Home'||event.key==='End'){target=0;navigate(event.key==='End'?projects.length-1:0);}else navigate(event.key==='ArrowRight'?1:-1);});
 root.addEventListener('focusin',()=>{focused=stage.matches(':focus-visible');if(focused)clearTimeout(timer);});root.addEventListener('focusout',event=>{if(root.contains(event.relatedTarget))return;focused=false;schedule(3000);});
 function togglePlayback(){paused=!paused;if(!paused)focused=false;root.dataset.paused=String(paused);if(paused){target=current;velocity=0;halt();}live.setAttribute('aria-live','polite');live.textContent=paused?'Automatic playback paused':'Automatic playback resumed';schedule(3000);}
 canvas.addEventListener('webglcontextlost',useFallback);
 setup();
 if(!gl){useFallback();return;}
 updateColors();layout();
 new ResizeObserver(layout).observe(stage);
 const artworkObserver=new IntersectionObserver(entries=>{
  if(!entries[0].isIntersecting)return;
  artworkObserver.disconnect();loadImages();
 },{rootMargin:'700px 0px'});
 artworkObserver.observe(stage);
 new IntersectionObserver(entries=>{const before=visible;visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.25;
  if(visible){if(!before){introRemaining=framedArrival?0:2;framedArrival=false;focused=false;current=target=Math.round(current);velocity=0;root.dataset.introMoves='0';}loadImages();render();request();if(!before)schedule(900);}
  else{halt();clearTimeout(timer);caption.hide();hintMotion.hide();}
  root.dataset.visible=String(visible);
 },{threshold:[0,.25]}).observe(stage);
 document.addEventListener('visibilitychange',()=>{halt();clearTimeout(timer);if(document.hidden){caption.hide();}else{render();request();schedule(3000);}});
 reduced.addEventListener('change',()=>{root.dataset.motion=reduced.matches?'reduced':'full';halt();current=target=Math.round(current);velocity=0;render();schedule();});
 const api={
  landOn(title) {
   const index=projects.findIndex(project=>project.title===title);
   if(index<0)return;
   manual();halt();current=target=index;velocity=0;introRemaining=0;framedArrival=!visible;render();
  },
  covers:()=>projects.map((p,i)=>({title:p.title,...artwork[i]})),
  frameCover(index,values){if(!artwork[index])return;for(const key of ['size','x','y'])if(Number.isFinite(values[key]))artwork[index][key]=Math.max(key==='size'?.3:-50,Math.min(key==='size'?1.5:50,values[key]));render();},
  focusCover(index){manual();focused=true;target=Math.round(current)+((index-wrap(Math.round(current),projects.length)+projects.length)%projects.length);if(reduced.matches||!gl){current=target;render();}else request();},
  device:()=>device,
  values:()=>({...config}),
  configure(values){
   // Accept only supported finite numeric controls from saved settings.
   for(const key of Object.keys(config))if(typeof config[key]==='number'&&Number.isFinite(values[key]))config[key]=values[key];
   updateColors();layout();schedule();
  },
  replay(){manual();introRemaining=2;current=target=velocity=0;render();schedule(900);}
 };
 let tuningModule,stopTuning;
 function mountTuning(){stopTuning?.();stopTuning=tuningModule?.mountCarouselTuning(api);}
 function syncProfile(){
  const next=carouselProfile();
  if(next===device)return;
  deviceConfigs.set(device,{...config});device=next;
  config={...(deviceConfigs.get(device)||carouselDefaults(device))};root.dataset.device=device;
  layout();schedule();mountTuning();
 }
 watchDeviceProfile(syncProfile);
 window.addEventListener('resize',syncProfile,{passive:true});
 if(new URLSearchParams(location.search).get('tune')==='covers')import('./cover-tuning.js').then(module=>module.mountCoverTuning(api));
 if(new URLSearchParams(location.search).get('tune')==='carousel')import('./glass-carousel-tuning.js').then(module=>{tuningModule=module;mountTuning();});
 return api;
}
