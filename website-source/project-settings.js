import pulseApproved from './settings/pulse-approved.json' with { type: 'json' };

export const projectSettingsKey = (project = 'pulse') => `ati-${project}-project-tuning-v2`;
export const projectContentStagger = 120;

export const projectFields = {
  layout: {
    titleSize: ['title-size', [106, 65, 140, 1], '%', 'Scale the project heading relative to this screen.'],
    titleHorizontal: ['title-x', [-11, -40, 60, 1], 'px', 'Move the title left or right.'],
    titleVertical: ['title-y', [0, -40, 100, 1], 'px', 'Move the title up or down.'],
    copySize: ['copy-size', [107, 70, 130, 1], '%', 'Scale the project copy relative to this screen.'],
    copyHorizontal: ['copy-x', [-7, -60, 40, 1], 'px', 'Move the copy column left or right.'],
    copyVertical: ['copy-y', [21, -50, 100, 1], 'px', 'Move the copy column up or down.'],
    copyAlignment: ['copy-align', 'start', '', 'Align text inside the copy column.'],
  },
  services: {
    servicesSize: ['services-size', [139, 65, 145, 1], '%', 'Scale the services heading and list together.'],
    servicesHorizontal: ['services-x', [-4, -120, 120, 1], 'px', 'Move the services column left or right.'],
    servicesVertical: ['services-y', [-83, -180, 120, 1], 'px', 'Move the services column up or down. The starting value is the approved placement.'],
    servicesAlignment: ['services-align', 'start', '', 'Align text inside the services column.'],
  },
  heroVideo: {
    videoSize: ['video-size', [100, 50, 200, 1], '%', 'Zoom the hero video inside the casing while preserving its proportions.'],
    videoHorizontal: ['video-x', [0, -50, 50, 1], '% offset', 'Move the video left or right as a percentage of the casing width.'],
    videoVertical: ['video-y', [0, -50, 50, 1], '% offset', 'Move the video up or down as a percentage of the casing height.'],
  },
  interfaceImage: {
    imageSize: ['image-size', [100, 50, 200, 1], '%', 'Zoom the Pulse interface image inside the casing while preserving its proportions.'],
    imageHorizontal: ['image-x', [0, -50, 50, 1], '% offset', 'Move the image left or right as a percentage of the casing width.'],
    imageVertical: ['image-y', [0, -50, 50, 1], '% offset', 'Move the image up or down as a percentage of the casing height.'],
  },
  handGestureVideo: {
    gestureSize: ['gesture-size', [100, 50, 200, 1], '%', 'Zoom the hand gesture video inside the casing while preserving its proportions.'],
    gestureHorizontal: ['gesture-x', [0, -50, 50, 1], '% offset', 'Move the hand gesture video left or right as a percentage of the casing width.'],
    gestureVertical: ['gesture-y', [0, -50, 50, 1], '% offset', 'Move the hand gesture video up or down as a percentage of the casing height.'],
  },
  timing: {
    fadeInDelay: ['fade-in-delay', [350, 0, 1000, 10], 'ms', `Wait this many milliseconds before the header fades in. The project content starts ${projectContentStagger} ms after the header. Use Replay fade in to preview both.`],
  },
};

export function getProjectFields(project) {
  if (project !== 'echo') return projectFields;
  const { layout, services, heroVideo, timing } = projectFields;
  return { layout, services, heroVideo, timing };
}

export function projectDefault(project, key, range) {
  const approved = project === 'pulse' ? pulseApproved[key] : undefined;
  return approved ?? (Array.isArray(range) ? range[0] : range);
}

export function readProjectSettings(project) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(projectSettingsKey(project))) ?? {}; } catch {}
  const settings = {};
  for (const fields of Object.values(getProjectFields(project))) {
    for (const [key, range] of Object.values(fields)) {
      const value = saved[key];
      const fallback = projectDefault(project, key, range);
      settings[key] = Array.isArray(range)
        ? Number.isFinite(value) ? Math.max(range[1], Math.min(range[2], value)) : fallback
        : ['start', 'center', 'end'].includes(value) ? value : fallback;
    }
  }
  return settings;
}

export function applyProjectLayout(intro, settings) {
  for (const fields of Object.values(getProjectFields(intro.dataset.project))) {
    for (const [key, , unit] of Object.values(fields)) {
      if (unit === 'ms') continue;
      const value = settings[key];
      intro.style.setProperty(`--${key}`, unit === '%' ? value / 100 : unit === 'px' ? `${value}px` : unit === '% offset' ? `${value}%` : value);
    }
  }
}
