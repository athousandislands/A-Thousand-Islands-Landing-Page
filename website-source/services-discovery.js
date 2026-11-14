import { initHomepageTilt } from './homepage-tilt.js';
import { flowAt, createBloomPicker } from './homepage-glass.js';
import { DISCOVERY_DEFAULTS, savedDesktopDefaults, clamp, smooth, surfaceArrival, easeSurface, nearestService, cycleProgress } from './services-discovery-model.js';

export function initServicesDiscovery({ playSound = () => {} } = {}) {
  const scene = document.querySelector('.services-discovery');
  if (!scene) return;
  const surface = scene.querySelector('.discovery-surface');
  const pickBloom = createBloomPicker();
  const stage = scene.querySelector('.discovery-stage');
  const colours = [...scene.querySelectorAll('.discovery-colours')];
  const tilt=initHomepageTilt(scene,stage,colours[0],{services:true});
  const cue = scene.querySelector('.discovery-cue');
  const rings = [...scene.querySelectorAll('.discovery-ring')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let config = structuredClone(DISCOVERY_DEFAULTS);
  let frame = 0, near = false, visible = false, dirty = true, insideVisit = false;
  let lastNow = 0, lastTick = 0, lastPaint = 0, activeTime = 0, gesture = null, rippleAnimations = [];
  let targetSurface = 0, surfaceAlpha = 0;
  let portrait = false;
  let arrivalAt = null;
  const engagementKey = 'studio-services-engaged';
  let engaged = false;
  try { engaged = sessionStorage.getItem(engagementKey) === 'true'; } catch { /* Storage is optional. */ }
  const states = [...scene.querySelectorAll('.discovery-service')].map(root => ({
    root, button: root.querySelector('.discovery-heading'), list: root.querySelector('.discovery-list'),
    clear: root.querySelector('.discovery-word-clear'), soft: root.querySelector('.discovery-word-soft'),
    phase: 'closed', animations: [], timer: 0, expiresAt: 0, revision: 0,
  }));

  // Each prompt belongs to one service and survives visits until that service is used.
  states.forEach(state => {
    if (!cue.cloneNode) return;
    state.cue = cue.cloneNode(true);
    state.cue.classList.remove('discovery-cue');
    state.cue.classList.add('service-touch-cue');
    const label = document.createElement('span');
    label.className = 'service-reveal-label';
    label.textContent = matchMedia('(any-pointer: coarse)').matches ? 'Touch to reveal' : 'Click to reveal';
    state.cue.append(label);
    try { if (sessionStorage.getItem(engagementKey + '-' + states.indexOf(state)) === 'true') state.root.dataset.engaged = 'true'; } catch {}
    state.root.append(state.cue);
  });

  function requestFrame() {
    if (!frame && (near || surfaceAlpha > 0) && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function requestLayout() { dirty = true; requestFrame(); }
  function stopRipple() { rippleAnimations.forEach(animation => animation.cancel()); rippleAnimations = []; }
  function stopRows(state) { state.animations.forEach(animation => animation.cancel()); state.animations = []; }
  function animateRows(state, opening) {
    const rows = [...state.list.children];
    const initial = rows.map(row => state.list.hidden ? '0' : getComputedStyle(row).opacity);
    stopRows(state); state.list.hidden = false;
    state.animations = rows.map((row, index) => {
      const order = opening ? index : rows.length - 1 - index;
      const from = initial[index];
      const frames = reduced.matches ? [{ opacity: from }, { opacity: opening ? 1 : 0 }] : [
        { opacity: from, filter: `blur(${opening ? 1.5 : 0}px)`, transform: `translateY(${opening ? 7 : 0}px)` },
        { opacity: opening ? 1 : 0, filter: `blur(${opening ? 0 : 1.5}px)`, transform: `translateY(${opening ? 0 : 5}px)` },
      ];
      return row.animate(frames, {
        duration: reduced.matches ? 120 : (opening ? config.reveal.appear : config.reveal.conceal) * 1000,
        delay: reduced.matches ? 0 : order * (opening ? config.reveal.stagger : config.reveal.concealStagger) * 1000,
        easing: opening ? 'cubic-bezier(.22, .61, .36, 1)' : 'ease-in-out', fill: 'both',
      });
    });
    return Promise.all(state.animations.map(animation => animation.finished));
  }
  function closeImmediately(state) {
    ++state.revision; clearTimeout(state.timer); state.timer = 0;
    stopRows(state); state.phase = 'closed'; state.expiresAt = 0;
    state.list.hidden = true; state.root.dataset.open = 'false'; state.button.setAttribute('aria-expanded', 'false');
  }
  function conceal(state) {
    clearTimeout(state.timer); state.timer = 0;
    if (state.phase === 'closed') return;
    if (!visible || document.hidden) { closeImmediately(state); return; }
    const revision = ++state.revision; state.phase = 'closing';
    animateRows(state, false).then(() => { if (state.revision === revision) closeImmediately(state); }, () => {});
  }
  function startReading(state) {
    clearTimeout(state.timer);
    state.expiresAt = Date.now() + config.reveal.reading * 1000;
    state.timer = setTimeout(() => conceal(state), config.reveal.reading * 1000);
  }
  function reveal(state) {
    if (state.phase === 'open') { startReading(state); return; }
    if (state.phase === 'opening') return;
    clearTimeout(state.timer); state.timer = 0;
    const revision = ++state.revision;
    state.phase = 'opening'; state.root.dataset.open = 'true';
    state.button.setAttribute('aria-expanded', 'true');
    animateRows(state, true).then(() => {
      if (state.revision !== revision) return;
      state.phase = 'open'; stopRows(state); startReading(state);
    }, () => {});
  }
  function rippleAt(x, y) {
    stopRipple();
    const rgb = pickBloom();
    rings.slice(0, 1).forEach(ring => {
      ring.style.setProperty('--bloom-colour', rgb.join(' '));
      ring.style.setProperty('--bloom-highlight', rgb.map(value => Math.round(value + (255 - value) * .2)).join(' '));
      ring.style.left = `${x}px`; ring.style.top = `${y}px`;
      const scale = config.bloom.size;
      const frames = reduced.matches ? [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: config.bloom.strength * .5 },
        { opacity: 0 },
      ] : [
        { opacity: 0, transform: `translate(-50%, -50%) scale(${.12 * scale})` },
        { opacity: config.bloom.strength, transform: `translate(-50%, -50%) scale(${.7 * scale})`, offset: .24 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${1.8 * scale})` },
      ];
      rippleAnimations.push(ring.animate(frames, {
        duration: reduced.matches ? 600 : config.bloom.duration * 1000,
        easing: 'ease-out', fill: 'forwards',
      }));
    });
  }
  function beginVisit() {
    insideVisit = true; lastNow = 0;
    if (surfaceAlpha < .001) arrivalAt = null;
    scene.dataset.arrival = arrivalAt === null ? 'text' : 'colour';
    scene.dataset.engaged = String(engaged);
  }
  function endVisit() {
    insideVisit = false; states.forEach(closeImmediately); stopRipple();
  }
  function layout() {
    dirty = false;
    const box = scene.getBoundingClientRect();
    const height = window.visualViewport?.height || innerHeight;
    // Keep colour alive behind Services; move its feathered boundary with the
    // section instead of fading the whole viewport as the user scrolls past.
    surface.style.setProperty('--services-edge', `${box.bottom}px`);
    targetSurface = box.bottom > -340 ? surfaceArrival(box.top, height, config.surface.transitionDistance) : 0;
    scene.dataset.targetProgress = targetSurface.toFixed(3);
    // The scroll stage can stay tall in landscape. The material fills the viewport.
    portrait = surface.clientHeight > surface.clientWidth;
    scene.dataset.format = portrait ? 'portrait' : 'landscape';
    if (!insideVisit && box.top < height * .95 && box.bottom > height * .1) beginVisit();
    else if (insideVisit && (box.top >= height || box.bottom <= 0)) endVisit();
    if (insideVisit && arrivalAt === null && box.top <= height * config.arrival.start) {
      arrivalAt = performance.now(); scene.dataset.arrival = 'warming';
    }
  }
  function paintFlow() {
    const progress = cycleProgress(activeTime, config.flow.period);
    const [x, y, angle, scale] = flowAt(progress, portrait);
    const movement=config.flow.movement*tilt.flowAmount();
    for (const colour of colours) colour.style.transform = `translate3d(${x * movement}%, ${y * movement}%, 0) rotate(${angle * movement}deg) scale(${1 + (scale - 1) * movement})`;
    for (const [index, state] of states.entries()) {
      const phase = index * 1.9;
      const fx = 50 + (x * 3.5 + Math.sin(progress * Math.PI * 4 + phase) * 28) * config.focus.drift;
      const fy = 50 + (y * 2 + Math.cos(progress * Math.PI * 3 + phase) * 24) * config.focus.drift;
      state.clear.style.maskPosition = `${fx}% ${fy}%, 0 0`;
      state.soft.style.opacity = state.phase === 'closed' ? String(config.focus.softInk * (.8 + .2 * Math.sin(progress * Math.PI * 4 + phase))) : '0';
    }
  }
  function tick(now) {
    frame = 0;
    if ((!near && surfaceAlpha === 0) || document.hidden) return;
    const elapsed = lastTick ? Math.min(64, now - lastTick) : 16;
    lastTick = now;
    if (dirty) layout();
    surfaceAlpha = easeSurface(surfaceAlpha, targetSurface, elapsed, reduced.matches ? 0 : config.surface.smoothing);
    visible = surfaceAlpha > .001 || targetSurface > .001;
    scene.dataset.visible = String(visible);
    scene.dataset.surfaceProgress = surfaceAlpha.toFixed(3);
    const arrival = arrivalAt === null ? 0 : reduced.matches ? 1 : smooth((now - arrivalAt - config.arrival.delay * 1000) / Math.max(1, config.arrival.fade * 1000));
    // A visually imperceptible prepaint prepares the graphics while the text is already present.
    const material = surfaceAlpha * Math.max(.001, arrival);
    surface.style.opacity = String(material);
    scene.dataset.materialProgress = material.toFixed(3);
    if (arrival === 1) scene.dataset.arrival = 'colour';
    let headingsComplete = true;
    states.forEach((state, index) => {
      const elapsed = arrivalAt === null ? -Infinity : (now - arrivalAt) / 1000 - config.arrival.delay;
      const progress = arrivalAt === null ? 0 : reduced.matches ? 1 : smooth((elapsed - config.arrival.headingDelay - index * config.arrival.headingStagger) / Math.max(.01, config.arrival.headingFade));
      state.headingProgress = progress;
      state.root.style.opacity = String(progress);
      state.root.style.visibility = progress > 0 ? 'visible' : 'hidden';
      state.button.disabled = progress < .98;
      headingsComplete &&= progress === 1;
    });

    cue.style.opacity = String(headingsComplete ? clamp((material - .4) / .4) : 0);
    if (!visible) {
      lastNow = lastTick = 0;
      if (!insideVisit) arrivalAt = null;
      stopRipple();
      // Text must finish its finite entrance even when the earlier gradient exit
      // has already cleared the material during a fast scroll.
      if (insideVisit && arrivalAt !== null && !headingsComplete) requestFrame();
      return;
    }
    if (!reduced.matches) {
      if (lastNow) activeTime += Math.min(100, now - lastNow);
      lastNow = now;
      if (now - lastPaint >= 32) { paintFlow(); lastPaint = now; }
    }
    if (surfaceAlpha !== targetSurface || (!reduced.matches && (config.flow.movement || config.focus.drift || (arrivalAt !== null && (arrival < 1 || !headingsComplete))))) requestFrame();
  }

  stage.addEventListener('pointerdown', event => {
    scene.dataset.input = 'pointer';
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, valid: event.isPrimary !== false, type: event.pointerType };
  });
  stage.addEventListener('pointermove', event => {
    if (gesture?.id === event.pointerId && gesture.type !== 'mouse' && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) gesture.valid = false;
  });
  stage.addEventListener('pointercancel', () => { if (gesture) gesture.valid = false; });
  stage.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') gesture = null; });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') scene.dataset.input = 'keyboard'; }, true);
  stage.addEventListener('click', event => {
    if (gesture && !gesture.valid) { gesture = null; return; }
    if (window.getSelection?.()?.toString()) { gesture = null; return; }
    const selected = event.target.closest('.discovery-heading');
    let x = event.clientX, y = event.clientY;
    if (event.detail === 0 && selected) {
      const bounds = selected.getBoundingClientRect(); x = bounds.left + bounds.width / 2; y = bounds.top + bounds.height / 2;
    }
    const index = selected ? states.findIndex(state => state.button === selected) : nearestService(x, y, states.map(state => state.button.getBoundingClientRect()));
    if (index < 0) return;
    if (states[index].headingProgress < .98) return;
    states[index].root.dataset.engaged = 'true';
    engaged = true; scene.dataset.engaged = 'true';
    try { sessionStorage.setItem(engagementKey, 'true'); sessionStorage.setItem(engagementKey + '-' + index, 'true'); } catch { /* Current visit still remembers. */ }
    rippleAt(x, y);
    reveal(states[index]); playSound(); gesture = null;
  });

  states.forEach(closeImmediately);
  states.forEach(state => { state.headingProgress = 0; state.root.style.opacity = '0'; state.root.style.visibility = 'hidden'; state.button.disabled = true; });
  paintFlow();
  scene.classList.add('is-enhanced'); scene.dataset.visible = 'false'; scene.dataset.input = 'pointer'; scene.dataset.palette = 'homepage'; scene.dataset.engaged = String(engaged);
  window.addEventListener('scroll', requestLayout, { passive: true });
  window.addEventListener('resize', requestLayout, { passive: true });
  window.visualViewport?.addEventListener('resize', requestLayout, { passive: true });
  const sizeObserver = new ResizeObserver(requestLayout); sizeObserver.observe(scene); sizeObserver.observe(stage);
  new IntersectionObserver(entries => {
    near = entries[0].isIntersecting;
    scene.dataset.near = String(near);
    if (near) requestLayout();
    else {
      targetSurface = 0; scene.dataset.targetProgress = '0.000'; endVisit();
      // Finish the fade even after a fast fling carries the scene beyond the prewarm area.
      if (surfaceAlpha > 0) requestFrame();
      else {
        cancelAnimationFrame(frame); frame = 0; lastNow = lastTick = 0;
        visible = false; surface.style.opacity = '0'; scene.dataset.visible = 'false';
      }
    }
  }, { rootMargin: '50% 0px' }).observe(scene);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastNow = lastTick = 0; stopRipple(); }
    else {
      for (const state of states) if (state.expiresAt && Date.now() >= state.expiresAt) closeImmediately(state);
      requestLayout();
    }
  });
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame); frame = 0; lastNow = lastTick = 0; stopRipple(); requestLayout();
  });
  const api = {
    configure(values) {
      config = values;
      const css = {
        '--surface-frost': config.surface.frost, '--surface-grain': config.surface.grain, '--surface-veil': config.surface.veil,
        '--colour-strength': config.surface.colourStrength, '--heading-clarity': config.focus.clarity, '--heading-blur': `${config.focus.blur}px`, '--soft-ink': config.focus.softInk,
        '--colour-saturation': config.colour.saturation,
        '--pool-spread': config.flow.spread,
        '--desktop-type': `${config.type.desktopSize}svh`, '--phone-type': `${config.type.phoneSize}svmin`, '--list-scale': config.type.listScale,
        '--title-tracking': `${config.type.tracking}em`, '--phone-title-tracking': `${config.type.phoneTracking}em`,
        '--title-leading': config.type.leading, '--phone-title-leading': config.type.phoneLeading,
        '--list-heading-gap': `${config.spacing.headingGap}px`, '--list-item-gap': `${config.spacing.itemGap}px`,
        '--phone-list-heading-gap': `${config.spacing.phoneHeadingGap}px`, '--phone-list-item-gap': `${config.spacing.phoneItemGap}px`,
        '--discovery-height': `${config.spacing.sceneHeight}svh`, '--phone-discovery-height': `${config.spacing.phoneSceneHeight}svh`,
        '--phone-min-height': `${config.spacing.phoneMinHeight}px`,
      };
      for (const [key, value] of Object.entries(css)) scene.style.setProperty(key, String(value));
      for (const [key, value] of Object.entries(config.colour)) if (typeof value === 'string') scene.style.setProperty(`--glass-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value);
      const positions = [['digitalExperiences', 'digital'], ['visual', 'visual'], ['direction', 'direction'], ['phoneDigitalExperiences', 'phone-digital'], ['phoneVisual', 'phone-visual'], ['phoneDirection', 'phone-direction']];
      for (const [key, prefix] of positions) {
        scene.style.setProperty(`--${prefix}-inset`, `${config[key].inset}%`);
        scene.style.setProperty(`--${prefix}-top`, `${config[key].top}%`);
      }
      requestLayout();
    },
    revealAll() {
      arrivalAt = performance.now() - (config.arrival.delay + Math.max(config.arrival.fade, config.arrival.headingDelay + (states.length - 1) * config.arrival.headingStagger + config.arrival.headingFade) + .02) * 1000;
      scene.dataset.engaged = 'true'; requestLayout(); states.forEach(reveal); playSound();
    },
    concealAll() { states.forEach(conceal); },
    explore() { window.scrollTo({ top: scrollY + scene.getBoundingClientRect().top, behavior: 'instant' }); },
    transition() {
      arrivalAt = null; scene.dataset.arrival = 'text'; scene.dataset.engaged = String(engaged); states.forEach(closeImmediately);
      window.scrollTo({ top: scrollY + scene.getBoundingClientRect().top - innerHeight * .85, behavior: 'instant' });
      requestLayout();
    },
  };
  api.configure(savedDesktopDefaults());
  if (import.meta.env?.DEV && new URLSearchParams(location.search).get('tune') === 'services') {
    import('./services-discovery-tuning.js').then(({ mountDiscoveryTuning }) => mountDiscoveryTuning(api));
  }
  requestLayout();
  return api;
}
