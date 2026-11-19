import { deviceProfile, isPhoneLayout, watchDeviceProfile } from './device-profile.js';

export const titleMotionDefaults = {
  startPercent: 95,
  settlePercent: 55,
  travelPx: { desktop: 32, tablet: 28, phone: 22 },
};

export function initSectionMotion(section, { jumpTo } = {}) {
  const title = section.querySelector('h2');
  const detail = section.querySelector('.approach-detail');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let settings = titleMotionDefaults;
  let events, observer, stopDeviceWatch, detailAnimation, frame;
  let lastOffset = 0;

  function setOffset(offset) {
    if (offset === lastOffset) return;
    lastOffset = offset;
    if (offset) title.style.setProperty('--approach-title-offset', `${offset}px`);
    else title.style.removeProperty('--approach-title-offset');
  }

  function render() {
    frame = undefined;
    if (reduced.matches) {
      setOffset(0);
      return;
    }

    // Measure the stationary heading so its own motion cannot affect progress.
    const headingPercent = title.getBoundingClientRect().top * 100 / innerHeight;
    const { startPercent, settlePercent, travelPx } = settings;
    const progress = Math.min(1, Math.max(0, (startPercent - headingPercent) / (startPercent - settlePercent)));
    // Smootherstep brings both velocity and acceleration to zero at the endpoints.
    const eased = progress ** 3 * (progress * (6 * progress - 15) + 10);
    let profile = deviceProfile();
    if (isPhoneLayout()) profile = 'phone';
    else if (profile === 'desktop' && document.documentElement.hasAttribute('data-compact-layout')) profile = 'tablet';
    setOffset(travelPx[profile] * (1 - eased));
  }

  function schedule() {
    if (events && frame === undefined) frame = requestAnimationFrame(render);
  }

  function stopDetailAnimation() {
    detailAnimation?.cancel();
    detailAnimation = undefined;
  }

  return {
    activate() {
      if (events) return;
      events = new AbortController();
      const { signal } = events;
      window.addEventListener('scroll', schedule, { passive: true, signal });
      window.addEventListener('resize', schedule, { signal });
      window.addEventListener('pageshow', schedule, { signal });
      reduced.addEventListener('change', () => {
        if (reduced.matches) stopDetailAnimation();
        schedule();
      }, { signal });
      stopDeviceWatch = watchDeviceProfile(schedule);
      // The supporting copy keeps its existing entrance independently of the heading.
      if (typeof IntersectionObserver !== 'undefined' && detail?.animate) {
        observer = new IntersectionObserver(([entry]) => {
          if (events?.signal !== signal) return;
          if (!entry.isIntersecting) stopDetailAnimation();
          else if (!reduced.matches && !detailAnimation) {
            detailAnimation = detail.animate(
              [{ transform: 'translateY(18px)' }, { transform: 'translateY(0)' }],
              { duration: 650, delay: 200, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' },
            );
          }
        }, { rootMargin: '0px 0px -5% 0px' });
        observer.observe(section);
      }
      schedule();
    },
    deactivate() {
      events?.abort();
      events = undefined;
      observer?.disconnect();
      stopDeviceWatch?.();
      stopDetailAnimation();
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      setOffset(0);
    },
    update(next) {
      settings = next;
      schedule();
    },
    previewEntrance() {
      const headingTop = title.getBoundingClientRect().top + scrollY;
      const start = innerHeight * settings.startPercent / 100;
      jumpTo(Math.max(0, headingTop - start - 24));
      schedule();
    },
  };
}
