import { isHandheld } from './device-profile.js';

const readingAreas = [
  'main section', 'main h1', '.approach h2', '.approach-detail', '.discovery-service',
  '.featured-introduction', '.carousel-stage', '.project-shot', '.project-detail',
  '.portfolio-still', '#showreel', '#studio', '#top', 'footer',
].join(', ');

export function preserveReadingPositionOnRotation(jumpTo, activePage) {
  let landscape = innerWidth > innerHeight;
  let anchor, pending, resizeTimer, frame;
  const readingLine = () => Math.min(120, innerHeight * .32);
  const modalOpen = () => document.querySelector('dialog[open]');

  function remember() {
    frame = undefined;
    if (!isHandheld() || pending || landscape !== (innerWidth > innerHeight) || modalOpen()) return;
    const page = activePage();
    const y = readingLine();
    const element = document.elementsFromPoint(innerWidth / 2, y)
      .map(node => node.closest(readingAreas))
      .find(node => node && page?.contains(node));
    if (!element) { anchor = undefined; return; }
    const { top, height } = element.getBoundingClientRect();
    if (height > 0) anchor = { page, element, width: innerWidth, progress: (y - top) / height };
  }

  function queueSnapshot() {
    if (frame === undefined) frame = requestAnimationFrame(remember);
  }

  function restore() {
    const saved = pending;
    // The menu restores its own scroll offset when it closes. Apply the
    // rotated reading position after that restoration has finished.
    if (saved?.page === activePage() && modalOpen()) return;
    pending = undefined;
    if (saved && saved.page === activePage() && saved.element.isConnected) {
      const { top, height } = saved.element.getBoundingClientRect();
      const target = scrollY + top + height * saved.progress - readingLine();
      if (height > 0 && Math.abs(target - scrollY) > 4) jumpTo(Math.max(0, target));
    }
    queueSnapshot();
  }

  window.addEventListener('resize', () => {
    const next = innerWidth > innerHeight;
    if (next !== landscape) {
      landscape = next;
      if (isHandheld() && anchor && Math.abs(innerWidth - anchor.width) > 60) pending = anchor;
    }
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(restore, 120);
  }, { passive: true });
  document.addEventListener('close', () => {
    if (!pending) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(restore, 0);
  }, true);
  window.addEventListener('scroll', queueSnapshot, { passive: true });
  for (const event of ['pointerdown', 'wheel', 'keydown']) {
    window.addEventListener(event, () => {
      if (!modalOpen()) pending = undefined;
    }, { passive: true, capture: true });
  }
  queueSnapshot();
}
