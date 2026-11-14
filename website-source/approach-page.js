import { deviceProfile, watchDeviceProfile } from './device-profile.js';
import { applyApproachSettings, readApproachProfiles } from './approach-settings.js';

const handoffMedia = matchMedia('(min-width: 1025px) and (prefers-reduced-motion: no-preference)');
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);

export function mountPage(root) {
  const page = root.querySelector('.approach-page');
  const steps = [...page.querySelectorAll('.approach-page__step')];
  let events, frame, stopProfiles, stopTuning, observer;

  function updateHandoff() {
    frame = undefined;
    if (!page.hasAttribute('data-scroll-handoff')) return;
    const readingLine = parseFloat(getComputedStyle(page).paddingTop);
    const inactive = Number(page.style.getPropertyValue('--approach-inactive-opacity') || .58);
    const tops = steps.map(step => step.getBoundingClientRect().top);
    steps.forEach((step, index) => {
      const top = tops[index];
      const previous = tops[index - 1] ?? top;
      const next = tops[index + 1] ?? top;
      const distance = top >= readingLine ? top - previous : next - top;
      const emphasis = distance > 0 ? 1 - smooth(clamp(Math.abs(readingLine - top) / distance)) : 1;
      const exit = smooth(clamp((top - 72) / Math.max(1, readingLine - 72)));
      step.style.setProperty('--approach-opacity', (inactive + emphasis * (1 - inactive)) * exit);
    });
  }

  function scheduleHandoff() {
    if (frame === undefined) frame = requestAnimationFrame(updateHandoff);
  }

  function syncHandoff() {
    page.toggleAttribute('data-scroll-handoff', handoffMedia.matches && deviceProfile() === 'desktop');
    scheduleHandoff();
  }

  function syncProfile() {
    const profile = deviceProfile();
    applyApproachSettings(page, profile, readApproachProfiles()[profile]);
    syncHandoff();
  }

  return {
    activate() {
      if (events) return;
      events = new AbortController();
      const { signal } = events;
      stopProfiles = watchDeviceProfile(syncProfile);
      syncProfile();
      window.addEventListener('scroll', scheduleHandoff, { passive: true, signal });
      window.addEventListener('resize', scheduleHandoff, { signal });
      handoffMedia.addEventListener('change', syncHandoff, { signal });
      observer = new ResizeObserver(scheduleHandoff);
      observer.observe(page);
      if (new URLSearchParams(location.search).get('tune') === 'approach') {
        import('./approach-tuning.js').then(({ mountApproachTuning }) => {
          if (!signal.aborted) stopTuning = mountApproachTuning(page, scheduleHandoff);
        });
      }
    },
    deactivate() {
      root.querySelector('.project-back').classList.remove('is-hovered', 'is-pressed');
      events?.abort();
      events = undefined;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      frame = undefined;
      stopProfiles?.();
      stopTuning?.();
      stopTuning = undefined;
    },
  };
}
