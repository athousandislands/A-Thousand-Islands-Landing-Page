import { CAROUSEL_SETTINGS } from './carousel-settings.js';
export const CAROUSEL_DEFAULTS = { scale:1, depth:.04, travelArc:0, motionPull:.008, reach:1, rise:0, imageScale:1, glass:1, rim:.38, fold:1, stretch:.28, curve:2, fade:.004, dispersion:0, aspect:1.5, width:.34, gap:28, height:1, spring:8, seconds:2, drag:1, wheel:1, background:'#f5f6f7' };
export function carouselDefaults(device='desktop') {
 const {pillSize,carouselScale,stageHeight,...settings}=CAROUSEL_SETTINGS[device]||CAROUSEL_SETTINGS.desktop;
 return {...CAROUSEL_DEFAULTS,...settings,width:pillSize/100,scale:carouselScale,height:stageHeight};
}
export const wrap = (index, count) => ((index % count) + count) % count;
export function neighbors(position,count) {const centre=Math.round(position);return [-1,0,1].map(offset=>wrap(centre+offset,count));}
export function carouselMetrics(viewport,config) {
 const cardW=viewport*config.width*config.scale,cardH=cardW/config.aspect;
 const base=viewport<=640?Math.min(420,Math.max(230,viewport*.62)):Math.min(460,Math.max(280,viewport*.32));
 const halfExtent=cardH*(1+config.depth)*(1+config.stretch*config.glass)/2+cardH*(Math.abs(config.rise)*config.glass+Math.abs(config.travelArc));
 return {cardW,cardH,step:cardW*(1+config.depth*.5)+config.gap*config.scale,height:Math.max(base*config.height*config.scale,(halfExtent+12)/.465)};
}
// Exact critically damped solution; stable under changing refresh rates.
export function springStep(position, velocity, target, seconds, frequency) {
 const offset=position-target,decay=Math.exp(-frequency*seconds),term=(velocity+frequency*offset)*seconds;
 return [target+(offset+term)*decay,(velocity-frequency*term)*decay];
}

// Defer ownership until direction is clear. Ambiguous diagonal gestures belong
// to native page scrolling; horizontal ownership remains locked once acquired.
export function gestureAxis(dx,dy){
 if(Math.hypot(dx,dy)<8)return 'pending';
 return Math.abs(dx)>Math.abs(dy)*1.25?'horizontal':'vertical';
}
// Mirror the rendered capsule geometry, including refraction and travel arc.
// Later shader slots paint on top, so hit-test those first.
export function hitCarouselCard(x,y,{w,h,cardW,cardH,step,current,velocity=0,config:c,reduced=false,fallback=false}){
 const px=x-w/2,py=h/2-y,glass=reduced?0:c.glass;
 if(fallback){const q=Math.max(Math.abs(px)-(cardW-cardH)/2,0);return q*q+py*py<=(cardH/2)**2?Math.round(current):null;}
 const t=Math.max(0,Math.min(1,(Math.abs(px)/(w*.5)-(1-c.rim))/Math.max(.05,c.rim)));
 const shape=(1-Math.exp(-3*t**c.curve))/(1-Math.exp(-3));
 const reach=Math.max(.4,1+(c.reach-1)*shape*glass);
 for(let slot=3;slot>=-3;slot--){
  const item=Math.round(current)+slot,d=Math.min(1,Math.abs((item-current)*step)/(w*.5)),path=d*d*(3-2*d);
  const plane=1+(reduced?0:c.depth)*path;
  const cy=h*.035+c.rise*cardH*shape*glass+(reduced?0:c.travelArc)*cardH*path;
  const maxStretch=Math.max(1,(h-2*Math.abs(cy)-20)/(cardH*plane));
  const stretch=1+Math.min(c.stretch*glass,maxStretch-1)*shape;
  const localX=(px-(item-current)*step)/(reach*plane*(1+Math.min(.08,reduced?0:Math.abs(velocity)*c.motionPull)));
  const localY=(py-cy)/(stretch*plane),q=Math.max(Math.abs(localX)-(cardW-cardH)/2,0);
  if(q*q+localY*localY<=(cardH/2)**2)return item;
 }
 return null;
}
