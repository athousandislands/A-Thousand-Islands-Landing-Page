import test from 'node:test';
import assert from 'node:assert/strict';
import { initServicesDiscovery } from '../website-source/services-discovery.js';
import { DISCOVERY_DEFAULTS, surfaceEnvelope, surfaceArrival, easeSurface, nearestService, cycleProgress } from '../website-source/services-discovery-model.js';

test('full-page surface fades continuously in and out, with no colour before entry', () => {
  assert.equal(surfaceEnvelope(800, 1600, 800), 0);
  const amounts = [800, 600, 400, 200, 0].map(top => surfaceEnvelope(top, top + 800, 800));
  assert.ok(amounts.every((value, i) => i === 0 || value >= amounts[i - 1]));
  assert.equal(amounts.at(-1), 1);
  assert.equal(surfaceEnvelope(-800, 0, 800), 0);
  assert.ok(surfaceEnvelope(-600, 200, 800) > 0);
  assert.ok(Math.abs(cycleProgress(0, 24) - cycleProgress(24_000, 24)) < 1e-12);
});
test('scroll fade absorbs abrupt wheel steps, stays bounded, and is independent of frame rate', () => {
  const first = easeSurface(0, 1, 16, .12);
  assert.ok(first > 0 && first < .15);
  assert.ok(Math.abs(easeSurface(first, 1, 16, .12) - easeSurface(0, 1, 32, .12)) < 1e-12);
  assert.ok(easeSurface(first, 0, 16, .12) < first);
  assert.equal(easeSurface(0, 1, 16, 0), 1);
  assert.equal(easeSurface(.0001, 0, 16, .12), 0);
});
test('Services colour retains its intensity while the spatial boundary leaves the viewport', () => {
  assert.equal(surfaceArrival(800,800),0);
  assert.equal(surfaceArrival(0,800),1);
  for (const top of [-40,-160,-400,-700]) assert.equal(surfaceArrival(top,800),1);
});
test('nearby blank-surface taps choose the nearest heading', () => {
  const boxes = [{ left: 500, right: 1000, top: 100, bottom: 200 }, { left: 50, right: 400, top: 300, bottom: 400 }, { left: 550, right: 1000, top: 550, bottom: 650 }];
  assert.equal(nearestService(100, 440, boxes), 1);
  assert.equal(nearestService(800, 680, boxes), 2);
  assert.equal(nearestService(790, 190, boxes), 0);
});

function fixture(t, reduce = false) {
  let now = 0, id = 0, sounds = 0;
  const timers = new Map(), frames = new Map(), observers = [], animations = [];
  const originals = new Map();
  function replace(key, value) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  class Node {
    constructor() { this.style = { setProperty(key, value) { this[key] = value; } }; this.dataset = {}; this.attrs = {}; this.events = {}; this.classList = { add() {} }; this.hidden = false; }
    addEventListener(type, fn) { (this.events[type] ??= []).push(fn); }
    fire(type, event = {}) { for (const fn of this.events[type] ?? []) fn(event); }
    setAttribute(key, value) { this.attrs[key] = value; }
    getBoundingClientRect() { return this.box; }
    closest(selector) { return selector === '.discovery-heading' && this.isHeading ? this : null; }
    animate(keyframes, options) {
      let resolve, reject;
      const record = { node: this, keyframes, options, cancelled: false, finished: new Promise((yes, no) => { resolve = yes; reject = no; }) };
      const handle = setTimeout(resolve, options.duration + (options.delay || 0));
      record.cancel = () => { record.cancelled = true; clearTimeout(handle); reject(new Error('cancelled')); };
      // Native cancellation can reject finished even when nobody consumes a decorative ripple's promise.
      record.finished.catch(() => {});
      animations.push(record); return record;
    }
  }
  const scene = new Node(), stage = new Node(), surface = new Node(), cue = new Node(), frost = new Node();
  scene.box = { top: 0, bottom: 800, height: 800 };
  stage.box = { left: 0, top: 0, width: 1200, height: 800 };
  stage.clientWidth = 1200; stage.clientHeight = 800;
  surface.clientWidth = 1200; surface.clientHeight = 800;
  const colours = [new Node()], rings = [new Node(), new Node()];
  const roots = Array.from({ length: 3 }, (_, index) => {
    const root = new Node(), button = new Node(), list = new Node(), clear = new Node(), soft = new Node();
    list.children = Array.from({ length: 4 }, () => new Node());
    button.isHeading = true;
    button.box = { left: index % 2 ? 50 : 500, right: index % 2 ? 400 : 1000, top: 100 + index * 220, bottom: 200 + index * 220, width: 500, height: 100 };
    root.parts = { '.discovery-heading': button, '.discovery-list': list, '.discovery-word-clear': clear, '.discovery-word-soft': soft };
    root.querySelector = key => root.parts[key];
    return root;
  });
  scene.querySelector = key => ({ '.discovery-surface': surface, '.discovery-stage': stage, '.discovery-frost': frost, '.discovery-cue': cue })[key];
  scene.querySelectorAll = key => ({ '.discovery-colours': colours, '.discovery-ring': rings, '.discovery-service': roots })[key];
  const document = new Node(); document.hidden = false; document.querySelector = () => scene;
  const window = new Node(); window.getSelection = () => ({ toString: () => '' });
  const storage = new Map();
  replace('document', document); replace('window', window); replace('innerHeight', 800);
  replace('sessionStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) });
  replace('matchMedia', () => ({ matches: reduce, addEventListener() {} }));
  replace('performance', { now: () => now });
  const realDateNow = Date.now; Date.now = () => 1_800_000_000_000 + now;
  replace('getComputedStyle', () => ({ opacity: '1' }));
  replace('requestAnimationFrame', fn => { const key = ++id; frames.set(key, fn); return key; });
  replace('cancelAnimationFrame', key => frames.delete(key));
  replace('setTimeout', (fn, delay) => { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; });
  replace('clearTimeout', key => timers.delete(key));
  replace('ResizeObserver', class { observe() {} });
  replace('IntersectionObserver', class { constructor(fn) { observers.push(fn); } observe() {} });
  t.after(() => { Date.now = realDateNow; for (const [key, value] of originals) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; } });
  const api = initServicesDiscovery({ playSound: () => ++sounds });
  // Fixed timing fixture: interaction contracts are independent of tuned project defaults.
  const config = structuredClone(DISCOVERY_DEFAULTS);
  config.arrival = {start:.15,delay:.25,fade:.9,headingDelay:0,headingStagger:.2,headingFade:.65};
  config.surface = {...config.surface,transitionDistance:.6,exitDistance:.85,smoothing:.12};
  config.reveal = {...config.reveal,appear:.95,reading:7};
  api.configure(config);
  observers[0]([{ isIntersecting: true }]);
  async function advance(ms) {
    const until = now + ms;
    while (now < until) {
      now = Math.min(until, now + 16);
      for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); }
      for (const [key, fn] of [...frames]) { frames.delete(key); fn(now); }
      await Promise.resolve(); await Promise.resolve();
    }
  }
  const tap = index => stage.fire('click', { target: roots[index].parts['.discovery-heading'], detail: 0, clientX: 0, clientY: 0 });
  return { scene, stage, roots, surface, rings, animations, frames, document, window, advance, tap, intersect: value => observers[0]([{isIntersecting:value}]), sounds: () => sounds };
}

test('the fixed material uses the viewport shape even when the scroll stage stays tall', async t => {
  const f = fixture(t);
  f.stage.clientHeight = 880;
  f.stage.clientWidth = f.surface.clientWidth = 393;
  f.surface.clientHeight = 852;
  await f.advance(32);
  assert.equal(f.scene.dataset.format, 'portrait');

  f.stage.clientWidth = f.surface.clientWidth = 852;
  f.surface.clientHeight = 393;
  f.window.fire('resize');
  await f.advance(32);
  assert.equal(f.scene.dataset.format, 'landscape');
});

test('headings appear in order with colour after entry and the configured delay', async t => {
  const f = fixture(t);
  f.scene.box = {top:400,bottom:1200,height:800};
  await f.advance(2000);
  assert.ok(Number(f.surface.style.opacity) <= .001, 'only an imperceptible prepaint before entry');
  assert.equal(f.scene.dataset.arrival, 'text');
  assert.ok(f.roots.every(root => root.style.opacity === '0'));
  f.scene.box = {top:0,bottom:800,height:800}; f.window.fire('scroll');
  await f.advance(240);
  assert.ok(Number(f.surface.style.opacity) <= .001, 'colour waits while text is already present');
  assert.ok(f.roots.every(root => root.style.opacity === '0'));
  await f.advance(450);
  assert.ok(Number(f.surface.style.opacity) > .1 && Number(f.surface.style.opacity) < 1);
  const opacity = f.roots.map(root => Number(root.style.opacity));
  assert.ok(opacity[0] > opacity[1] && opacity[1] > opacity[2], 'Visual, Direction, Digital fade in on successive beats');
  await f.advance(700);
  assert.equal(f.surface.style.opacity, '1');
  assert.equal(f.scene.dataset.arrival, 'colour');
  assert.ok(f.roots.every(root => root.style.opacity === '1'));
  assert.ok(f.roots.every(root=>root.parts['.discovery-list'].hidden));
});

test('fast arrival past the gradient exit still reveals every service and permits interaction', async t => {
  const f = fixture(t);
  f.scene.box = { top:-160, bottom:640, height:800 };
  f.window.fire('scroll');
  await f.advance(3000);
  assert.equal(f.surface.style.opacity, '1');
  assert.equal(f.surface.style['--services-edge'], '640px');
  assert.ok(f.roots.every(root => root.style.opacity === '1'), 'text must finish arriving even after the gradient stops');
  assert.ok(f.roots.every(root => root.parts['.discovery-heading'].disabled === false));
  f.tap(2); await f.advance(1500);
  assert.equal(f.roots[2].parts['.discovery-list'].hidden, false);
  f.scene.box = {top:-900,bottom:-100,height:800}; f.intersect(false);
  await f.advance(2000);
  assert.equal(f.frames.size, 0, 'rendering stops after Services leaves');
});

test('cue persists before engagement; lists stay hidden until tapped, then get seven readable seconds', async t => {
  const f = fixture(t); await f.advance(10_000);
  assert.ok(f.roots.every(root => root.parts['.discovery-list'].hidden));
  assert.equal(f.scene.dataset.engaged, 'false');
  assert.equal(f.sounds(), 0);
  f.tap(0); await f.advance(1500);
  assert.equal(f.scene.dataset.engaged, 'true');
  assert.equal(f.roots[0].parts['.discovery-list'].hidden, false);
  const rows = f.roots[0].parts['.discovery-list'].children;
  assert.deepEqual(f.animations.filter(record => rows.includes(record.node)).map(record => record.options.delay), [0, 160, 320, 480]);
  await f.advance(6500);
  assert.equal(f.roots[0].parts['.discovery-list'].hidden, false);
  await f.advance(1900);
  assert.equal(f.roots[0].parts['.discovery-list'].hidden, true);
  assert.equal(f.sounds(), 1);
  const ripple = f.animations.filter(record => f.rings.includes(record.node));
  assert.equal(ripple.length, 1);
  assert.ok(f.rings[0].style['--bloom-colour'], 'uses the homepage colour picker');
  assert.ok(ripple.every(record => record.keyframes.every(frame => Object.keys(frame).every(key => ['opacity', 'transform', 'offset'].includes(key)))), 'bloom animation uses only opacity and transforms');
});

test('touch scrolls and cancelled gestures do not dismiss the cue, reveal text, or play sounds', async t => {
  const f = fixture(t); await f.advance(16);
  f.stage.fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100, isPrimary: true });
  f.stage.fire('pointermove', { pointerId: 1, clientX: 100, clientY: 140 });
  f.tap(0); await f.advance(1500);
  assert.equal(f.sounds(), 0); assert.equal(f.roots[0].parts['.discovery-list'].hidden, true);
  f.stage.fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 100, isPrimary: true });
  f.stage.fire('pointercancel'); f.tap(0);
  assert.equal(f.sounds(), 0);
  f.stage.fire('keydown', { key: 'Enter' }); f.tap(0); await f.advance(1500);
  assert.equal(f.roots[0].parts['.discovery-list'].hidden, false);
});

test('section re-entry preserves the homepage palette and restores the discovery cue', async t => {
  const f = fixture(t); await f.advance(1000);
  assert.equal(f.scene.dataset.palette, 'homepage'); f.tap(1); await f.advance(1500);
  const before = Number(f.scene.dataset.surfaceProgress);
  f.scene.box = { top: 800, bottom: 1600, height: 800 }; f.window.fire('scroll'); await f.advance(32);
  assert.equal(f.scene.dataset.targetProgress, '0.000');
  assert.ok(Number(f.scene.dataset.surfaceProgress) < before && Number(f.scene.dataset.surfaceProgress) > 0, 'exit eases toward the scroll target');
  await f.advance(1200);
  assert.equal(f.surface.style.opacity, '0'); assert.equal(f.frames.size, 0);
  assert.ok(f.roots.every(root => root.parts['.discovery-list'].hidden));
  f.scene.box = { top: 0, bottom: 800, height: 800 }; f.window.fire('scroll'); await f.advance(32);
  assert.equal(f.scene.dataset.palette, 'homepage'); assert.equal(f.scene.dataset.engaged, 'false');
});

test('pointer engagement disables the keyboard-only focus treatment', async t => {
  const f = fixture(t); await f.advance(1200);
  f.document.fire('keydown', { key: 'Tab' });
  assert.equal(f.scene.dataset.input, 'keyboard');
  f.stage.fire('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 100, isPrimary: true });
  f.tap(0);
  assert.equal(f.scene.dataset.input, 'pointer');
  assert.equal(f.scene.dataset.engaged, 'true');
});

test('a fast fling beyond the observed region finishes the fade before stopping rendering', async t => {
  const f = fixture(t); await f.advance(1000);
  assert.equal(f.scene.dataset.surfaceProgress, '1.000');
  f.scene.box = {top:-2000,bottom:-1200,height:800};
  f.intersect(false);
  assert.equal(f.scene.dataset.surfaceProgress, '1.000', 'leaving the observer does not snap the cue away');
  await f.advance(32);
  assert.ok(Number(f.scene.dataset.surfaceProgress) > 0 && Number(f.scene.dataset.surfaceProgress) < 1);
  await f.advance(1200);
  assert.equal(f.surface.style.opacity, '0');
  assert.equal(f.frames.size, 0);
});

test('reduced motion stops the continuous render loop while retaining timed reveals', async t => {
  const f = fixture(t, true); await f.advance(32); assert.equal(f.frames.size, 0);
  f.tap(2); await f.advance(200); assert.equal(f.roots[2].parts['.discovery-list'].hidden, false);
  await f.advance(7300); assert.equal(f.roots[2].parts['.discovery-list'].hidden, true);
  assert.equal(f.frames.size, 0);
});
