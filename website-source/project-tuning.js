import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './footer-glass-tuning.css';
import './project-tuning.css';
import { installFooterHelp } from './footer-glass-help.js';
import { applyProjectLayout, getProjectFields, projectDefault, projectSettingsKey } from './project-settings.js';

export function mountProjectTuning(intro, settings, replay, project) {
  const name = project === 'echo' ? 'Echo' : 'Pulse';
  const title = name + ' layout';
  const projectFields = getProjectFields(project);
  const root = createDialRoot({ position: 'bottom-right', theme: 'light', defaultOpen: true });
  root.element.classList.add('footer-dial', 'project-dial');
  const help = {
    [title]: 'Adjust the project layout, media framing and page fade. Edits are saved in this browser.',
    Layout: 'Adjust the position, size and alignment of the title and copy.',
    Services: 'Place and size the services list independently.',
    'Hero Video': 'Frame the hero clip inside its casing.',
    'Interface Image': 'Frame the Pulse interface still inside its casing.',
    'Hand Gesture Video': 'Frame the Pulse hand gesture clip inside its casing.',
    Timing: 'Adjust how soon the project page fades in.',
    'Replay fade in': 'Preview the current delay and fade without leaving this page.',
    'Download settings': 'Download the current layout, media framing and fade delay as JSON.',
    'Reset settings': 'Restore the published layout, media framing and fade delay.',
  };
  const schema = {};
  const initial = {};
  for (const [group, fields] of Object.entries(projectFields)) {
    schema[group] = { _collapsed: ['layout', 'services', 'timing'].includes(group) };
    initial[group] = {};
    for (const [id, [key, range, , description]] of Object.entries(fields)) {
      const label = id.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
      help[label] = description;
      const fallback = projectDefault(project, key, range);
      schema[group][id] = Array.isArray(range) ? [fallback, ...range.slice(1)] : {
        type: 'select',
        default: fallback,
        options: [
          { value: 'start', label: 'Left' },
          { value: 'center', label: 'Centre' },
          { value: 'end', label: 'Right' },
        ],
      };
      initial[group][id] = settings[key];
    }
  }
  schema.timing.replay = { type: 'action', label: 'Replay fade in' };
  schema.download = { type: 'action', label: 'Download settings' };
  schema.reset = { type: 'action', label: 'Reset settings' };

  const kit = createDialKit(title, schema, {
    id: `ati-${project}-project-layout`,
    onAction(path) {
      if (path === 'reset') kit.resetValues();
      if (path === 'timing.replay') replay(settings['fade-in-delay']);
      if (path === 'download') {
        const file = new Blob([JSON.stringify({ project: name, ...settings }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ati-${project}-settings.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    },
  });
  kit.setValues(initial);
  const unsubscribe = kit.subscribe(values => {
    for (const [group, fields] of Object.entries(projectFields)) {
      for (const [id, [key]] of Object.entries(fields)) settings[key] = values[group][id];
    }
    applyProjectLayout(intro, settings);
    try { localStorage.setItem(projectSettingsKey(project), JSON.stringify(settings)); } catch {}
  });

  const removeHelp = installFooterHelp(root.element, {
    help,
    tooltipId: `${project}-dial-help`,
    numberStep: path => {
      const [group, id] = path.split('.');
      return projectFields[group]?.[id]?.[1]?.[3];
    },
    onNumberEdit: (path, value) => kit.setValue(path, value),
  });
  return () => {
    removeHelp();
    unsubscribe();
    kit.destroy();
    root.destroy();
  };
}
