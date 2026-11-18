import './footer-glass.css';
import { createFooterCutout } from './footer-cutout.js';
import { footerDefaults, footerMaterial, createFooterThaw } from './footer-glass-model.js';
import { initFooterContact } from './footer-contact.js';
import { deviceProfile, watchDeviceProfile } from './device-profile.js';
import { setFooterAtmosphere } from './site-sound.js';
import { createVideoLoader } from './video-loading.js';

export function initFooterGlass({ jumpTo = target => target.scrollIntoView({ block: 'start', behavior: 'instant' }) } = {}) {
  const root = document.querySelector('.footer-glass');
  if (!root) return;
  const updateContact = initFooterContact(root);
  const video = root.querySelector('video');
  const loader = createVideoLoader(root, video);
  const canvas = root.querySelector('.footer-glass__cutout');
  const trigger = root.querySelector('.footer-glass__trigger');
  const mist = root.querySelector('.footer-glass__mist');
  let cutout, cutoutAttempted = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Fonts and responsive sections above Contact can shift a direct preview link.
  // Keep that arrival anchored, then leave ordinary page navigation to the visitor.
  let arrivingAtContact = location.hash === '#contact', anchorFrame = 0;
  const alignContact = () => {
    cancelAnimationFrame(anchorFrame);
    anchorFrame = requestAnimationFrame(() => jumpTo(root));
  };
  const stopArrival = event => { if (!event.target.closest?.('.footer-dial')) arrivingAtContact = false; };
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) window.addEventListener(type, stopArrival, { once: true, passive: true });
  const alignArrival = () => { if (arrivingAtContact) alignContact(); };
  window.addEventListener('load', alignArrival, { once: true });
  document.fonts?.ready.then(alignArrival);
  const thaw = createFooterThaw();
  let device = deviceProfile(), near = false, inView = false, visible = false, playing = false;
  let exposure = 0;
  let reelOpen = false, playPending = false, timer = 0, failed = false, blocked = false;
  let playbackWatch;
  let gesture = null;
  const profiles = Object.fromEntries(['desktop', 'tablet', 'phone'].map(name => [name, footerDefaults(name)]));
  const values = () => profiles[device];
  const interactive = () => inView && root.isConnected && !document.hidden && !reelOpen;
  let cueStatus = 'initial', cueOnVisit = false, engagedOnVisit = false;
  function updateCue(active) {
    const canShow = active && visible && !engagedOnVisit;
    if (canShow && !cueOnVisit && cueStatus !== 'done') {
      cueOnVisit = true;
      if (cueStatus === 'return') cueStatus = 'done';
    }
    root.toggleAttribute('data-show-cue', canShow && cueOnVisit);
  }

  function renderThaw() {
    const { phase, progress, duration } = thaw.current();
    const material = footerMaterial(progress, values());
    root.style.setProperty('--footer-thaw-duration', `${duration}ms`);
    root.style.setProperty('--footer-blur', `${material.blur}px`);
    root.style.setProperty('--footer-mist', material.mist);
    root.style.setProperty('--footer-frost', material.frost);
    root.style.setProperty('--footer-tint', material.tint);
    root.style.setProperty('--footer-patch-opacity', material.patches);
    root.dataset.phase = phase;
    root.dataset.thawProgress = String(progress);
    syncAtmosphere();
  }
  function syncAtmosphere() {
    const { progress, duration } = thaw.current();
    // The first sliver is the visual feather into the footer. Deepen the
    // sound across the rest of the entry as Seya takes over the viewport.
    const depth = Math.max(0, Math.min(1, (exposure - .08) / .57));
    setFooterAtmosphere(root.isConnected && !document.hidden && !reelOpen ? depth : 0, progress, duration);
  }
  function scheduleThaw() {
    clearTimeout(timer);
    const now = performance.now();
    thaw.advance(now, reduced.matches);
    renderThaw();
    const { deadline } = thaw.current();
    // CSS handles the transitions. Only wake up when the scene changes phase.
    if (deadline !== null) timer = setTimeout(scheduleThaw, Math.max(0, deadline - now));
  }

  const isControl = target => {
    const control = target.closest('a, button, input, select, textarea, [role="button"]');
    return control && control !== trigger;
  };
  const withinTapDistance = (event, start) => Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10;
  const hasModifier = event => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

  function press() {
    let visualProgress;
    if (thaw.current().phase === 'fogging') {
      const { beginning, end } = values();
      const opacity = Number(getComputedStyle(mist).opacity);
      visualProgress = Math.max(0, Math.min(1, (opacity - beginning.mist) / (end.mist - beginning.mist)));
    }
    if (!thaw.press(performance.now(), visualProgress, reduced.matches)) return;
    scheduleThaw();
    if (!engagedOnVisit) {
      engagedOnVisit = true;
      if (cueStatus === 'initial') cueStatus = 'return';
      updateCue(true);
    }
  }

  root.addEventListener('pointerdown', event => {
    gesture = null;
    const fromEdge = event.pointerType !== 'mouse' && (event.clientX < 20 || event.clientX > innerWidth - 20);
    if (interactive() && event.isPrimary && event.button === 0 && !hasModifier(event) && !fromEdge && !isControl(event.target)) {
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  });
  root.addEventListener('pointermove', event => {
    if (gesture?.id === event.pointerId && !withinTapDistance(event, gesture)) gesture = null;
  });
  root.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    const start = gesture;
    gesture = null;
    if (interactive() && !hasModifier(event) && withinTapDistance(event, start) && !isControl(event.target)) press();
  });
  root.addEventListener('pointercancel', () => { gesture = null; });
  trigger.addEventListener('keydown', event => {
    if (event.repeat && event.key === 'Enter') event.preventDefault();
  });
  trigger.addEventListener('click', event => {
    // Pointer input has already been handled on release. Keep native keyboard and assistive activation.
    if (event.detail === 0 && interactive() && !hasModifier(event) && !event.defaultPrevented) press();
  });

  function layout() {
    const config = values(), f = config.framing, s = config.surface;
    const properties = {
      '--footer-height': `${f.sceneHeight}svh`, '--footer-size': f.videoSize,
      '--footer-section-offset': `${f.sectionOffset}svh`,
      '--footer-feather': `${f.edgeFeather}%`, '--footer-bottom-fog': f.bottomFog,
      '--footer-top-feather': `${f.topFeather}%`,
      '--footer-colour': s.colour, '--footer-grain': s.grain, '--footer-tint-feather': `${s.tintFeather}%`,
      '--footer-eye-clarity': config.fog.eyeClarity, '--footer-patch-scale': config.fog.patchScale,
    };
    for (const [key, value] of Object.entries(properties)) root.style.setProperty(key, String(value));
    const width = root.clientWidth, height = root.clientHeight;
    const mediaWidth = Math.max(width, height * 16 / 9);
    root.style.setProperty('--footer-media-width', `${mediaWidth}px`);
    root.style.setProperty('--footer-media-height', `${mediaWidth * 9 / 16}px`);
    root.style.setProperty('--footer-x', `${width * f.horizontal / 100}px`);
    root.style.setProperty('--footer-y', `${height * f.vertical / 100}px`);
    root.dataset.device = device;
    cutout?.configure(s);
    renderThaw();
  }
  function shouldPlay() {
    const enoughInView = device === 'desktop' ? visible : exposure >= .15;
    return enoughInView && interactive() && !reduced.matches && !failed && !blocked;
  }
  function resetScene() {
    clearTimeout(timer);
    gesture = null;
    thaw.reset();
    renderThaw();
    video.pause(); playing = false;
    if (video.readyState > 0) video.currentTime = 0;
  }
  function updateMedia() {
    cutout?.setActive(shouldPlay() && playing);
  }
  function load() {
    if (!near) return;
    if (!video.poster) video.poster = new URL('./assets/images/footer-metahuman-loop-poster.jpg', import.meta.url).href;
    if (!reduced.matches && !video.hasAttribute('src')) {
      video.preload = 'auto';
      video.src = device === 'desktop'
        ? new URL('./assets/video/footer-metahuman-loop.mp4', import.meta.url).href
        : new URL('./assets/video/footer-metahuman-mobile.mp4', import.meta.url).href;
      video.load();
    }
    // Let the native video prove it can advance before covering it on handhelds.
    if (inView && !cutoutAttempted && (device === 'desktop' || reduced.matches || (playing && video.currentTime > .05))) {
      cutoutAttempted = true;
      cutout = createFooterCutout(root, video, canvas, values().surface, { useVideoClock: device !== 'desktop' });
    }
  }
  function sync() {
    const active = interactive();
    syncAtmosphere();
    updateContact(active && visible);
    updateCue(active);
    trigger.hidden = !active;
    root.toggleAttribute('data-interactive', active);
    root.dataset.visible = String(visible);
    document.documentElement.toggleAttribute('data-footer-active', active && visible);
    load();
    const canPlay = shouldPlay();
    video.autoplay = canPlay;
    if (!canPlay) {
      clearTimeout(playbackWatch);
      loader.stop();
      video.pause();
      playing = false;
      root.dataset.playback = blocked ? 'blocked' : failed ? 'error' : reduced.matches ? 'poster' : 'paused';
    }
    else if (video.paused && !playPending && video.hasAttribute('src')) {
      playPending = true;
      if (device !== 'desktop') {
        clearTimeout(playbackWatch);
        const start = video.currentTime;
        playbackWatch = setTimeout(() => {
          if (shouldPlay() && Math.abs(video.currentTime - start) < .05) {
            root.dataset.playback = video.readyState < 3 ? 'buffering' : 'stalled';
            if (cutout) {
              cutout.useOriginal();
              cutout = undefined;
              video.pause();
              sync();
            }
          }
        }, 2200);
      }
      video.play().then(() => { if (!shouldPlay()) video.pause(); }).catch(error => {
        if (shouldPlay() && error.name !== 'AbortError') {
          if (error.name === 'NotAllowedError') blocked = true;
          else failed = true;
          root.dataset.playbackError = error.name;
          sync();
        }
      }).finally(() => {
        playPending = false; updateMedia();
        // A quick exit/re-entry can cancel the earlier play request. Retry that
        // interruption instead of treating it as a permanent media failure.
        if (shouldPlay() && video.paused) sync();
      });
    }
    updateMedia();
  }
  video.muted = true; video.defaultMuted = true;
  video.playsInline = true;
  // A regular footer interaction can retry a browser-blocked autoplay.
  root.addEventListener('click', event => {
    if (blocked && event.isTrusted) {
      blocked = false;
      loader.start();
      sync();
    }
  });
  video.addEventListener('playing', () => {
    playing = true;
    root.dataset.playback = 'playing';
    delete root.dataset.playbackError;
    sync();
  });
  video.addEventListener('timeupdate', () => {
    if (!cutoutAttempted && shouldPlay() && video.currentTime > .05) sync();
  });
  video.addEventListener('waiting', () => { if (shouldPlay()) root.dataset.playback = 'buffering'; });
  for (const event of ['waiting', 'pause', 'ended']) video.addEventListener(event, () => { playing = false; updateMedia(); });
  video.addEventListener('error', () => {
    failed = true;
    root.dataset.playbackError = String(video.error?.code || 'media');
    sync();
  });
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { near = true; load(); sync(); }
  }, { rootMargin: '900px 0px' }).observe(root);
  new IntersectionObserver(entries => {
    const entry = entries[0];
    if (inView && !entry.isIntersecting) leaveScene();
    inView = entry.isIntersecting;
    exposure = inView ? entry.intersectionRect.height / Math.min(entry.boundingClientRect.height, innerHeight) : 0;
    visible = inView && exposure >= .45;
    sync();
  }, { threshold: Array.from({ length: 41 }, (_, i) => i / 40) }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetScene(); sync(); });
  document.addEventListener('showreel:open', () => { reelOpen = true; resetScene(); sync(); });
  document.addEventListener('showreel:close', () => { reelOpen = false; sync(); });
  reduced.addEventListener('change', sync);

  function resize() {
    if (visible && location.hash === '#contact') alignContact();
  }
  window.addEventListener('resize', resize);
  watchDeviceProfile(next => { device = next; layout(); resize(); });
  new ResizeObserver(layout).observe(root);
  layout();
  function leaveScene() {
    inView = false;
    visible = false;
    exposure = 0;
    blocked = false;
    cueOnVisit = false;
    engagedOnVisit = false;
    resetScene();
  }
  return () => { leaveScene(); sync(); };
}
