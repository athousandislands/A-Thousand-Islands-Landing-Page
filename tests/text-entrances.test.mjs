import test from 'node:test';
import assert from 'node:assert/strict';
import { initSectionMotion } from '../website-source/text-entrances.js';

function fixture(t,reduced=false) {
 const records=[];
 function element(){return {
  children:[],setAttribute(){},append(...nodes){this.children.push(...nodes);},
  replaceChildren(...nodes){this.children=nodes;},
  animate(frames,options){const record={frames,options,cancelled:false};records.push(record);return {finished:new Promise(()=>{}),cancel(){record.cancelled=true;}};},
 };}
 const title={childNodes:['Create','Your','Reality'].map(textContent=>({...element(),nodeType:1,tagName:'SPAN',textContent})),setAttribute(){}},detail=element();
 const section={querySelector:selector=>selector==='h2'?title:detail};
 let observe;
 const globals={
  document:{querySelector:()=>section,createElement:element},Node:{TEXT_NODE:3},
  matchMedia:()=>({matches:reduced,addEventListener(){}}),
  IntersectionObserver:class{constructor(callback){observe=callback;}observe(){}},
 };
 for(const [key,value] of Object.entries(globals)){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 }
 initSectionMotion();
 return {records,intersect:visible=>observe([{isIntersecting:visible}])};
}
test('Create Your Reality replays beyond two visits and cancels cleanly offscreen',t=>{
 const f=fixture(t),glyphs='CreateYourReality'.length;
 for(let visit=1;visit<=4;visit++){
  f.intersect(true);
  assert.equal(f.records.length,(glyphs+1)*visit,'each entry animates every glyph and the supporting detail');
  f.intersect(true);
  assert.equal(f.records.length,(glyphs+1)*visit,'remaining onscreen does not restart the animation');
  f.intersect(false);
  assert.ok(f.records.every(record=>record.cancelled));
 }
});
test('Create Your Reality stays still with reduced motion',t=>{
 const f=fixture(t,true);
 for(let visit=0;visit<4;visit++){f.intersect(true);f.intersect(false);}
 assert.equal(f.records.length,0);
});
