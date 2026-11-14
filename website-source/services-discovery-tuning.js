import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './services-discovery-tuning.css';
import { DISCOVERY_DEFAULTS, savedDesktopDefaults } from './services-discovery-model.js';
import { installDialHelp } from './services-discovery-help.js';

export function mountDiscoveryTuning(api) {
  const phone = matchMedia('(max-width: 640px)').matches;
  const root = createDialRoot({ position: 'bottom-right', theme: 'light', defaultOpen: false });
  const schema = {
    arrival: { _collapsed: true, start: [.15, 0, .7, .05], delay: [.25, 0, 1.5, .05], fade: [.9, .2, 2.5, .1], headingDelay: [0, 0, 1, .05], headingStagger: [.2, 0, .6, .05], headingFade: [.65, .2, 1.5, .05] },
    surface: {
      frost: [.18, 0, .6, .01], grain: [.1, 0, .35, .01], veil: [0, 0, .35, .01],
      colourStrength: [1, .4, 1, .01], transitionDistance: [.6, .3, 1, .05], exitDistance: [.85, .3, 1, .05], smoothing: [.12, 0, .35, .01],
    },
    colour: {
      _collapsed: true,
      baseHighlight: { type: 'color', default: '#66b2ed' }, baseColour: { type: 'color', default: '#58a4eb' },
      coral: { type: 'color', default: '#f97662' }, amber: { type: 'color', default: '#ffc681' }, orange: { type: 'color', default: '#fb9a5d' },
      terracotta: { type: 'color', default: '#ef8759' }, rose: { type: 'color', default: '#db9bbb' },
      saturation: [1, .25, 1.5, .05],
    },
    flow: { _collapsed: true, period: [24, 12, 60, 1], movement: [1, 0, 1.5, .05], spread: [1, .6, 1.4, .05] },
    focus: { _collapsed: true, clarity: [.9, .6, 1, .01], blur: [.75, 0, 8, .25], drift: [.12, 0, 1, .02], softInk: [.56, .15, .8, .01] },
    type: { _collapsed: true, desktopSize: [12, 7, 16, .1], phoneSize: [13, 10, 16, .1], listScale: [1, .8, 1.3, .05], tracking: [-.05, -.08, .03, .005], phoneTracking: [-.045, -.08, .03, .005], leading: [1.06, .95, 1.3, .01], phoneLeading: [1.06, .95, 1.3, .01] },
    spacing: { _collapsed: true, sceneHeight: [112, 100, 140, 1], phoneSceneHeight: [115, 100, 140, 1], phoneMinHeight: [880, 640, 1100, 10], headingGap: [12, 4, 32, 1], itemGap: [3, 0, 16, 1], phoneHeadingGap: [10, 4, 28, 1], phoneItemGap: [3, 0, 12, 1] },
    reveal: { _collapsed: true, appear: [.95, .4, 2.5, .05], stagger: [.16, 0, .4, .02], reading: [7, 3, 20, 1], conceal: [1, .4, 2.5, .1], concealStagger: [.1, 0, .3, .02] },
    bloom: { _collapsed: true, strength: [.7, 0, 1, .02], duration: [1.9, .8, 3, .1], size: [1, .5, 1.5, .05] },
    visual: { _collapsed: true, leftInset: [11, 2, 35, 1], top: [0, 0, 18, 1] },
    direction: { _collapsed: true, rightInset: [6, 2, 35, 1], top: [31, 18, 55, 1] },
    digitalExperiences: { _collapsed: true, leftInset: [4, 2, 35, 1], top: [66, 50, 76, 1] },
    phoneVisual: { _collapsed: true, leftInset: [6, 2, 20, 1], top: [0, 0, 12, 1] },
    phoneDirection: { _collapsed: true, rightInset: [6, 2, 20, 1], top: [26, 12, 46, 1] },
    phoneDigitalExperiences: { _collapsed: true, leftInset: [6, 2, 14, 1], top: [54, 40, 72, 1] },
    explore: { type: 'action', label: 'Go to glass surface' },
    transition: { type: 'action', label: 'Replay scroll transition' },
    showAll: { type: 'action', label: 'Reveal all services' },
    hideAll: { type: 'action', label: 'Conceal all services' },
  };
  for (const [group, controls] of Object.entries(schema)) {
    for (const [key, control] of Object.entries(controls)) {
      const modelKey = key === 'leftInset' || key === 'rightInset' ? 'inset' : key;
      const value = DISCOVERY_DEFAULTS[group]?.[modelKey];
      if (value === undefined) continue;
      if (Array.isArray(control)) control[0] = value;
      else if (control?.type === 'color') control.default = value;
    }
  }
  const kit = createDialKit('Services Glass', schema, {
    id: phone ? 'ati-services-glass-phone-v3' : 'ati-services-glass-desktop-project-v1', persist: true,
    onAction(path) {
      if (path === 'explore') api.explore();
      if (path === 'transition') api.transition();
      if (path === 'showAll') api.revealAll();
      if (path === 'hideAll') api.concealAll();
    },
  });
  const unsubscribe = kit.subscribe(values => {
    const config = structuredClone(DISCOVERY_DEFAULTS);
    for (const group of Object.keys(config)) for (const key of Object.keys(config[group])) {
      if (Number.isFinite(values[group]?.[key])) config[group][key] = values[group][key];
    }
    for (const group of ['digitalExperiences', 'visual', 'direction', 'phoneDigitalExperiences', 'phoneVisual', 'phoneDirection']) {
      config[group].inset = values[group][group.toLowerCase().includes('direction') ? 'rightInset' : 'leftInset'];
    }
    for (const key of Object.keys(config.colour)) if (typeof values.colour?.[key] === 'string' && CSS.supports('color', values.colour[key])) config.colour[key] = values.colour[key];
    // Keep a recoverable snapshot independent of subsequent mobile edits.
    if (!phone) localStorage.setItem('ati-services-desktop-snapshot', JSON.stringify(config));
    if (phone) {
      const desktop = savedDesktopDefaults();
      for (const group of ['arrival', 'surface', 'reveal']) config[group] = desktop[group];
    }
    api.configure(config);
  });
  const destroyHelp = installDialHelp();
  return () => { destroyHelp(); unsubscribe(); kit.destroy(); root.destroy(); };
}
