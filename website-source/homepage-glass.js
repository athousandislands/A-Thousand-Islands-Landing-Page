import { initHomepageTilt } from './homepage-tilt.js';
export const REVEAL_DURATION = 40_000;
export const STUDIO_INTRODUCTION = {intro:'WE ARE AN',identity:'ARTIST-LED',studio:'DESIGN STUDIO'};

// Shared flow drives the colour travel and the lettering's uneven focus.
export function flowAt(progress, portrait=false) {
  const keys = [[0,-6.25,3.75,-8,1.04],[.38,8.75,-8.75,12,1.18],[.76,-5,7.5,-6,1.08],[1,3.75,-2.5,4,1.12]];
  const end = keys.findIndex((key,index) => index > 0 && progress <= key[0]);
  const b=keys[end < 0 ? keys.length-1 : end],a=keys[Math.max(0,(end < 0 ? keys.length-1 : end)-1)];
  const t=Math.max(0,Math.min(1,(progress-a[0])/(b[0]-a[0])));
  const ease=(1-Math.cos(t*Math.PI))/2;
  const flow=a.slice(1).map((value,index)=>value+(b[index+1]-value)*ease);
  // Rotate the established composition and travel without washing out its palette.
  return portrait?[-flow[1],flow[0],flow[2],flow[3]]:flow;
}

// Source hues from the current colour field; shuffled without consecutive repeats.
export function createBloomPicker(random = Math.random) {
  const palette = [
    [88,164,235], [249,118,98], [251,154,93],
    [255,198,129], [239,135,89], [219,155,187],
  ];
  let bag = [], last;
  return () => {
    if (!bag.length) {
      bag = [...palette];
      for (let i=bag.length-1;i>0;i--) {
        const j=Math.floor(random()*(i+1));
        [bag[i],bag[j]]=[bag[j],bag[i]];
      }
      if (bag[0]===last) [bag[0],bag[1]]=[bag[1],bag[0]];
    }
    last=bag.shift();
    return last;
  };
}

export function initGlassScene({ playSound }) {
  const REVEAL_DURATION=matchMedia('(any-pointer: coarse)').matches ? 90_000 : 40_000;
  const hero=document.querySelector('.hero'),trigger=document.querySelector('.glass-trigger');
  const reveal=document.querySelector('.glass-reveal'),colour=document.querySelector('.glass-colour');
  const tilt=initHomepageTilt(hero,trigger,colour);
  const bloom=document.querySelector('.glass-bloom');
  const clock=document.querySelector('.studio-clock'),readable=document.querySelector('.studio-clock-readable');
  const items=[...clock.querySelectorAll('.clock-item')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let animations=[],active=false,frame=0,started=0,lastFrame=0,bloomAnimation,portrait=false;
  let gesture=null, inView=true;
  const pickBloom=createBloomPicker();
  // Keep the reveal and its cue within this document's lifetime.
  hero.dataset.engaged='false';
  function rememberEngagement(){
    hero.dataset.engaged='true';trigger.classList.add('has-interacted');
  }

  function updateIntroduction() {
    for(const node of clock.querySelectorAll('[data-field]'))node.textContent=STUDIO_INTRODUCTION[node.dataset.field];
    readable.textContent='We are an artist-led design studio.';
  }
  function reset() {
    active=false;cancelAnimationFrame(frame);
    animations.forEach(animation=>animation.cancel());animations=[];
    bloomAnimation?.cancel();bloomAnimation=null;
    clock.hidden=readable.hidden=true;
    hero.dataset.scene='idle';trigger.setAttribute('aria-pressed','false');
    trigger.setAttribute('aria-label','Reveal our studio introduction');
    colour.style.transform='';
    for(const item of items){item.querySelector('.clock-clear').style.maskPosition='';item.querySelector('.clock-clear').style.maskImage='';item.querySelector('.clock-soft').style.opacity='';}
  }
  function animate(node,frames,options={}) {
    const animation=node.animate(frames,{duration:REVEAL_DURATION,fill:'both',...options});
    animations.push(animation);return animation;
  }
  function tick(now) {
    if(!active||!inView||document.hidden||reduced.matches)return;
    frame=requestAnimationFrame(tick);
    if(now-lastFrame<32)return;
    lastFrame=now;
    const progress=Math.min(1,(now-started)/REVEAL_DURATION);
    const [x,y]=flowAt(progress);
    const [cx,cy,angle,scale]=flowAt(progress,portrait);
    const flow=tilt.flowAmount() * 1.1;
    colour.style.transform=`translate(${cx*flow}% ,${cy*flow}%) rotate(${angle*flow}deg) scale(${1+(scale-1)*flow})`;
    items.forEach((item,index)=>{
      const phase=index*1.9;
      // Soft islands of focus, not a straight wipe clipped to a word's box.
      const fx=50+x*3.5+Math.sin(progress*Math.PI*4+phase)*28;
      const fy=50+y*2+Math.cos(progress*Math.PI*3+phase)*24;
      item.querySelector('.clock-clear').style.maskPosition=`${fx}% ${fy}%`;
      item.querySelector('.clock-soft').style.opacity=String(.18+.12*(.5+.5*Math.sin(progress*Math.PI*4+phase)));
    });
  }
  function releaseBloom(x,y) {
    if(!active)return;
    const rgb=pickBloom();
    bloom.style.setProperty('--bloom-colour',rgb.join(' '));
    bloom.style.setProperty('--bloom-highlight',rgb.map(value=>Math.round(value+(255-value)*.2)).join(' '));
    bloomAnimation?.cancel();bloom.style.left=`${x}px`;bloom.style.top=`${y}px`;
    bloomAnimation=bloom.animate(reduced.matches?[
      {opacity:0,transform:'translate(-50%, -50%) scale(1)'},{opacity:.35},{opacity:0},
    ]:[
      {opacity:0,transform:'translate(-50%, -50%) scale(.12)'},
      {opacity:.7,transform:'translate(-50%, -50%) scale(.7)',offset:.24},
      {opacity:0,transform:'translate(-50%, -50%) scale(1.8)'},
    ],{duration:reduced.matches?600:1900,easing:'ease-out',fill:'forwards'});
  }
  function syncLayout() {
    const box=hero.getBoundingClientRect();
    portrait=box.height>box.width;
    hero.dataset.format=portrait?'portrait':'landscape';
  }
  syncLayout();
  const layout=new ResizeObserver(syncLayout);
  layout.observe(hero);
  function start() {
    if(active)return;
    active=true;
    trigger.setAttribute('aria-pressed','true');trigger.setAttribute('aria-label','Studio introduction is showing');
    hero.dataset.scene='revealing';clock.hidden=readable.hidden=false;updateIntroduction();playSound();
    const frost=document.querySelector('.glass-frost');
    if(frost&&!reduced.matches)animate(frost,[
      {maskPosition:'20% 30%',opacity:.26},
      {maskPosition:'80% 65%',opacity:.34,offset:.45},
      {maskPosition:'35% 85%',opacity:.24,offset:.8},
      {maskPosition:'50% 50%',opacity:.26},
    ],{easing:'ease-in-out'});
    const envelope=animate(reveal,[
      {opacity:0,offset:0,easing:'ease-in-out'},{opacity:1,offset:3_000/REVEAL_DURATION},
      {opacity:1,offset:1-3_000/REVEAL_DURATION,easing:'ease-in-out'},{opacity:0,offset:1},
    ]);
    for(const [index,item] of items.entries()) {
      animate(item,[{opacity:0,offset:0},{opacity:0,offset:700*index/REVEAL_DURATION},{opacity:1,offset:(3600+700*index)/REVEAL_DURATION},{opacity:1,offset:1-3600/REVEAL_DURATION},{opacity:0,offset:1}]);
      if(reduced.matches)item.querySelector('.clock-clear').style.maskImage='none';
    }
    started=lastFrame=performance.now();
    if(!reduced.matches&&inView)frame=requestAnimationFrame(tick);
    envelope.finished.then(reset,()=>{});
  }
  trigger.addEventListener('pointerdown',event=>{
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,valid:event.isPrimary!==false,type:event.pointerType};
  });
  trigger.addEventListener('pointermove',event=>{
    if(gesture?.id===event.pointerId&&gesture.type!=='mouse'&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.valid=false;
    // Movement is read solely to distinguish touch scrolling from a tap.
  });
  trigger.addEventListener('pointercancel',()=>{if(gesture)gesture.valid=false;});
  trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')gesture=null;});
  trigger.addEventListener('click',event=>{
    if(gesture&&!gesture.valid){gesture=null;return;}
    rememberEngagement();
    if(!active)start();
    else {
      playSound();
      const box=hero.getBoundingClientRect();
      releaseBloom(event.detail===0?box.width/2:event.clientX-box.left,event.detail===0?box.height/2:event.clientY-box.top);
    }
    gesture=null;
  });
  document.addEventListener('visibilitychange',()=>{
    if(!active)return;
    if(document.hidden){
      cancelAnimationFrame(frame);
      bloomAnimation?.cancel();bloomAnimation=null;
      return;
    }
    const elapsed=performance.now()-started;
    if(elapsed>=REVEAL_DURATION){reset();return;}
    // Align browser animation timelines with the original wall-clock deadline.
    for(const animation of animations)animation.currentTime=elapsed;
    lastFrame=performance.now();
    if(!reduced.matches&&inView)frame=requestAnimationFrame(tick);
  });
  const visibility=new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;
    hero.dataset.inView=String(inView);
    cancelAnimationFrame(frame);
    // Off-screen rendering may sleep; the original animation deadline continues.
    if(active&&inView&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
  },{threshold:0});
  visibility.observe(hero);
  reduced.addEventListener('change',()=>{
    cancelAnimationFrame(frame);bloomAnimation?.cancel();
    for(const item of items)item.querySelector('.clock-clear').style.maskImage=reduced.matches?'none':'';
    if(active&&!reduced.matches&&inView&&!document.hidden)frame=requestAnimationFrame(tick);
  });
  window.addEventListener('pagehide',()=>{
    gesture=null;
    hero.dataset.engaged='false';
    trigger.classList.remove('has-interacted');
    reset();
  });
  reset();
}
