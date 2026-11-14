import { APPROVED_FOOTER_PROFILES } from './footer-settings.js';
export const FOOTER_STORAGE = 'ati-footer-glass-profiles-v6';
export const FOOTER_PREVIOUS_STORAGE = 'ati-footer-glass-profiles-v4';
export const FOOTER_LEGACY_STORAGE = 'ati-footer-glass-profiles-v3';
export const FOOTER_RANGES = {
  framing: { sceneHeight: [70, 160], sectionOffset: [-50, 25], videoSize: [.35, 1.6], horizontal: [-35, 35], vertical: [-30, 30], edgeFeather: [0, 30], topFeather: [8, 70], bottomFog: [0, .8] },
  timing: { delay: [0, 12], duration: [4, 60], pace: [1, 4] },
  beginning: { blur: [0, 50], mist: [0, .9], tint: [0, .8], frost: [0, .6] },
  end: { blur: [0, 50], mist: [0, .9], tint: [0, .8], frost: [0, .6] },
  surface: { grain: [0, .3], backgroundRemoval: [0, 1], backgroundSoftness: [.015, .15], tintFeather: [10, 100] },
  fog: { lingeringFog: [0, 1], eyeClarity: [0, 1], patchScale: [.65, 1.5] },
};
export function footerDefaults(device = 'desktop') {
  return structuredClone(APPROVED_FOOTER_PROFILES[device] || APPROVED_FOOTER_PROFILES.desktop);
}
export function footerProfiles(saved, { previous = false } = {}) {
  const profiles = Object.fromEntries(['desktop', 'tablet', 'phone'].map(device => [device, normalizeFooter(saved?.[device], device)]));
  // Upgrade the old tablet starting values while retaining intentional edits.
  if (previous && saved?.tablet?.framing) {
    const old = saved.tablet.framing, current = profiles.tablet.framing, defaults = footerDefaults('tablet').framing;
    for (const [key, value] of Object.entries({ sectionOffset: -8, vertical: -4, topFeather: 34 })) {
      if (old[key] === value) current[key] = defaults[key];
    }
  }
  return profiles;
}
export function normalizeFooter(values, device) {
  if (values?.reveal && !values.beginning) {
    const old = values.reveal, surface = values.surface;
    values = {
      framing: values.framing,
      timing: { delay: old.delay, duration: old.clearingTime, pace: old.slowdown },
      beginning: { blur: old.initialBlur, mist: old.initialMist, tint: 0, frost: surface?.frost },
      end: { blur: old.finalBlur, mist: old.finalMist, tint: surface?.tint, frost: Number.isFinite(surface?.frost) ? surface.frost * .35 : undefined },
      surface,
    };
  }
  const result = footerDefaults(device);
  for (const [group, controls] of Object.entries(FOOTER_RANGES)) {
    for (const [key, [min, max]] of Object.entries(controls)) {
      const value = values?.[group]?.[key];
      if (Number.isFinite(value)) result[group][key] = Math.max(min, Math.min(max, value));
    }
  }
  const colour = values?.surface?.colour ?? values?.surface?.sage;
  if (/^#[0-9a-f]{6}$/i.test(colour || '')) result.surface.colour = colour;
  return result;
}
export function footerMaterial(progress, { beginning, end, fog }) {
  const patches = fog.lingeringFog * (1 - .78 * progress);
  if (progress === 0) return { ...beginning, patches };
  if (progress === 1) return { ...end, patches };
  const blend = key => beginning[key] + (end[key] - beginning[key]) * progress;
  return { blur: blend('blur'), mist: blend('mist'), tint: blend('tint'), frost: blend('frost'), patches };
}

const thawSteps = [
  { progress: .32, duration: 650 },
  { progress: .68, duration: 950 },
  { progress: 1, duration: 1300 },
];
const pressInterval = 90;
const clearHold = 2000;
const refogDuration = 10000;

export function createFooterThaw() {
  let lastPress = -Infinity;
  let state = { phase: 'frosted', progress: 0, duration: 0, deadline: null };
  const reset = () => {
    lastPress = -Infinity;
    state = { phase: 'frosted', progress: 0, duration: 0, deadline: null };
  };
  return {
    current: () => state,
    reset,
    press(now, visualProgress, reducedMotion = false) {
      if (state.progress === 1 || now - lastPress < pressInterval) return false;
      const from = state.phase === 'fogging' ? visualProgress + .06 : state.progress;
      const step = thawSteps.find(step => step.progress > from) ?? thawSteps.at(-1);
      const duration = reducedMotion ? 0 : step.duration;
      lastPress = now;
      state = { phase: 'clearing', progress: step.progress, duration, deadline: now + duration };
      return true;
    },
    advance(now, reducedMotion = false) {
      if (state.deadline === null || now < state.deadline) return;
      if (state.phase === 'clearing') {
        const clear = state.progress === 1;
        state = { ...state, phase: clear ? 'clear' : 'partial', deadline: clear ? now + clearHold : null };
      } else if (state.phase === 'clear' && !reducedMotion) {
        state = { phase: 'fogging', progress: 0, duration: refogDuration, deadline: now + refogDuration };
      } else {
        reset();
      }
    },
  };
}
