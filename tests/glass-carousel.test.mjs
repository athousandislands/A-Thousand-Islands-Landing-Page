import test from 'node:test';
import assert from 'node:assert/strict';
import { springStep, wrap } from '../website-source/glass-carousel-model.js';
test('critically damped moves settle monotonically without bouncing',()=>{
 for(const direction of [-1,1]){let p=0,v=0,previous=0;for(let i=0;i<240;i++){[p,v]=springStep(p,v,direction,1/120,8);assert.ok(p*direction>=previous-1e-12);assert.ok(p*direction<=1);previous=p*direction;}assert.ok(Math.abs(p-direction)<.00001);}
});
test('spring solution is independent of frame rate and pauses preserve position',()=>{
 const one=springStep(.2,1,2,.1,8);let many=[.2,1];for(let i=0;i<10;i++)many=springStep(...many,2,.01,8);one.forEach((n,i)=>assert.ok(Math.abs(n-many[i])<1e-12));assert.deepEqual(springStep(.7,0,1,0,8),[.7,0]);
});
test('navigation wraps in both directions across any supported project count',()=>{
 for(const count of [1,3,16]){assert.equal(wrap(count,count),0);assert.equal(wrap(-1,count),count-1);assert.equal(wrap(-count*4,count),0);}
});

import { carouselDefaults, carouselMetrics, neighbors } from '../website-source/glass-carousel-model.js';
import { readCarouselPreset, makeCarouselPreset } from '../website-source/glass-carousel-presets.js';
test('compact layout leaves previous and next pills visible and pill size is independent of stage height',()=>{
 for(const [viewport,device] of [[320,"phone"],[390,"phone"],[640,"phone"],[820,"tablet"],[932,"phone"],[1376,"tablet"],[1440,"desktop"]]){
  const config=carouselDefaults(device),m=carouselMetrics(viewport,config);
  assert.ok(m.step-m.cardW/2<viewport/2,'both neighbors extend into the viewport');
  assert.ok(m.cardW<viewport*.6,'focused pill leaves room for neighbors');
  assert.equal(carouselMetrics(viewport,{...config,height:1.5}).cardW,m.cardW);
  assert.ok(carouselMetrics(viewport,{...config,width:config.width*.8}).cardW<m.cardW);
 }
});
test('left, focused and right projects remain distinct and rotate in order',()=>{
 assert.deepEqual(neighbors(0,3),[2,0,1]);assert.deepEqual(neighbors(1,3),[0,1,2]);assert.deepEqual(neighbors(2,3),[1,2,0]);
 for(let position=-16;position<=16;position++)assert.equal(new Set(neighbors(position,3)).size,3);
});
test('preset files round trip numeric controls and reject unrelated or invalid files',()=>{
 const ranges={pillSize:[52,20,80,1],glass:[1,0,2,.05],presets:{}};
 const document=makeCarouselPreset({pillSize:42,glass:1.2,presets:{}},ranges,'phone');
 assert.deepEqual(readCarouselPreset(JSON.parse(JSON.stringify(document)),ranges),{pillSize:42,glass:1.2});
 assert.deepEqual(readCarouselPreset({...document,settings:{pillSize:99,glass:-1}},ranges),{pillSize:80,glass:0});
 assert.throws(()=>readCarouselPreset({settings:{glass:1}},ranges));
 assert.throws(()=>readCarouselPreset({...document,settings:{glass:'bad'}},ranges));
 assert.throws(()=>readCarouselPreset({...document,settings:{unknown:1}},ranges));
});
test('depth spacing keeps the focused card separate and extra repeated copies outside standard views',()=>{
 for(const [viewport,device] of [[375,"phone"],[820,"tablet"],[1376,"tablet"],[1440,"desktop"],[1920,"desktop"]]){
  const config=carouselDefaults(device),m=carouselMetrics(viewport,config),sideWidth=m.cardW*(1+config.depth);
  assert.ok(m.step-m.cardW/2-sideWidth/2>=config.gap*config.scale-1e-9);
  assert.ok(2*m.step-sideWidth/2>viewport/2);
 }
});

import { readFileSync } from 'node:fs';
import { CAROUSEL_SETTINGS } from '../website-source/carousel-settings.js';
test('approved desktop, phone and tablet exports apply every saved control',()=>{
 const files={desktop:'ati-carousel-desktop-1793703769181.json',phone:'ati-carousel-phone-1793704259570.json',tablet:'ati-carousel-phone-1793704466574.json'};
 for(const [device,file] of Object.entries(files)){
  const expected=JSON.parse(readFileSync(new URL('../design-references/featured-work/approved-carousel-settings/'+file,import.meta.url))).settings;
  assert.deepEqual(CAROUSEL_SETTINGS[device],expected);
  const actual=carouselDefaults(device);
  assert.equal(actual.width,expected.pillSize/100);assert.equal(actual.scale,expected.carouselScale);assert.equal(actual.height,expected.stageHeight);
  for(const [key,value] of Object.entries(expected))if(!['pillSize','carouselScale','stageHeight'].includes(key))assert.equal(actual[key],value,key);
 }
});

import { gestureAxis, hitCarouselCard } from '../website-source/glass-carousel-model.js';
test('vertical swipes and diagonal drift remain page gestures, horizontal swipes require intent',()=>{
 for(const sign of [-1,1]){
  assert.equal(gestureAxis(3,4*sign),'pending');
  assert.equal(gestureAxis(6,35*sign),'vertical');
  assert.equal(gestureAxis(20,25*sign),'vertical');
  assert.equal(gestureAxis(25*sign,4),'horizontal');
 }
});
test('center and partially visible side cards can be selected without selecting empty space',()=>{
 for(const [w,device] of [[390,"phone"],[820,"tablet"],[1440,"desktop"]]){
  const config=carouselDefaults(device),m=carouselMetrics(w,config);
  const state={w,h:m.height,...m,current:0,config};
  assert.equal(hitCarouselCard(w/2,m.height*.465,state),0);
  assert.equal(hitCarouselCard(5,m.height*.465,state),-1);
  assert.equal(hitCarouselCard(w-5,m.height*.465,state),1);
  assert.equal(hitCarouselCard(w/2,0,state),null);
  assert.equal(hitCarouselCard(w/2,m.height*.5,{...state,fallback:true}),0);
  assert.equal(hitCarouselCard(0,0,{...state,fallback:true}),null);
 }
});

import vm from 'node:vm';
test('actual pointer handlers ignore vertical drift, retain horizontal ownership and select side taps only',()=>{
 const handlers={},captures=new Set(),selected=[];
 const stage={dataset:{},addEventListener:(type,fn)=>handlers[type]=fn,hasPointerCapture:id=>captures.has(id),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:0,top:0})};
 const config=carouselDefaults('phone'),metrics=carouselMetrics(390,config);
 const sandbox={stage,window:{addEventListener:(type,fn)=>handlers[type]=fn},root:{dataset:{},dispatchEvent:event=>selected.push(event.detail.index)},CustomEvent:class{constructor(type,options){Object.assign(this,options);}},live:{textContent:''},projects:[{title:'Echo'},{title:'Pulse'},{title:'Third'}],current:0,target:0,velocity:0,w:390,h:metrics.height,...metrics,config,reduced:{matches:false},gl:true,drag:null,focused:false,hover:false,autoMotion:false,timer:0,gestureAxis,hitCarouselCard,wrap,engage(){},manual(){},halt(){},render(){},request(){},schedule(){},clearTimeout(){}};
 vm.createContext(sandbox);
 const source=readFileSync(new URL('../website-source/glass-carousel.js',import.meta.url),'utf8');
 sandbox.wheelTimer = 0;
 vm.runInContext(source.slice(source.indexOf(' function cardAt('),source.indexOf(" stage.addEventListener('wheel'")),sandbox);
 const event=(x,y)=>({pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,pointerType:'touch'});
 const middle=metrics.height*.465;
 handlers.pointerdown(event(195,middle));handlers.pointermove(event(198,middle+5));assert.equal(sandbox.current,0);assert.equal(captures.size,0);
 handlers.pointermove(event(201,middle+50));handlers.pointerup(event(201,middle+50));assert.equal(sandbox.current,0);assert.deepEqual(selected,[]);
 handlers.pointerdown(event(195,middle));handlers.pointermove(event(150,middle+3));const moved=sandbox.current;assert.ok(moved>0);assert.equal(captures.size,1);
 handlers.pointermove(event(140,middle+100));assert.ok(sandbox.current>moved);handlers.pointerup(event(140,middle+100));assert.deepEqual(selected,[]);
 sandbox.current=0;handlers.pointerdown(event(385,middle));handlers.pointerup(event(385,middle));assert.equal(sandbox.target,1);assert.deepEqual(selected,[1]);
 handlers.pointerdown(event(195,middle));handlers.pointercancel(event(195,middle));assert.deepEqual(selected,[1]);

 // Real touch streams can survive Safari cancelling their matching pointer events.
 sandbox.window.TouchEvent = class {};
 sandbox.window.navigator = { maxTouchPoints: 1 };
 sandbox.current = sandbox.target = 0;
 let prevented = 0;
 const touch = (x,y) => ({touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}],cancelable:true,preventDefault(){prevented++;}});
 handlers.touchstart(touch(195,middle));
 handlers.touchmove(touch(197,middle+50));
 handlers.touchend(touch(197,middle+50));
 assert.equal(prevented,0);
 assert.equal(sandbox.target,0);
 handlers.touchstart(touch(195,middle));
 handlers.touchmove(touch(156,middle+2));
 handlers.touchend(touch(156,middle+2));
 assert.equal(prevented,1);
 assert.equal(sandbox.target,1);
 assert.deepEqual(selected,[1]);
});

test('arrival scheduling advances twice even under the pointer, then settles until a fresh visit',()=>{
 const source=readFileSync(new URL('../website-source/glass-carousel.js',import.meta.url),'utf8');
 let pending;
 const state={config:{seconds:2.5},timer:0,visible:true,document:{hidden:false},paused:false,drag:null,hover:true,focused:false,reduced:{matches:false},gl:true,introRemaining:2,root:{dataset:{}},live:{setAttribute(){}},target:0,render(){},request(){},clearTimeout(){pending=null;},setTimeout(fn){pending=fn;return 1;}};
 vm.createContext(state);vm.runInContext(source.slice(source.indexOf(' function schedule('),source.indexOf(' function navigate(')),state);
 state.schedule(900);pending();assert.equal(state.target,1);pending();assert.equal(state.target,2);assert.equal(pending,null);
 state.schedule();assert.equal(pending,null);assert.equal(state.root.dataset.introMoves,'2');
 state.introRemaining=2;state.schedule(900);pending();assert.equal(state.target,3);
 state.introRemaining=0;state.schedule();assert.equal(pending,null);
 state.reduced.matches=true;state.introRemaining=2;state.schedule();assert.equal(state.introRemaining,0);assert.equal(pending,null);
});
