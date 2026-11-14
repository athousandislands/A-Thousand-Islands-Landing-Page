import { isPhoneLayout, watchDeviceProfile } from './device-profile.js';

// Measured from Lusion's Featured Work entrance: the easing, character travel,
// rotation, stagger and line timings are reproduced without its WebGL runtime.
const TEXT_EASING = 'cubic-bezier(.35,0,0,1)';

export function initFeaturedWork({ jumpTo = target => target.scrollIntoView({ block:'start', behavior:'instant' }) } = {}) {
  const section = document.querySelector('.featured-work');
  if (!section) return;
  let keepPreviewAnchor=location.hash==='#featured-work';
  const stopAnchoring=()=>{keepPreviewAnchor=false;};
  for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,stopAnchoring,{once:true,passive:true});
  const alignPreview=()=>{if(keepPreviewAnchor)requestAnimationFrame(()=>{if(keepPreviewAnchor)jumpTo(section);});};
  window.addEventListener('load',alignPreview,{once:true});
  const title = section.querySelector('.featured-title');
  const copy = section.querySelector('.featured-copy');
  const copyText = copy.textContent.trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const titleText = title.textContent.trim();
  title.setAttribute('aria-label', titleText);
  title.replaceChildren();
  for (const [index, word] of titleText.split(/\s+/).entries()) {
    if (index) title.append(document.createTextNode(' '));
    const span = document.createElement('span');
    span.className = 'featured-title-word'; span.setAttribute('aria-hidden', 'true');
    for (const character of word) {
      const glyph = document.createElement('span');
      glyph.className = 'featured-title-char'; glyph.textContent = character; span.append(glyph);
    }
    title.append(span);
  }
  const groups = [
    { kind: 'title', root: title, nodes: [...title.querySelectorAll('.featured-title-char')] },
    { kind: 'copy', root: copy, nodes: [] },
  ];
  for (const group of groups) Object.assign(group, { entered: false, animations: [], revision: 0 });

  function settle(group) {
    ++group.revision;
    for (const animation of group.animations) animation.cancel();
    group.animations = [];
    for (const node of group.nodes) node.style.transform = '';
    group.root.dataset.arrival = 'settled';
  }
  function prepare(group) {
    settle(group);
    if (reduced.matches || isPhoneLayout()) return;
    for (const node of group.nodes) node.style.transform = 'translate3d(0,100%,0)';
    group.root.dataset.arrival = 'waiting';
  }
  function animate(group) {
    if (group.entered) return;
    group.entered = true;
    if (reduced.matches || isPhoneLayout()) { settle(group); return; }
    const revision = ++group.revision;
    const play = () => {
      if (group.revision !== revision) return;
      group.root.dataset.arrival = 'entering';
        group.animations = group.nodes.map((node, index) => node.animate([
          { transform: group.kind === 'title' ? 'translate3d(0,1em,0) rotate(10deg)' : 'translate3d(0,100%,0)' },
          { transform: group.kind === 'title' ? 'translate3d(0,0em,0) rotate(0deg)' : 'translate3d(0,0%,0)' },
        ], {
          duration: group.kind === 'title' ? 1000 / 1.5 : 1000,
          delay: index * (group.kind === 'title' ? 1000 / 30 : 50), easing: TEXT_EASING, fill: 'both',
        }));
      Promise.all(group.animations.map(animation => animation.finished)).then(() => {
        if (group.revision === revision) settle(group);
      }, () => {});
    };
    play();
  }
  function splitCopy() {
    const group = groups[1];
    settle(group); copy.replaceChildren();
    const words = copyText.split(/\s+/).map((word, index) => {
      if (index) copy.append(document.createTextNode(' '));
      const node = document.createElement('span'); node.textContent = word; node.style.display = 'inline-block'; copy.append(node);
      return node;
    });
    const lines = [];
    let lastTop = -Infinity;
    for (const node of words) {
      const top = node.getBoundingClientRect().top;
      if (Math.abs(top - lastTop) > 1) { lines.push([]); lastTop = top; }
      lines.at(-1).push(node.textContent);
    }
    copy.replaceChildren(); group.nodes = [];
    lines.forEach((words, index) => {
      const clip = document.createElement('span'); clip.className = 'featured-copy-clip';
      const line = document.createElement('span'); line.className = 'featured-copy-line';
      line.textContent = words.join(' ') + (index < lines.length - 1 ? ' ' : '');
      clip.append(line); copy.append(clip); group.nodes.push(line);
    });
    if (!group.entered) prepare(group);
  }
  splitCopy();
  groups.forEach(prepare);
  const observer = new IntersectionObserver(entries => {
    const sectionEntry = entries.find(entry => entry.target === section);
    if (sectionEntry && !sectionEntry.isIntersecting) {
      for (const group of groups) { group.entered = false; prepare(group); }
      return;
    }
    if (entries.some(entry => entry.target === introduction && entry.isIntersecting)) groups.forEach(animate);
  });
  const introduction = section.querySelector('.featured-introduction');
  observer.observe(section); observer.observe(introduction);
  let resizeFrame = 0;
  const resize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      splitCopy();
      for (const group of groups) group.entered ? settle(group) : prepare(group);
      alignPreview();
    });
  };
  window.addEventListener('resize', resize, { passive: true });
  document.fonts?.ready.then(() => {
    if (!groups[1].entered) splitCopy();
    // Reconcile a direct preview anchor after font and Services sizing have settled.
    alignPreview();
  });
  reduced.addEventListener('change', resize);
  watchDeviceProfile(resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) groups.filter(group => group.entered).forEach(settle);
  });
}
