import './site-menu.css';
import { applyMenuSettings, currentMenuProfile, readMenuProfiles, saveMenuProfiles, watchMenuProfile } from './site-menu-settings.js';
import { bindHoverSound, playMenuHover, setMenuAtmosphere, setMenuHeartbeat } from './site-sound.js';
import { deviceProfile } from './device-profile.js';

const desktopPortrait = new URL('./assets/images/seya-menu-sage-desktop.webp', import.meta.url).href;
const tabletPortrait = new URL('./assets/images/seya-menu-sage-tablet.webp', import.meta.url).href;
const phonePortrait = new URL('./assets/images/seya-menu-sage-phone.webp', import.meta.url).href;

function trackMenuHover(nav) {
  let active;
  let lastSound = -Infinity;

  function activate(next) {
    if (active === next) return;
    active?.removeAttribute('data-menu-hover');
    active = next;
    nav.toggleAttribute('data-hover-active', Boolean(next));
    if (!next) return;
    next.setAttribute('data-menu-hover', '');
    const now = performance.now();
    if (now - lastSound >= 145) {
      lastSound = now;
      playMenuHover();
    }
  }

  nav.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && deviceProfile() === 'desktop') {
      activate(event.target.closest('.site-menu__option'));
    }
  });
  nav.addEventListener('pointerleave', () => activate(null));
  return () => activate(null);
}

export function initSiteMenu({ scrollTo, navigate }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'site-menu';
  dialog.className = 'site-menu';
  dialog.setAttribute('aria-label', 'Site menu');
  dialog.setAttribute('data-lenis-prevent', '');
  dialog.innerHTML = `
    <div class="site-menu__panel menu-surface">
      <div class="site-menu__scene" aria-hidden="true" hidden>
        <picture>
          <source media="(orientation: portrait)">
          <img class="site-menu__portrait" alt="" decoding="async">
        </picture>
        <div class="site-menu__fog"></div>
        <div class="site-menu__mist"></div>
      </div>
      <div class="header site-menu__header">
        <span class="wordmark"></span>
        <div class="controls">
          <button class="site-menu__close" type="button" aria-label="Close menu" autofocus>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="m4 4 16 16M20 4 4 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <nav class="site-menu__links" aria-label="Main navigation">
        <a class="site-menu__option" href="/#top"><span>Home</span></a>
        <a class="site-menu__option site-menu__process" href="/approach/"><span>Process</span></a>
        <a class="site-menu__option" href="/#featured-work"><span>Work</span></a>
        <a class="site-menu__option" href="/#contact"><span>Contact</span></a>
      </nav>
      <div class="site-menu__contact">
        <div>Contact Us</div>
        <a class="sweep-underline" href="mailto:contact@athousandislands.tech" target="_blank" rel="noopener">contact@athousandislands.tech</a>
      </div>
    </div>`;
  document.body.append(dialog);
  const panel = dialog.querySelector('.site-menu__panel');
  const scene = panel.querySelector('.site-menu__scene');
  const portraitSource = scene.querySelector('source');
  const portrait = scene.querySelector('.site-menu__portrait');
  const mist = scene.querySelector('.site-menu__mist');
  const fog = scene.querySelector('.site-menu__fog');
  const clearHover = trackMenuHover(dialog.querySelector('.site-menu__links'));
  bindHoverSound(dialog.querySelectorAll('.site-menu__contact a, .site-menu__close'), 'tick');
  const profiles = readMenuProfiles();
  let profile = currentMenuProfile();
  function applyProfile() {
    dialog.dataset.menuDevice = deviceProfile();
    dialog.dataset.menuProfile = profile;
    applyMenuSettings(dialog, profiles[profile]);
  }
  applyProfile();

  const close = dialog.querySelector('.site-menu__close');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tune = new URLSearchParams(location.search).get('tune');
  const tuning = ['menu', 'sound'].includes(tune) ? tune : null;
  const tuningHost = tuning ? document.createElement('div') : null;
  let mountMenuTuning;
  let trigger, position, animation, stopTuning;
  let soundButton, soundSlot;
  let atmosphereFrame;
  let phase = 'closed';
  const bound = new WeakSet();
  const closedClip = 'inset(0 0 100% 0)';
  const openClip = 'inset(0)';
  const motion = { duration: 560, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'both' };

  function syncMenuAtmosphere() {
    cancelAnimationFrame(atmosphereFrame);
    if (phase !== 'open' || scene.hidden || document.hidden) return;
    const { openingMist, finalMist, openingFog, finalFog } = profiles[profile].thaw;
    const readMist = openingMist !== finalMist;
    const veil = readMist ? mist : fog;
    const opening = readMist ? openingMist : openingFog;
    const final = readMist ? finalMist : finalFog;
    // Read the veil itself so loading, reveal delay, easing and visibility
    // all affect the music at the same time as the portrait.
    const reveal = opening === final ? 1 : (Number(getComputedStyle(veil).opacity) - opening) / (final - opening);
    setMenuAtmosphere(Math.max(0, Math.min(1, reveal)), reduced.matches ? .65 : .14);
    if (veil.getAnimations().some(effect => effect.animationName === 'menu-veil-thaw' && effect.playState === 'running')) {
      atmosphereFrame = requestAnimationFrame(syncMenuAtmosphere);
    }
  }

  function syncScene() {
    if (!dialog.open) {
      scene.hidden = true;
      return;
    }
    if (profile === 'Phone') portraitSource.srcset = phonePortrait;
    else portraitSource.removeAttribute('srcset');
    const fallback = profile.startsWith('Tablet') ? tabletPortrait : desktopPortrait;
    if (portrait.getAttribute('src') !== fallback) portrait.src = fallback;
    // Keep the painted scene and its reveal while the picture loads a new crop.
    if (portrait.naturalWidth > 0) scene.hidden = false;
    if (scene.hidden && phase === 'open') setMenuAtmosphere(0, .56);
    syncMenuAtmosphere();
  }

  function previewScene(view) {
    if (!dialog.open) {
      const button = document.querySelector('.header .menu');
      if (button) open(button);
    }
    if (phase !== 'open') return;
    if (view !== 'live') {
      scene.dataset.thawPreview = view;
      syncMenuAtmosphere();
      return;
    }
    delete scene.dataset.thawPreview;
    for (const effect of scene.getAnimations({ subtree: true })) effect.currentTime = 0;
    syncMenuAtmosphere();
  }

  function syncVisibility() {
    scene.toggleAttribute('data-paused', document.hidden);
    syncMenuAtmosphere();
  }
  portrait.addEventListener('load', syncScene);
  reduced.addEventListener('change', syncMenuAtmosphere);
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();

  function mountTuning() {
    stopTuning?.();
    stopTuning = undefined;
    if (!mountMenuTuning) return;
    stopTuning = mountMenuTuning(tuningHost, profile, profiles, () => {
      applyProfile();
      saveMenuProfiles(profiles);
      syncMenuAtmosphere();
    }, previewScene);
  }

  if (tuningHost) {
    tuningHost.setAttribute('data-lenis-prevent', '');
    document.body.append(tuningHost);
    if (tuning === 'sound') {
      import('./site-sound-tuning.js').then(module => module.mountSoundTuning(tuningHost));
    } else {
      import('./site-menu-tuning.js').then(module => {
        mountMenuTuning = module.mountMenuTuning;
        mountTuning();
      });
    }
  }

  watchMenuProfile(next => {
    profile = next;
    applyProfile();
    syncScene();
    mountTuning();
  });

  function dismiss(restore = false) {
    if (!dialog.open) return;
    phase = 'closed';
    setMenuHeartbeat(false);
    animation?.cancel();
    cancelAnimationFrame(atmosphereFrame);
    setMenuAtmosphere(0, .56);
    clearHover();
    if (soundSlot) {
      soundSlot.replaceWith(soundButton);
      soundButton = soundSlot = undefined;
    }
    dialog.close();
    syncScene();
    if (tuningHost) document.body.append(tuningHost);
    delete document.documentElement.dataset.menuOpen;
    trigger.setAttribute('aria-expanded', 'false');
    if (restore && trigger.isConnected) {
      scrollTo(position);
      trigger.focus({ preventScroll: true });
    }
  }

  function open(button, input = 'pointer') {
    if (dialog.open) return;
    trigger = button;
    position = scrollY;
    scrollTo(position);
    const header = button.closest('.header');
    const wordmark = header.querySelector('.wordmark').cloneNode(true);
    wordmark.querySelector('a').href = '/#top';
    dialog.querySelector('.wordmark').replaceWith(wordmark);
    soundButton = header.querySelector('.sound');
    if (soundButton) {
      // Reuse the live toggle and its audio state while the menu owns the header.
      soundSlot = document.createComment('sound button');
      soundButton.before(soundSlot);
      close.before(soundButton);
    }
    document.documentElement.dataset.menuOpen = '';
    dialog.dataset.input = input;
    dialog.showModal();
    if (tuningHost) dialog.append(tuningHost);
    dialog.scrollTop = 0;
    phase = 'open';
    setMenuHeartbeat(true);
    delete scene.dataset.thawPreview;
    syncScene();
    trigger.setAttribute('aria-expanded', 'true');
    if (!reduced.matches) {
      const opening = dialog.animate([{ clipPath: closedClip }, { clipPath: openClip }], motion);
      animation = opening;
      opening.finished.then(() => {
        if (animation !== opening) return;
        opening.cancel();
        animation = undefined;
      }, () => {});
    }
  }

  function closeMenu() {
    if (phase !== 'open') return;
    phase = 'closing';
    setMenuHeartbeat(false);
    cancelAnimationFrame(atmosphereFrame);
    setMenuAtmosphere(0, .56);
    if (reduced.matches) { dismiss(true); return; }
    const current = getComputedStyle(dialog).clipPath;
    animation?.cancel();
    animation = dialog.animate([{ clipPath: current === 'none' ? openClip : current }, { clipPath: closedClip }], motion);
    animation.finished.then(() => dismiss(true), () => {});
  }

  close.addEventListener('click', closeMenu);
  dialog.addEventListener('keydown', () => { dialog.dataset.input = 'keyboard'; });
  dialog.addEventListener('pointerdown', () => { dialog.dataset.input = 'pointer'; });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || link.target || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (phase === 'open') void navigate(link.href);
  });

  return {
    tuning,
    bind(root) {
      const button = root.querySelector('.header .menu');
      if (!button || bound.has(button)) return;
      bound.add(button);
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', dialog.id);
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', event => open(button, event.detail === 0 ? 'keyboard' : 'pointer'));
    },
    dismiss,
    fadeOut(timing) {
      if (!dialog.open) return;
      phase = 'selecting';
      setMenuHeartbeat(false);
      cancelAnimationFrame(atmosphereFrame);
      animation?.cancel();
      if (!reduced.matches) animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: 'forwards' });
    },
  };
}
