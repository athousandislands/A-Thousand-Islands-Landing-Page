import { syncVideoTransport } from './video-transport.js';
import { isHandheld, isPhoneLayout, watchDeviceProfile } from './device-profile.js';
import { createVideoLoader } from './video-loading.js';

const media={
 desktop:{cover:new URL('./assets/showreel/desktop-cover.mp4',import.meta.url).href,full:new URL('./assets/showreel/desktop-full.mp4',import.meta.url).href,poster:new URL('./assets/showreel/desktop-cover-poster.jpg',import.meta.url).href},
 mobile:{cover:new URL('./assets/showreel/mobile-cover.mp4',import.meta.url).href,full:new URL('./assets/showreel/mobile-full.mp4',import.meta.url).href,poster:new URL('./assets/showreel/mobile-cover-poster.jpg',import.meta.url).href},
};
export function initShowreel(){
 const section=document.querySelector('.showreel'),card=section.querySelector('.reel-card'),cover=section.querySelector('.reel-cover'),launch=section.querySelector('.reel-launch'),stage=section.querySelector('.reel-player'),video=stage.querySelector('video'),dialog=document.querySelector('.reel-dialog'),slot=section.querySelector('.reel-player-slot');
 const loader=createVideoLoader(stage,video);
 const pause=stage.querySelector('.reel-pause'),close=stage.querySelector('.reel-close'),mute=stage.querySelector('.reel-mute'),volume=stage.querySelector('.reel-volume'),seek=stage.querySelector('.reel-seek'),elapsed=stage.querySelector('.reel-elapsed'),duration=stage.querySelector('.reel-duration'),status=stage.querySelector('.reel-status');
 if(isHandheld()){
  close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Back</span>';
  close.setAttribute('aria-label','Back to homepage');
  close.classList.add('reel-back');
 }
 let dismissSwipe;
 stage.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||event.target.closest('button,input,.reel-transport,.reel-volume-group'))return;
  dismissSwipe={id:event.pointerId,x:event.clientX,y:event.clientY};
 },{passive:true});
 stage.addEventListener('pointerup',event=>{
  if(dismissSwipe?.id===event.pointerId&&event.clientY-dismissSwipe.y>90&&Math.abs(event.clientX-dismissSwipe.x)<(event.clientY-dismissSwipe.y)*.6)finish();
  dismissSwipe=undefined;
 },{passive:true});
 stage.addEventListener('pointercancel',()=>{dismissSwipe=undefined;},{passive:true});
 const compact=matchMedia('(max-width:640px)'),portrait=matchMedia('(orientation:portrait)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let attached=true,active=false,closing=false,near=false,warm=false,revision=0,hideTimer,closeTimer,warmFrame,format,previousFocus,audioContext,volumeGain;
 let previousVolume=Number(volume.value)||1,volumeAtGestureStart=null,interacting=false;
 cover.preload='auto';cover.muted=true;
 const time=n=>`${Math.floor((Number.isFinite(n)?n:0)/60).toString().padStart(2,'0')}:${Math.floor((Number.isFinite(n)?n:0)%60).toString().padStart(2,'0')}`;
 const preferredFormat=()=>portrait.matches&&isPhoneLayout()?'mobile':'desktop';
 function playCover(){if(attached&&cover.hasAttribute('src')&&near&&(!active||closing)&&!document.hidden&&!reduced.matches)cover.play().catch(()=>{});else cover.pause();}
 function selectCover(){
  if(active&&!closing)return;
  const next=preferredFormat();
  if(format!==next){
   format=next;card.dataset.format=next;cover.pause();cover.removeAttribute('src');cover.poster=media[next].poster;
  }
  if(!reduced.matches&&(near||warm)&&!cover.hasAttribute('src'))cover.src=media[next].cover;
  playCover();
 }
 // Pointer interaction may fade; keyboard focus must keep its controls available.
 function showControls(){
  stage.classList.add('controls-visible');clearTimeout(hideTimer);
  if(active&&!closing&&!video.paused)hideTimer=setTimeout(()=>{
   const keyboardFocus=stage.dataset.input==='keyboard'&&stage.querySelector('.reel-transport:focus-within,.reel-volume-group:focus-within');
   if(!interacting&&!keyboardFocus)stage.classList.remove('controls-visible');
  },isHandheld()?1200:1800);
 }
 function setVolume(next){
  next=Math.max(0,Math.min(1,next));
  if(next>0)previousVolume=next;
  volume.value=next;
  if(volumeGain)volumeGain.gain.value=next;else video.volume=next;
  video.muted=next===0;
  sync();showControls();
 }
 function togglePlayback(){
  if(!active||closing)return;
  if(video.paused){status.textContent='';loader.start();audioContext?.resume().catch(()=>{});video.play().catch(()=>{loader.stop();if(active&&!closing)status.textContent='Playback could not start. Please try again.';});}
  else video.pause();
  showControls();
 }
 function sync(){video.setAttribute('aria-label',video.paused?'Play showreel':'Pause showreel');syncVideoTransport(pause,video.paused,'showreel');seek.disabled=!Number.isFinite(video.duration);seek.max=Number.isFinite(video.duration)?video.duration:1;seek.value=video.currentTime;seek.setAttribute('aria-valuetext',`${time(video.currentTime)} of ${time(video.duration)}`);elapsed.textContent=time(video.currentTime);duration.textContent=time(video.duration);mute.innerHTML=video.muted||video.volume===0?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M16 8q4 4 0 8m3-11q7 7 0 14" fill="none" stroke="currentColor" stroke-width="2"/></svg>';mute.setAttribute('aria-label',video.muted?'Unmute showreel':'Mute showreel');}
 function resetPlayer(restoreFocus){
  if(!active&&!closing)return;
  revision++;active=false;closing=false;clearTimeout(closeTimer);clearTimeout(hideTimer);
  loader.stop();video.pause();audioContext?.suspend().catch(()=>{});
  stage.classList.remove('is-ready','is-closing','controls-visible');dialog.classList.remove('is-closing');
  if(dialog.open)dialog.close();slot.append(stage);stage.hidden=true;
  video.removeAttribute('src');video.load();
  section.classList.remove('reel-playing','reel-returning');document.body.classList.remove('reel-modal-open');
  dismissSwipe=undefined;interacting=false;volumeAtGestureStart=null;
  document.dispatchEvent(new Event('showreel:close'));
  if(restoreFocus){selectCover();previousFocus?.focus({preventScroll:true});}
  previousFocus=undefined;
 }
 function finish(){
  if(!active||closing)return;
  closing=true;revision++;clearTimeout(hideTimer);loader.stop();video.pause();
  section.classList.add('reel-returning');
  (dialog.open?dialog:stage).classList.add('is-closing');
  selectCover();
  // Keep the decoded frame and underlying loop in place for the entire fade.
  closeTimer=setTimeout(()=>resetPlayer(true),reduced.matches?100:320);
 }
 async function start(event){if(!attached||active||closing)return;active=true;const run=++revision;previousFocus=document.activeElement;cover.pause();status.textContent='';section.classList.add('reel-playing');stage.hidden=false;stage.classList.remove('is-ready','is-closing');stage.dataset.input='pointer';
  dialog.append(stage);dialog.showModal();document.body.classList.add('reel-modal-open');
  try{if(!audioContext){audioContext=new AudioContext();volumeGain=audioContext.createGain();volumeGain.gain.value=Number(volume.value);audioContext.createMediaElementSource(video).connect(volumeGain).connect(audioContext.destination);}audioContext.resume().catch(()=>{});}catch{/* Native video audio remains the fallback. */}
  // The two edits have different timelines. Keep the chosen cut until the player closes.
  document.dispatchEvent(new Event('showreel:open'));video.src=media[preferredFormat()].full;video.muted=Number(volume.value)===0;showControls();close.focus({preventScroll:true});stage.dataset.input=event.detail===0?'keyboard':'pointer';
  loader.start();
  try{await video.play();if(run!==revision)return;status.textContent='';stage.classList.add('is-ready');sync();showControls();}catch{if(run!==revision)return;loader.stop();status.textContent='Playback could not start. Press play to try again.';stage.classList.add('is-ready');showControls();}
 }
 launch.addEventListener('click',start);close.addEventListener('click',finish);dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
 pause.addEventListener('click',togglePlayback);
 video.addEventListener('click',togglePlayback);
 mute.addEventListener('click',()=>setVolume(video.muted||Number(volume.value)===0?previousVolume:0));
 volume.addEventListener('pointerdown',()=>{volumeAtGestureStart=Number(volume.value);});
 volume.addEventListener('keydown',event=>{if(!event.repeat)volumeAtGestureStart=Number(volume.value);});
 volume.addEventListener('keyup',()=>{volumeAtGestureStart=null;});
 volume.addEventListener('input',()=>{
  const next=Number(volume.value),restore=volumeAtGestureStart;
  setVolume(next);
  if(next===0&&restore>0)previousVolume=restore;
 });
 seek.addEventListener('input',()=>{if(Number.isFinite(video.duration)){if(Number(seek.value)>=video.duration-.05){finish();return;}video.currentTime=Number(seek.value);}showControls();sync();});
 for(const event of ['timeupdate','durationchange','volumechange'])video.addEventListener(event,sync);
 video.addEventListener('pause',()=>{sync();showControls();});video.addEventListener('playing',()=>{if(closing||document.hidden||!document.hasFocus()){video.pause();return;}status.textContent='';stage.classList.add('is-ready');sync();showControls();});video.addEventListener('waiting',showControls);video.addEventListener('error',()=>{if(active){status.textContent='The showreel could not load. Press close and try again.';stage.classList.add('is-ready');showControls();}});video.addEventListener('ended',finish);
 stage.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')showControls();});
 stage.addEventListener('pointerdown',event=>{stage.dataset.input='pointer';interacting=!!event.target.closest('.reel-transport,.reel-volume-group');showControls();});
 function endGesture(){const wasInteracting=interacting;interacting=false;volumeAtGestureStart=null;if(wasInteracting&&active&&!closing)showControls();}
 window.addEventListener('pointerup',endGesture,{passive:true});window.addEventListener('pointercancel',endGesture,{passive:true});
 stage.addEventListener('focusin',event=>{if(event.target.matches(':focus-visible'))stage.dataset.input='keyboard';showControls();});
 stage.addEventListener('focusout',showControls);
 stage.addEventListener('keydown',event=>{
  stage.dataset.input='keyboard';showControls();
  if(event.key==='Escape'){event.preventDefault();finish();}
  if((event.code==='Space'||event.key==='Enter')&&!event.target.matches('button,input')){event.preventDefault();togglePlayback();}
 });
 window.addEventListener('blur',()=>{if(active)video.pause();});
 window.addEventListener('pageshow',playCover);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)video.pause();playCover();});
 const observer=new IntersectionObserver(entries=>{near=entries[0].isIntersecting;if(!near&&active&&!dialog.open)video.pause();selectCover();},{rootMargin:'550px 0px'});observer.observe(section);
 const coverQueries=[compact,portrait,reduced];
 for(const query of coverQueries)query.addEventListener('change',selectCover);
 selectCover();sync();
 const stopWatchingDevice=watchDeviceProfile(selectCover);
 // Give the opening a paint before starting the cover transfer on normal connections.
 warmFrame=requestAnimationFrame(()=>{warmFrame=requestAnimationFrame(()=>{
  if(!navigator.connection?.saveData){warm=true;selectCover();}
 });});
 function deactivate(){attached=false;resetPlayer(false);cover.pause();}
 return {
  activate(){attached=true;selectCover();},
  dismiss({resumeCover=true}={}){resetPlayer(false);if(resumeCover)playCover();else cover.pause();},
  deactivate,
  destroy(){deactivate();observer.disconnect();stopWatchingDevice();for(const query of coverQueries)query.removeEventListener('change',selectCover);clearTimeout(hideTimer);cancelAnimationFrame(warmFrame);window.removeEventListener('pageshow',playCover);audioContext?.close().catch(()=>{});},
 };
}

