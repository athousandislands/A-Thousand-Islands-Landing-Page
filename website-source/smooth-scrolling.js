import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// A handoff consumes the rest of the gesture before giving the new page its scroll.
export function holdHandoffInput({ lockScroll = true } = {}) {
  const events = new AbortController();
  const root = document.documentElement;
  const quietTime = 180;
  let lastInput = performance.now();
  let timer;
  let resolve;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(resolve, Math.max(0, quietTime - (performance.now() - lastInput)));
  }

  function consume(event) {
    if (event.ctrlKey || event.touches?.length > 1) return;
    lastInput = performance.now();
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
    if (resolve) schedule();
  }

  const options = { capture: true, passive: false, signal: events.signal };
  if (lockScroll) root.dataset.handoffInput = '';
  window.addEventListener('wheel', consume, options);
  window.addEventListener('touchmove', consume, options);
  return {
    quiet: () => new Promise(done => { resolve = done; schedule(); }),
    release() {
      events.abort();
      clearTimeout(timer);
      delete root.dataset.handoffInput;
      resolve?.();
    },
  };
}

export function initScrolling() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scrolling;

  function syncMode() {
    const enabled = !reduced.matches && new URLSearchParams(location.search).get('scroll') !== 'native';
    if (enabled === Boolean(scrolling)) return;
    if (!enabled) {
      scrolling.destroy();
      scrolling = undefined;
      return;
    }

    // Smooth wheel scrolling; touch, pinch zoom, and keyboard stay native.
    scrolling = new Lenis({
      autoRaf: true,
      lerp: .14,
      smoothWheel: true,
      syncTouch: false,
      prevent: node => Boolean(node.closest?.('.dialkit-root')),
    });
    if (document.hidden) scrolling.stop();
  }

  reduced.addEventListener('change', syncMode);
  document.addEventListener('visibilitychange', () => {
    if (!scrolling) return;
    if (document.hidden) scrolling.stop();
    else {
      scrolling.resize();
      scrolling.start();
    }
  });

  function scrollTo(target, immediate) {
    if (scrolling) {
      if (immediate && !document.hidden) {
        // An anchor or restored history position takes over any wheel momentum.
        scrolling.stop();
        scrolling.start();
      }
      scrolling.resize();
      scrolling.scrollTo(target, { immediate, force: true });
      return;
    }

    const behavior = immediate || reduced.matches ? 'instant' : 'smooth';
    if (typeof target === 'number') window.scrollTo({ top: target, behavior });
    else target.scrollIntoView({ block: 'start', behavior });
  }

  syncMode();
  return {
    syncMode,
    jumpTo: target => scrollTo(target, true),
    scrollToTop: () => scrollTo(0, false),
  };
}
