import { initShowreel } from './showreel-player.js';
import { initSectionMotion } from './text-entrances.js';
import { initGlassScene } from './homepage-glass.js';
import { initServicesDiscovery } from './services-discovery.js';
import { initFeaturedWork } from './featured-work.js';
import { initGlassCarousel } from './glass-carousel.js';
import { initFooterGlass } from './footer-glass.js';
import { playGlassBloom } from './site-sound.js';
import { fadeToPage } from './project-navigation.js';

export function mountPage(root, scrolling) {
  initGlassScene({ playSound: playGlassBloom });
  if (new URLSearchParams(location.search).get('tune') === 'homepage') {
    import('./homepage-tuning.js').then(({ mountHomepageTuning }) => mountHomepageTuning(root));
  }

  root.querySelector('.wordmark a').addEventListener('click', event => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.replaceState(history.state, '', `${location.pathname}${location.search}#top`);
    scrolling.scrollToTop();
  });

  const titleMotion = initSectionMotion(root.querySelector('.approach'), { jumpTo: scrolling.jumpTo });
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('tune') === 'ticker') {
    import('./ticker-tuning.js').then(({ mountTickerTuning }) => mountTickerTuning(titleMotion, root));
  }
  initServicesDiscovery({ playSound: playGlassBloom });
  initFeaturedWork({ jumpTo: scrolling.jumpTo });
  const carousel = initGlassCarousel();
  const stopFooterContact = initFooterGlass({ jumpTo: scrolling.jumpTo });


  const showreel = initShowreel();
  root.addEventListener('carousel:select', event => {
    if (event.detail.project.href) fadeToPage(event.detail.project.href);
  });

  // Passive scroll progress: one update per frame, no layout changes.
  const progressTrack=document.createElement('div');
  progressTrack.className='page-progress';progressTrack.setAttribute('aria-hidden','true');progressTrack.innerHTML='<span></span>';root.append(progressTrack);
  let progressFrame=0;
  function queueProgress(){if(progressFrame)return;progressFrame=requestAnimationFrame(()=>{progressFrame=0;const distance=document.documentElement.scrollHeight-innerHeight;progressTrack.style.setProperty('--page-progress',String(distance>0?Math.max(0,Math.min(1,scrollY/distance)):0));});}
  let progressIdleTimer;
  function showProgress(){
    progressTrack.dataset.active='true';
    clearTimeout(progressIdleTimer);
    progressIdleTimer=setTimeout(()=>{progressTrack.dataset.active='false';},1100);
  }
  window.addEventListener('scroll',()=>{queueProgress();showProgress();},{passive:true});
  for(const event of ['wheel','touchstart','pointermove'])window.addEventListener(event,showProgress,{passive:true});
  window.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))showProgress();});
  window.addEventListener('resize',queueProgress);queueProgress();showProgress();
  return {
    activate() {
      titleMotion.activate();
      showreel.activate();
    },
    dismissOverlay: showreel.dismiss,
    deactivate() {
      titleMotion.deactivate();
      showreel.deactivate();
      stopFooterContact?.();
    },
    frameWork: () => carousel?.landOn('Pulse'),
  };
}
