import approved from './settings/creative-portfolio-approved.json';
import { deviceProfile, watchDeviceProfile } from './device-profile.js';

const storageKey = 'ati-creative-portfolio-tuning-v1';
const profileLabels = { phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop' };
export const portfolioProfile = () => profileLabels[deviceProfile()];

const dial = (label, range, variable, unit, help, selector) => ({ label, range, variable, unit, help, selector });
const offset = (label, variable, help, selector) => dial(label, [0, -80, 80, 1], variable, 'px', help, selector);
const size = (label, variable, help, selector) => dial(label, [100, 60, 160, 1], variable, '%', help, selector);
const gap = (label, variable, help) => dial(label, [0, -40, 120, 1], variable, 'px', help);
const framing = (name, selector, casing = true) => ({
  ...(casing ? { casing: dial(name + ' Casing Width', [100, 50, 100, 1], '--portfolio-casing-width', 'percent', 'Width of this casing within its grid cell. Its 4:5 shape stays the same.', selector) } : {}),
  zoom: size(name + ' Zoom', '--portfolio-media-scale', 'Scale the artwork inside the casing. 100 keeps the original fit.', selector),
  horizontal: offset(name + ' Horizontal', '--portfolio-media-x', 'Move the artwork inside the casing. Positive moves right.', selector),
  vertical: offset(name + ' Vertical', '--portfolio-media-y', 'Move the artwork inside the casing. Positive moves down.', selector),
});

export const portfolioDials = {
  layout: {
    titleScale: size('Title Scale', '--title-size', 'Scale the project heading. 100 uses the default type size.'),
    titleHorizontal: offset('Title Horizontal', '--portfolio-x', 'Move the heading left or right.', '.project-title'),
    titleVertical: offset('Title Vertical', '--portfolio-y', 'Move the heading up or down.', '.project-title'),
    copyScale: size('Copy Scale', '--copy-size', 'Scale the overview and Mind Map text together.'),
    overviewHorizontal: offset('Overview Horizontal', '--portfolio-x', 'Move the overview left or right.', '.project-intro .project-copy'),
    overviewVertical: offset('Overview Vertical', '--portfolio-y', 'Move the overview up or down.', '.project-intro .project-copy'),
    mindHorizontal: offset('Mind Map Horizontal', '--portfolio-x', 'Move the Mind Map copy left or right.', '.portfolio-mind-copy'),
    mindVertical: offset('Mind Map Vertical', '--portfolio-y', 'Move the Mind Map copy up or down.', '.portfolio-mind-copy'),
    servicesScale: size('Services Scale', '--services-size', 'Scale the Services heading and list.'),
    servicesHorizontal: offset('Services Horizontal', '--portfolio-x', 'Move Services left or right.', '.project-services'),
    servicesVertical: offset('Services Vertical', '--portfolio-y', 'Move Services up or down.', '.project-services'),
  },
  spacing: {
    overviewGap: gap('Overview Paragraph Gap', '--portfolio-overview-gap', 'Add or remove space between overview paragraphs, in pixels.'),
    mindGap: gap('Mind Map Paragraph Gap', '--portfolio-mind-gap', 'Add or remove space between Mind Map paragraphs, in pixels.'),
    introGap: gap('Intro Section Gap', '--portfolio-intro-gap', 'Add or remove vertical space between the intro rows.'),
    galleryGap: gap('Gallery Section Gap', '--portfolio-gallery-gap', 'Add or remove space between the image group, Mind Map copy and video.'),
    imageGap: gap('Image Gap', '--portfolio-image-gap', 'Add or remove space between the image casings.'),
    imageWidth: dial('Image Group Width', [100, 55, 100, 1], '--portfolio-image-width', 'percent', 'Width of the centered group as a percentage of the available gallery width.'),
    mindWidth: dial('Mind Map Copy Width', [100, 55, 100, 1], '--portfolio-mind-width', '%', 'Width relative to the default text column.'),
    radius: dial('Image Corner Radius', [0, -18, 36, 1], '--portfolio-radius', 'px', 'Add or remove rounding from the three image casings.'),
  },
  orb: framing('Orb', '.portfolio-still:nth-child(1)'),
  folders: framing('Folders', '.portfolio-still:nth-child(2)'),
  projectCards: framing('Project Cards', '.portfolio-still:nth-child(3)'),
  mindMapVideo: framing('Video', '.project-shot-video', false),
};

const baseline = { '--title-size': 1.06, '--copy-size': 1.07, '--services-size': 1.39 };

function readPortfolioState() {
  const state = { copy: {}, profiles: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.copy && typeof saved.copy === 'object') state.copy = saved.copy;
    if (saved?.profiles && typeof saved.profiles === 'object') state.profiles = saved.profiles;
  } catch {}
  return state;
}

function dialValue(state, profile, group, key, field) {
  const [initial, min, max] = field.range;
  const fallback = approved.profiles[profile]?.[group]?.[key] ?? initial;
  const value = state.profiles[profile]?.[group]?.[key];
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export function portfolioPreviewTitle(fallback) {
  const state = readPortfolioState();
  return {
    name: typeof state.copy.heading === 'string' ? state.copy.heading : fallback,
    scale: baseline['--title-size'] * dialValue(state, portfolioProfile(), 'layout', 'titleScale', portfolioDials.layout.titleScale) / 100,
  };
}

// Copy is shared across devices. Layout values belong to the current viewport profile.
export function initPortfolioSettings(root) {
  const textNodes = {
    heading: root.querySelector('.project-title'),
    ...Object.fromEntries([...root.querySelectorAll('.project-intro .project-copy p')].map((node, i) => ['overview' + (i + 1), node])),
    ...Object.fromEntries([...root.querySelectorAll('.portfolio-mind-copy p')].map((node, i) => ['mindMap' + (i + 1), node])),
    ...Object.fromEntries([...root.querySelectorAll('.project-services li')].map((node, i) => ['service' + (i + 1), node])),
  };
  const original = Object.fromEntries(Object.entries(textNodes).map(([key, node]) => [key, node.textContent]));
  const state = readPortfolioState();

  function values(profile = portfolioProfile()) {
    return {
      copy: Object.fromEntries(Object.entries(original).map(([key, value]) => [key, typeof state.copy[key] === 'string' ? state.copy[key] : value])),
      ...Object.fromEntries(Object.entries(portfolioDials).map(([group, fields]) => [group,
        Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, dialValue(state, profile, group, key, field)])),
      ])),
    };
  }

  function apply() {
    const next = values();
    for (const [key, node] of Object.entries(textNodes)) node.textContent = next.copy[key];
    for (const [group, fields] of Object.entries(portfolioDials)) {
      for (const [key, field] of Object.entries(fields)) {
        const value = next[group][key];
        const node = field.selector ? root.querySelector(field.selector) : root;
        const scale = baseline[field.variable] ?? 1;
        const cssValue = field.unit === '%' ? scale * value / 100 : value + (field.unit === 'percent' ? '%' : field.unit);
        node.style.setProperty(field.variable, cssValue);
      }
    }
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    apply();
  }

  return { original, state, values, apply, save, watchProfiles: watchDeviceProfile };
}
