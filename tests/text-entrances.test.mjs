import test from 'node:test';
import assert from 'node:assert/strict';
import { initSectionMotion, titleMotionDefaults } from '../website-source/text-entrances.js';

function fixture(t, { width = 1440, reduced = false } = {}) {
  const frames = new Map();
  const detailAnimations = [];
  const motionPreference = Object.assign(new EventTarget(), { matches: reduced });
  const page = new EventTarget();
  let top = 1000;
  let offset = 0;
  let nextFrame = 0;
  let measurements = 0;
  let jump;
  let intersection;
  const title = {
    getBoundingClientRect() { measurements++; return { top }; },
    style: {
      setProperty(name, value) { offset = parseFloat(value); },
      removeProperty() { offset = 0; },
    },
  };
  const detail = {
    animate() {
      const animation = { cancelled: false, cancel() { this.cancelled = true; } };
      detailAnimations.push(animation);
      return animation;
    },
  };
  const section = { querySelector: selector => selector === 'h2' ? title : detail };
  const globals = {
    window: page, innerWidth: width, innerHeight: 1000, scrollY: 250,
    document: { documentElement: { hasAttribute: name => name === 'data-compact-layout' && width <= 1180 } },
    matchMedia: () => motionPreference,
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { intersection = visible => callback([{ isIntersecting: visible }]); }
      observe() {}
      disconnect() {}
    },
  };

  const descriptors = Object.getOwnPropertyDescriptors(globalThis);
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }

  const motion = initSectionMotion(section, { jumpTo(position) { jump = position; } });
  t.after(() => {
    motion.deactivate();
    for (const key of Object.keys(globals)) {
      if (descriptors[key]) Object.defineProperty(globalThis, key, descriptors[key]);
      else delete globalThis[key];
    }
  });
  motion.activate();

  return {
    motion,
    get offset() { return offset; },
    get jump() { return jump; },
    get measurements() { return measurements; },
    get pendingFrames() { return frames.size; },
    scrollTo(y) { top = y; page.dispatchEvent(new Event('scroll')); },
    frame() {
      const pending = [...frames.values()];
      frames.clear();
      for (const render of pending) render();
    },
    setReduced(matches) {
      motionPreference.matches = matches;
      motionPreference.dispatchEvent(new Event('change'));
    },
    intersect: visible => intersection(visible),
    detailAnimations,
  };
}

test('the heading follows scroll position in both directions and stops updating at rest', t => {
  const f = fixture(t);
  f.scrollTo(950);
  f.frame();
  assert.equal(f.offset, 32);
  assert.equal(f.measurements, 1);

  f.scrollTo(850);
  f.scrollTo(750);
  assert.equal(f.pendingFrames, 1);
  f.frame();
  assert.equal(f.offset, 16);
  assert.equal(f.measurements, 2);
  assert.equal(f.pendingFrames, 0);

  f.scrollTo(550);
  f.frame();
  assert.equal(f.offset, 0);

  f.scrollTo(750);
  f.frame();
  assert.equal(f.offset, 16);
  f.scrollTo(950);
  f.frame();
  assert.equal(f.offset, 32);
});

test('compact tablet layout starts with 28 pixels of travel', t => {
  const f = fixture(t, { width: 820 });
  f.frame();
  assert.equal(f.offset, 28);
});

test('phone layout uses its own travel and the preview lands before the tuned entrance', t => {
  const f = fixture(t, { width: 390 });
  f.frame();
  assert.equal(f.offset, 22);

  f.motion.update({ ...titleMotionDefaults, startPercent: 90, travelPx: { ...titleMotionDefaults.travelPx, phone: 10 } });
  f.frame();
  assert.equal(f.offset, 10);
  f.motion.previewEntrance();
  assert.equal(f.jump, 1000 + 250 - 900 - 24);
});

test('reduced motion, deactivation and a restored visit clear stale transforms', t => {
  const f = fixture(t, { reduced: true });
  f.frame();
  assert.equal(f.offset, 0);
  assert.equal(f.measurements, 0);

  f.setReduced(false);
  f.frame();
  assert.equal(f.offset, 32);
  f.setReduced(true);
  f.frame();
  assert.equal(f.offset, 0);

  f.setReduced(false);
  f.frame();
  f.scrollTo(400);
  f.motion.deactivate();
  assert.equal(f.pendingFrames, 0);
  assert.equal(f.offset, 0);
  f.scrollTo(750);
  assert.equal(f.pendingFrames, 0);

  f.motion.activate();
  f.frame();
  assert.equal(f.offset, 16);
});

test('the supporting copy still re-enters and stops when reduced motion is enabled', t => {
  const f = fixture(t);
  f.intersect(true);
  f.intersect(true);
  assert.equal(f.detailAnimations.length, 1);
  f.intersect(false);
  assert.equal(f.detailAnimations[0].cancelled, true);

  f.intersect(true);
  f.setReduced(true);
  f.intersect(true);
  assert.equal(f.detailAnimations.length, 2);
  assert.equal(f.detailAnimations[1].cancelled, true);
});
