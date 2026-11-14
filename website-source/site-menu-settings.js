import approved from './settings/menu-approved.json' with { type: 'json' };
import { deviceProfile, watchDeviceProfile } from './device-profile.js';

const fonts = {
  noto: "'Menu Noto Sans', 'Noto Sans', sans-serif",
  helvetica: "'Helvetica Neue', Arial, sans-serif",
  system: 'system-ui, sans-serif',
};
const color = value => ({ type: 'color', default: value });

export const menuSchema = {
  background: {
    blue: color('#e6eef0'),
    sage: color('#e9f2ec'),
    grain: [.05, 0, .25, .005],
  },
  portrait: {
    portraitSize: [100, 100, 185, 1],
    portraitHorizontal: [0, -40, 40, 1],
    portraitVertical: [0, -35, 35, 1],
  },
  thaw: {
    revealDelay: [.45, 0, 5, .05],
    revealDuration: [3.6, .15, 15, .05],
    openingMist: [.9, 0, 1, .01],
    openingFog: [.8, 0, 1, .01],
    finalMist: [.16, 0, 1, .01],
    finalFog: [.13, 0, 1, .01],
  },
  layout: {
    menuSize: [100, 60, 130, 1],
    menuHorizontal: [0, -10, 10, .5],
    menuVertical: [0, -15, 15, .5],
    lineSpacing: [100, 85, 125, 1],
    contactHorizontal: [0, -10, 10, .5],
    contactVertical: [0, -12, 5, .5],
    focusBlur: [5.5, 0, 16, .5],
  },
  spacing: {
    homeToProcess: [0, -18, 30, .5],
    processToWork: [0, -18, 30, .5],
    workToContact: [-3, -18, 30, .5],
  },
  typography: {
    typeface: { type: 'select', default: 'noto', options: [
      { value: 'noto', label: 'Noto Sans' },
      { value: 'helvetica', label: 'Helvetica Neue' },
      { value: 'system', label: 'System Sans' },
    ] },
    weight: { type: 'select', default: '600', options: [
      { value: '400', label: 'Regular' },
      { value: '500', label: 'Medium' },
      { value: '600', label: 'Semibold' },
    ] },
    tracking: [-65, -100, 30, 1],
    processSize: [100, 70, 120, 1],
    contactSize: [100, 65, 135, 1],
    emailSize: [100, 65, 135, 1],
  },
};

const storageKey = 'ati-menu-profiles-v3';
const profiles = ['Phone', 'Tablet Portrait', 'Tablet Landscape', 'Desktop'];
const portraitQuery = '(orientation: portrait)';

export function menuProfileName(device, portrait) {
  if (device === 'tablet') return portrait ? 'Tablet Portrait' : 'Tablet Landscape';
  return device === 'phone' ? 'Phone' : 'Desktop';
}

export function currentMenuProfile() {
  return menuProfileName(deviceProfile(), matchMedia(portraitQuery).matches);
}

export function watchMenuProfile(listener) {
  const portrait = matchMedia(portraitQuery);
  let profile = menuProfileName(deviceProfile(), portrait.matches);
  const update = () => {
    const next = menuProfileName(deviceProfile(), portrait.matches);
    if (next === profile) return;
    profile = next;
    listener(next);
  };
  const stopWatchingDevice = watchDeviceProfile(update);
  portrait.addEventListener('change', update);
  return () => {
    stopWatchingDevice();
    portrait.removeEventListener('change', update);
  };
}

function normalizeMenu(values, defaults = {}) {
  return Object.fromEntries(Object.entries(menuSchema).map(([group, fields]) => [group,
    Object.fromEntries(Object.entries(fields).map(([name, field]) => {
      let value = values?.[group]?.[name];
      if (name === 'processSize') value ??= values?.typography?.approachSize;
      if (name === 'finalMist') value ??= values?.thaw?.restingMist;
      if (Array.isArray(field)) {
        const [fallback, min, max] = field;
        // The old menu stored a fully opaque opening before it had a separate fog control.
        if (name === 'openingMist' && value === 1 && values?.thaw?.openingFog === undefined) value = undefined;
        return [name, Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : defaults[group]?.[name] ?? fallback];
      }
      const valid = field.type === 'color' ? typeof value === 'string' && CSS.supports('color', value)
        : field.options.some(option => option.value === value);
      return [name, valid ? value : defaults[group]?.[name] ?? field.default];
    })),
  ]));
}

export function readMenuProfiles() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  return Object.fromEntries(profiles.map(name => {
    const values = saved?.[name] ?? (name === 'Tablet Landscape' ? saved?.Tablet : undefined);
    return [name, normalizeMenu(values, approved.profiles[name])];
  }));
}

export function menuSchemaFor(profile) {
  const defaults = normalizeMenu(approved.profiles[profile]);
  return Object.fromEntries(Object.entries(menuSchema).map(([group, fields]) => [group,
    Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, Array.isArray(field)
      ? [defaults[group][name], ...field.slice(1)]
      : { ...field, default: defaults[group][name] },
    ])),
  ]));
}

export function saveMenuProfiles(profiles) {
  try { localStorage.setItem(storageKey, JSON.stringify(profiles)); } catch {}
}

export function applyMenuBackground(element, { blue, sage, grain }) {
  element.style.setProperty('--menu-blue', blue);
  element.style.setProperty('--menu-sage', sage);
  element.style.setProperty('--menu-grain', grain);
}

export function applyMenuSettings(dialog, { background, layout, spacing, typography, portrait, thaw }) {
  applyMenuBackground(dialog, background);
  const properties = {
    '--menu-size': layout.menuSize / 100, '--menu-x': `${layout.menuHorizontal}vw`, '--menu-y': `${layout.menuVertical}svh`,
    '--menu-line-spacing': layout.lineSpacing / 100,
    '--menu-gap-home-process': spacing.homeToProcess / 100,
    '--menu-gap-process-work': spacing.processToWork / 100,
    '--menu-gap-work-contact': spacing.workToContact / 100,
    '--menu-focus-blur': `${layout.focusBlur / 100}em`,
    '--menu-image-focus-blur': `${layout.focusBlur * .85}px`,
    '--menu-contact-x': `${layout.contactHorizontal}vw`, '--menu-contact-y': `${layout.contactVertical}svh`,
    '--menu-font': fonts[typography.typeface], '--menu-weight': typography.weight, '--menu-tracking': `${typography.tracking / 1000}em`,
    '--menu-process-size': typography.processSize / 100,
    '--menu-contact-size': typography.contactSize / 100, '--menu-email-size': typography.emailSize / 100,
    '--menu-portrait-scale': portrait.portraitSize / 100,
    '--menu-portrait-x': `${50 - portrait.portraitHorizontal}%`, '--menu-portrait-y': `${50 - portrait.portraitVertical}%`,
    '--menu-reveal-delay': `${thaw.revealDelay}s`, '--menu-reveal-duration': `${thaw.revealDuration}s`,
    '--menu-opening-mist': thaw.openingMist, '--menu-final-mist': thaw.finalMist,
    '--menu-opening-fog': thaw.openingFog, '--menu-final-fog': thaw.finalFog,
  };
  for (const [key, value] of Object.entries(properties)) dialog.style.setProperty(key, String(value));
}

