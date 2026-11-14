import { bindPageSound } from './site-sound.js';
import { holdHandoffInput, initScrolling } from './smooth-scrolling.js';
import { initSiteMenu } from './site-menu.js';
import { isHandheld } from './device-profile.js';
import { preserveReadingPositionOnRotation } from './rotation-scroll.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const fadeDuration = 300;
const easing = 'cubic-bezier(.42,0,.25,1)';
const intoProjectFade = { duration: 420, easing: 'cubic-bezier(.37,0,.63,1)' };
const outOfProjectFade = { duration: 360, easing };
const routes = {
  '/': () => import('./website.js'),
  '/approach/': () => import('./approach-page.js'),
  '/creative-portfolio/': () => import('./project-page.js'),
  '/echo/': () => import('./project-page.js'),
  '/pulse/': () => import('./project-page.js'),
};
const projectOrder = [
  { path: '/echo/', title: 'Echo' },
  { path: '/pulse/', title: 'Pulse' },
  { path: '/creative-portfolio/', title: 'Creative Portfolio' },
];
const pages = new Map();
const positions = new Map();
let currentPage;
let currentEntry;
let entryId = 0;
let navigation = 0;
let pending = false;
let fade;
let projectSlide;
let handoffInput;
let scrolling;
let menu;

function pagePath(url) {
  const pathname = url.pathname.replace(/\/index\.html$/, '/');
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return url.origin === location.origin && Object.hasOwn(routes, path) ? path : null;
}

function collectPage(source, url) {
  const root = document.createElement('div');
  for (const child of source.body.querySelectorAll(':scope > :is(main, footer, .header, .sound-status, .reel-dialog)')) {
    if (source !== document) {
      for (const node of [child, ...child.querySelectorAll('[href], [src], [poster]')]) {
        for (const attribute of ['href', 'src', 'poster']) {
          if (node.hasAttribute(attribute)) {
            node.setAttribute(attribute, new URL(node.getAttribute(attribute), url).href);
          }
        }
      }
    }
    root.append(child);
  }
  return {
    root,
    path: pagePath(url),
    title: source.title,
    description: source.querySelector('meta[name="description"]')?.content,
  };
}

function loadStyles(source, url) {
  return Promise.all([...source.querySelectorAll('link[rel="stylesheet"]')].map(link => {
    const href = new URL(link.getAttribute('href'), url).href;
    if ([...document.styleSheets].some(sheet => sheet.href === href)) return;
    return new Promise((resolve, reject) => {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      stylesheet.onload = resolve;
      stylesheet.onerror = () => { stylesheet.remove(); reject(new Error('Page stylesheet failed to load')); };
      document.head.append(stylesheet);
    });
  }));
}

function loadPage(path) {
  if (!pages.has(path)) {
    const url = new URL(path, location.origin);
    const loading = Promise.all([fetch(url), routes[path]()]).then(async ([response, module]) => {
      if (!response.ok) throw new Error('Page failed to load');
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!source.querySelector('main')) throw new Error('Page content missing');
      await loadStyles(source, url);
      return { ...collectPage(source, url), mount: module.mountPage };
    }).catch(error => {
      pages.delete(path);
      throw error;
    });
    pages.set(path, loading);
  }
  return pages.get(path);
}

function rememberEntry({ replace = false, url = location.href, nextCount = projectOrder.length - 1 } = {}) {
  currentEntry = ++entryId;
  history[replace ? 'replaceState' : 'pushState']({ ...history.state, atiEntry: currentEntry, atiNextCount: nextCount }, '', url);
}

function alignPage(url, position) {
  const anchor = url.hash && document.getElementById(url.hash.slice(1));
  scrolling.syncMode();
  scrolling.jumpTo(position ?? (anchor || 0));
}

function showPage(page, url, position, sliding = false) {
  if (currentPage !== page) {
    currentPage?.lifecycle.deactivate?.();
    currentPage?.root.remove();
    document.body.classList.toggle('project-page', page.path !== '/');
    document.body.classList.toggle('approach-route', page.path === '/approach/');
    document.title = page.title;
    if (page.description) document.querySelector('meta[name="description"]').content = page.description;
    document.body.prepend(page.root);
    currentPage = page;
    if (!page.lifecycle) page.lifecycle = page.mount(page.root, scrolling) ?? {};
    bindPageSound(page.root);
    menu.bind(page.root);
  }
  const index = projectOrder.findIndex(project => project.path === page.path);
  const remaining = history.state?.atiNextCount ?? projectOrder.length - 1;
  const nextProject = index >= 0 && remaining > 0 ? projectOrder[(index + 1) % projectOrder.length] : null;
  page.lifecycle.activate?.({
    nextProject,
    sliding,
    continueToNext: title => navigate(new URL(nextProject.path, location.href), { slideFrom: title }),
    preloadNext: () => { void loadPage(nextProject.path).catch(() => {}); },
  });
  alignPage(url, position);
}

async function slideProject(title, page, commit) {
  const before = title.getBoundingClientRect().top;
  const documentRoot = document.documentElement;
  const nextTitle = page.root.querySelector('.project-title');
  const distance = Math.min(210, Math.max(90, innerHeight * .24));
  documentRoot.style.setProperty('--project-slide-distance', `${distance}px`);
  documentRoot.style.setProperty('--project-slide-edge', `${Math.max(0, before - distance)}px`);
  title.dataset.handoffTitle = '';
  documentRoot.dataset.projectSlide = '';
  const transition = document.startViewTransition(() => {
    if (!commit()) return;
    nextTitle.dataset.handoffTitle = '';
  });
  projectSlide = transition;
  transition.ready.catch(() => {});
  try { await transition.finished; }
  finally {
    delete title.dataset.handoffTitle;
    delete nextTitle.dataset.handoffTitle;
    delete documentRoot.dataset.projectSlide;
    documentRoot.style.removeProperty('--project-slide-distance');
    documentRoot.style.removeProperty('--project-slide-edge');
    if (projectSlide === transition) projectSlide = undefined;
  }
}

async function navigate(url, { pop = false, slideFrom, fromMenu = false } = {}) {
  const path = pagePath(url);
  if (!path) {
    if (pop) location.reload();
    else location.assign(url);
    return;
  }
  if (!pop && pending) return;
  if (!pop && menu.tuning && !url.searchParams.has('tune')) url.searchParams.set('tune', menu.tuning);
  const revision = ++navigation;
  fade?.cancel();
  projectSlide?.skipTransition();
  handoffInput?.release();
  handoffInput = undefined;
  if (pop) menu.dismiss();
  if (path === currentPage.path && !fromMenu) {
    pending = false;
    if (!pop) rememberEntry({ url });
    alignPage(url, pop ? positions.get(currentEntry) : undefined);
    return;
  }
  pending = true;
  if (!pop) positions.set(currentEntry, scrollY);
  const handheldHandoff = Boolean(slideFrom && isHandheld());
  const sliding = Boolean(slideFrom && !handheldHandoff && document.startViewTransition && !reduceMotion.matches);
  const input = slideFrom ? holdHandoffInput({ lockScroll: !handheldHandoff }) : undefined;
  handoffInput = input;
  if (input && !handheldHandoff) scrolling.jumpTo(scrollY);
  const exit = path !== '/' ? intoProjectFade : outOfProjectFade;
  // A top-layer cover also occludes an open menu and fixed page backgrounds.
  const cover = !sliding ? document.createElement('dialog') : null;
  if (cover) {
    cover.className = 'page-transition-cover';
    cover.setAttribute('aria-label', 'Changing page');
    cover.style.cssText = 'position:fixed;inset:0;width:100%;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#f5f6f7;opacity:0;pointer-events:auto;';
    document.body.append(cover);
    cover.showModal();
    cover.addEventListener('cancel', event => event.preventDefault());
  }
  const leaving = !sliding && document.body.animate && !reduceMotion.matches
    ? cover.animate([{ opacity: 0 }, { opacity: 1 }], { ...exit, fill: 'forwards' })
    : null;
  if (cover && !leaving) cover.style.opacity = '1';
  fade = leaving;
  let committed = pop;
  try {
    const [page] = await Promise.all([
      loadPage(path),
      leaving?.finished.catch(() => {}),
      handheldHandoff ? input.quiet() : undefined,
    ]);
    if (revision !== navigation) return;
    const commit = () => {
      if (revision !== navigation) return false;
      if (!pop) {
        const nextCount = slideFrom ? Math.max(0, (history.state?.atiNextCount ?? projectOrder.length - 1) - 1) : undefined;
        rememberEntry({ url, nextCount });
        committed = true;
      }
      showPage(page, url, pop ? positions.get(currentEntry) : undefined, sliding || handheldHandoff);
      if (fromMenu) menu.dismiss();
      // Closing the menu releases overflow locking. Measure and reset scrolling
      // against the unlocked destination, rather than the outgoing page's height.
      if (fromMenu) alignPage(url, pop ? positions.get(currentEntry) : undefined);
      if (fromMenu && url.hash === '#featured-work') page.lifecycle.frameWork?.();
      const destination = fromMenu && document.getElementById(url.hash.slice(1));
      const focus = destination || page.root.querySelector(slideFrom ? '.project-title' : 'main');
      focus.tabIndex = -1;
      focus.focus({ preventScroll: true });
      positions.set(currentEntry, scrollY);
      return true;
    };
    if (sliding) await slideProject(slideFrom, page, commit);
    else {
      commit();
      // Keep the opaque cover through layout and the destination's first paint.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (revision !== navigation) return;
      alignPage(url, pop ? positions.get(currentEntry) : undefined);
      cover.style.opacity = '1';
      leaving?.cancel();
      if (!reduceMotion.matches) {
        const reveal = cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fadeDuration, easing, fill: 'forwards' });
        fade = reveal;
        await reveal.finished.catch(() => {});
      }
    }
    if (input && !handheldHandoff && revision === navigation) {
      await input.quiet();
      if (revision === navigation) {
        scrolling.jumpTo(0);
        positions.set(currentEntry, scrollY);
      }
    }
  } catch {
    if (revision === navigation) {
      if (committed) location.reload();
      else location.assign(url);
    }
  } finally {
    cover?.close();
    cover?.remove();
    leaving?.cancel();
    if (input && handoffInput === input) {
      input.release();
      handoffInput = undefined;
    }
    if (revision === navigation) pending = false;
  }
}

export function fadeToPage(href) {
  return navigate(new URL(href, location.href));
}

function fadeInPage(target = document.body) {
  fade?.cancel();
  if (reduceMotion.matches || !target.animate) return;
  fade = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: fadeDuration,
    fill: 'backwards',
    easing,
  });
}

async function start() {
  const url = new URL(location.href);
  const path = pagePath(url);
  if (!path) return;
  scrolling = initScrolling();
  menu = initSiteMenu({ scrollTo: scrolling.jumpTo, navigate: href => navigate(new URL(href), { fromMenu: true }) });
  const page = collectPage(document, url);
  document.body.prepend(page.root);
  bindPageSound(page.root);
  const { mountPage } = await routes[path]();
  page.mount = mountPage;
  pages.set(path, Promise.resolve(page));
  const initialPosition = !url.hash ? scrollY : undefined;
  showPage(page, url, initialPosition);
  preserveReadingPositionOnRotation(scrolling.jumpTo, () => currentPage?.root);
  rememberEntry({ replace: true, nextCount: history.state?.atiNextCount });
  positions.set(currentEntry, scrollY);
  history.scrollRestoration = 'manual';
  if (url.searchParams.get('tune') === 'menu') page.root.querySelector('.header .menu')?.click();

  window.addEventListener('pagehide', () => {
    // Abort an in-flight swap if this document is left or put in the back cache.
    navigation++;
    pending = false;
    fade?.cancel();
    menu.dismiss();
    projectSlide?.skipTransition();
    handoffInput?.release();
    handoffInput = undefined;
  });
  window.addEventListener('scroll', () => {
    if (!pending) positions.set(currentEntry, scrollY);
  }, { passive: true });
  window.addEventListener('popstate', event => {
    // Native fragment links can create entries without router state.
    currentEntry = event.state?.atiEntry;
    if (!currentEntry) rememberEntry({ replace: true });
    const destination = new URL(location.href);
    if (event.state?.atiEntry || pagePath(destination) !== currentPage.path || pending) {
      navigate(destination, { pop: true });
    }
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href);
    const path = pagePath(destination);
    if (!path || path === currentPage.path) return;
    event.preventDefault();
    navigate(destination);
  });
}

start();
