import approved from './settings/approach-approved.json' with { type: 'json' };

const approachSchema = {
  layout: {
    top: [0, -12, 96, 1],
    titleGap: [0, -12, 64, 1],
    stepGap: [0, -12, 100, 1],
    copyGap: [0, -4, 30, 1],
    columnOffset: [0, -30, 65, 1],
  },
  title: {
    titleSize: [100, 70, 145, 1],
    titleX: [0, -12, 60, 1],
    titleY: [0, -12, 60, 1],
  },
  headings: {
    headingSize: [100, 75, 150, 1],
    headingX: [0, -12, 60, 1],
    headingY: [0, -12, 60, 1],
  },
  paragraphs: {
    copySize: [100, 75, 140, 1],
    copyX: [0, -12, 60, 1],
    copyY: [0, -4, 60, 1],
  },
  handoff: {
    inactiveOpacity: [.58, .4, 1, .01],
  },
};

const storageKey = 'ati-approach-profiles-v2';
const devices = ['desktop', 'tablet', 'phone'];
const cssProperty = key => '--approach-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());

function mapControls(schema, map) {
  return Object.fromEntries(Object.entries(schema).map(([group, fields]) => [group,
    Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, map(field, group, key)])),
  ]));
}

export function approachSchemaFor(profile) {
  return mapControls(approachSchema, ([initial, ...limits], group, key) => [
    approved.profiles[profile]?.[group]?.[key] ?? initial, ...limits,
  ]);
}

function readValue(values, [initial, min, max], group, key) {
  const value = values?.[group]?.[key];
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : initial;
}

export function approachValuesFor(profile, values) {
  return mapControls(approachSchemaFor(profile), (field, group, key) => readValue(values, field, group, key));
}

export function readApproachProfiles() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) return JSON.parse(saved) ?? {};
    const legacy = JSON.parse(localStorage.getItem('ati-approach-profiles-v1'));
    // Opening the old panel saved its defaults. Carry over only values that were edited.
    return Object.fromEntries(devices.filter(device => legacy?.[device]).map(device => [device,
      mapControls(approachSchema, (field, group, key) => {
        const value = readValue(legacy[device], field, group, key);
        return value === field[0] ? undefined : value;
      }),
    ]));
  } catch { return {}; }
}

export function saveApproachProfiles(profiles) {
  try { localStorage.setItem(storageKey, JSON.stringify(profiles)); } catch {}
}

export function applyApproachSettings(page, profile, values) {
  for (const fields of Object.values(approachValuesFor(profile, values))) {
    for (const [key, value] of Object.entries(fields)) {
      const cssValue = key.endsWith('Size') ? value / 100 : key === 'inactiveOpacity' ? value : `${value}px`;
      page.style.setProperty(cssProperty(key), cssValue);
    }
  }
}
