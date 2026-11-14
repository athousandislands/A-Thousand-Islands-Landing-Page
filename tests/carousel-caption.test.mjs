import test from 'node:test';
import assert from 'node:assert/strict';
import { createCarouselCaption } from '../website-source/carousel-caption.js';
function fixture(t){
 const animations=[];
 const node={style:{},textContent:'',animate(frames,options){
  let resolve;const animation={frames,options,finished:new Promise(r=>resolve=r),cancelled:false,cancel(){this.cancelled=true;},complete:()=>resolve()};
  animations.push(animation);return animation;
 }};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'getComputedStyle');
 Object.defineProperty(globalThis,'getComputedStyle',{value:()=>({opacity:'0.6',transform:'matrix(1,0,0,1,0,3)'}),configurable:true});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'getComputedStyle',previous);else delete globalThis.getComputedStyle;});
 return {node,animations,caption:createCarouselCaption(node),flush:async()=>{await Promise.resolve();await Promise.resolve();}};
}
test('captions complete their exit before replacing text and gently arrive after the card settles',async t=>{
 const f=fixture(t);f.caption.update('Echo');assert.equal(f.node.textContent,'Echo');
 assert.ok(f.animations[0].options.duration>=500);f.animations[0].complete();await f.flush();
 f.caption.update('Pulse',{ready:false});assert.equal(f.node.textContent,'Echo');
 f.caption.update('Pulse');assert.equal(f.animations.length,2);assert.equal(f.node.textContent,'Echo');
 f.animations[1].complete();await f.flush();assert.equal(f.node.textContent,'Pulse');assert.equal(f.animations.length,3);
 f.animations[2].complete();await f.flush();assert.equal(f.node.style.opacity,'1');
});
test('rapid swipes reveal only the latest settled project without overlapping captions',async t=>{
 const f=fixture(t);f.caption.update('Echo');f.caption.update('Pulse',{ready:false});
 f.caption.update('Pulse');f.caption.update('Project 03');
 f.animations[0].complete();await f.flush();assert.equal(f.node.textContent,'Echo');
 f.animations[1].complete();await f.flush();assert.equal(f.node.textContent,'Project 03');
 assert.equal(f.animations.length,3);
});
test('offscreen captions cancel and ignore stale animation completions',async t=>{
 const f=fixture(t);f.caption.update('Echo');f.caption.hide();
 assert.equal(f.node.style.opacity,'0');assert.equal(f.animations[0].cancelled,true);
 f.animations[0].complete();await f.flush();assert.equal(f.node.style.opacity,'0');
 f.caption.update('Pulse');assert.equal(f.node.textContent,'Pulse');
});
test('reduced motion changes the focused caption immediately without movement',t=>{
 const f=fixture(t);f.caption.update('Echo',{reduced:true});f.caption.update('Pulse',{reduced:true});
 assert.equal(f.node.textContent,'Pulse');assert.equal(f.node.style.opacity,'1');assert.equal(f.animations.length,0);
});
