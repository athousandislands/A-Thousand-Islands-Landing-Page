import './project-next.css';
import { readProjectSettings } from './project-settings.js';
import { portfolioPreviewTitle } from './portfolio-settings.js';
import { springStep } from './glass-carousel-model.js';

const effort = 100;
const settleDistance = 16;
const returnDelay = 135;

export function mountNextProject(main, project, navigate, preload) {
  const panel = document.createElement('section');
  panel.id = 'next-project';
  panel.className = 'project-next';
  panel.innerHTML = `
    <a class="project-next__link">
      <h2 class="project-next__title"></h2>
      <span class="project-next__row">
        <span>Next Project</span>
        <span class="project-next__track" aria-hidden="true"><span></span></span>
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3v13m-5-5 5 5 5-5"/></svg>
      </span>
    </a>`;
  const link = panel.querySelector('a');
  const title = panel.querySelector('h2');
  const slug = project.path.split('/')[1];
  title.dataset.nextProject = slug;
  function layoutTitle() {
    const { name, scale } = slug === 'creative-portfolio' ? portfolioPreviewTitle(project.title)
      : { name: project.title, scale: readProjectSettings(slug)['title-size'] / 100 };
    title.textContent = name;
    title.style.setProperty('--title-size', scale);
  }
  layoutTitle();
  link.href = project.path;
  main.append(panel);

  const events = new AbortController();
  const options = { passive: true, signal: events.signal };
  if (slug === 'creative-portfolio') window.addEventListener('resize', layoutTitle, options);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let target = 0;
  let fill = 0;
  let velocity = 0;
  let frame = 0;
  let previousTime = 0;
  let idleTimer;
  let touch;
  let pending = false;

  function remaining() {
    return Math.max(0, document.documentElement.scrollHeight - innerHeight - scrollY);
  }

  function paint(value) {
    panel.style.setProperty('--next-progress', Math.max(0, Math.min(1, value / effort)));
  }

  function animate(time) {
    const dt = Math.min(.05, (time - previousTime) / 1000);
    previousTime = time;
    [fill, velocity] = springStep(fill, velocity, target, dt, target ? 27 : 9);
    if (Math.abs(fill - target) < .12 && Math.abs(velocity) < 1) {
      fill = target;
      velocity = 0;
      frame = 0;
    } else frame = requestAnimationFrame(animate);
    paint(fill);
  }

  function setTarget(value) {
    target = Math.max(0, Math.min(effort, value));
    if (reduced.matches || pending) {
      cancelAnimationFrame(frame);
      frame = 0;
      fill = target;
      velocity = 0;
      paint(fill);
    } else if (!frame) {
      previousTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  async function commit() {
    if (pending) return;
    pending = true;
    clearTimeout(idleTimer);
    setTarget(effort);
    try { await navigate(title); }
    finally {
      if (panel.isConnected) { pending = false; setTarget(0); }
    }
  }

  function applyEffort(pixels) {
    const distance = remaining();
    const lead = Math.min(108, innerHeight * .17);
    if (distance >= lead) return;
    // Start taking up the scroll effort before the native page reaches its end.
    const weight = 1 - Math.max(0, distance - settleDistance) / lead;
    const current = pixels > 0 && !target ? fill : target;
    setTarget(current + pixels * weight);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => setTarget(0), returnDelay);
  }

  function wheel(event) {
    if (pending || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.target.closest?.('.dialkit-root, .site-menu')) return;
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    applyEffort(Math.max(-80, Math.min(80, pixels)));
    if (target === effort && remaining() <= settleDistance) void commit();
  }

  function touchStart(event) {
    touch = null;
    if (pending || event.touches.length !== 1 || event.target.closest?.('.dialkit-root, .site-menu')) return;
    const point = event.touches[0];
    touch = { x: point.clientX, y: point.clientY, lastY: point.clientY, vertical: false };
  }

  function touchMove(event) {
    if (!touch || pending || event.touches.length !== 1) { touch = null; return; }
    const point = event.touches[0];
    if (!touch.vertical) {
      const x = Math.abs(point.clientX - touch.x);
      const y = Math.abs(point.clientY - touch.y);
      if (Math.max(x, y) < 8) return;
      if (x >= y) { touch = null; return; }
      touch.vertical = true;
    }
    applyEffort(touch.lastY - point.clientY);
    touch.lastY = point.clientY;
  }

  link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void commit();
  }, { signal: events.signal });
  window.addEventListener('wheel', wheel, { ...options, capture: true });
  window.addEventListener('touchstart', touchStart, options);
  window.addEventListener('touchmove', touchMove, options);
  window.addEventListener('touchend', () => {
    if (touch && target === effort && remaining() <= settleDistance) void commit();
    touch = null;
  }, options);
  window.addEventListener('touchcancel', () => { touch = null; }, options);
  window.addEventListener('scroll', () => {
    if (pending) return;
    const distance = remaining();
    if (distance > Math.min(108, innerHeight * .17) && target) setTarget(0);
    else if (!touch && target === effort && distance <= settleDistance) void commit();
  }, options);

  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    preload();
  }, { rootMargin: '240px' });
  observer.observe(panel);

  return () => {
    events.abort();
    observer.disconnect();
    clearTimeout(idleTimer);
    cancelAnimationFrame(frame);
    panel.remove();
  };
}
