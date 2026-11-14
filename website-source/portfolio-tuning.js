import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './footer-glass-tuning.css';
import './project-tuning.css';
import { installFooterHelp } from './footer-glass-help.js';
import { portfolioDials, portfolioProfile } from './portfolio-settings.js';

export function mountPortfolioTuning(settings) {
  const root = createDialRoot({ position: 'bottom-right', theme: 'light', defaultOpen: true });
  root.element.classList.add('footer-dial', 'project-dial', 'portfolio-dial');
  let profile = portfolioProfile();
  let kit, unsubscribe, removeHelp;

  function mount() {
    removeHelp?.();
    unsubscribe?.();
    kit?.destroy();
    const title = 'Portfolio · ' + profile;
    const schema = { copy: { _collapsed: true } };
    const help = {
      [title]: 'Copy is shared across devices. Layout saves for this viewport profile. Resize to switch between phone, tablet and desktop.',
      Copy: 'Edit the heading, overview, Mind Map and Services text. Copy is shared across all screens.',
      Layout: 'Set text sizes and placement for this viewport profile.',
      Spacing: 'Set paragraph, section and image spacing for this viewport profile.',
      'Orb': 'Frame the Orb image independently.',
      'Folders': 'Frame the Folders image independently.',
      'Project Cards': 'Frame the Project Cards image independently.',
      'Mind Map Video': 'Frame the Mind Map video inside its casing.',
      'Download settings': 'Download all three layout profiles and the shared copy as JSON.',
      'Reset layout': 'Restore the approved defaults for the current device profile.',
      'Reset copy': 'Restore the approved text on all devices.',
    };
    for (const [key, value] of Object.entries(settings.original)) {
      const label = key === 'heading' ? 'Heading' : key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      schema.copy[key] = { type: 'text', default: value };
      help[label] = 'Edit this text live. The same wording appears on all devices.';
    }
    const pathByLabel = {};
    for (const [group, fields] of Object.entries(portfolioDials)) {
      schema[group] = { _collapsed: group !== 'spacing' };
      for (const [key, field] of Object.entries(fields)) {
        // Give repeated keys within different media folders their own label and help.
        const uniqueKey = field.label.toLowerCase().replace(/ (\w)/g, (_, c) => c.toUpperCase());
        schema[group][uniqueKey] = field.range;
        const rendered = uniqueKey.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
        pathByLabel[group + '.' + uniqueKey] = { group, key, step: field.range[3] };
        help[rendered] = field.help;
      }
    }
    schema.download = { type: 'action', label: 'Download settings' };
    schema.resetLayout = { type: 'action', label: 'Reset layout' };
    schema.resetCopy = { type: 'action', label: 'Reset copy' };

    function load() {
      const values = settings.values(profile);
      const initial = { copy: values.copy };
      for (const [path, { group, key }] of Object.entries(pathByLabel)) {
        (initial[group] ??= {})[path.split('.')[1]] = values[group][key];
      }
      kit.setValues(initial);
    }

    kit = createDialKit(title, schema, {
      id: 'ati-portfolio-' + profile.toLowerCase(),
      onAction(path) {
        if (path === 'resetLayout') { delete settings.state.profiles[profile]; settings.save(); load(); }
        if (path === 'resetCopy') { settings.state.copy = {}; settings.save(); load(); }
        if (path === 'download') {
          const data = Object.fromEntries(['Phone', 'Tablet', 'Desktop'].map(device => {
            const { copy, ...layout } = settings.values(device);
            return [device, layout];
          }));
          const url = URL.createObjectURL(new Blob([JSON.stringify({ project: 'Creative Portfolio', copy: settings.values().copy, profiles: data }, null, 2)], { type: 'application/json' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = 'ati-creative-portfolio-settings.json';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      },
    });
    load();
    unsubscribe = kit.subscribe(values => {
      const layout = {};
      for (const [path, { group, key }] of Object.entries(pathByLabel)) {
        (layout[group] ??= {})[key] = values[group][path.split('.')[1]];
      }
      settings.state.copy = values.copy;
      settings.state.profiles[profile] = layout;
      settings.save();
    }, false);
    removeHelp = installFooterHelp(root.element, {
      help,
      tooltipId: 'portfolio-dial-help',
      numberStep: path => pathByLabel[path]?.step,
      onNumberEdit: (path, value) => kit.setValue(path, value),
    });
  }

  mount();
  const stop = settings.watchProfiles(() => {
    const next = portfolioProfile();
    if (next !== profile) { profile = next; mount(); }
  });
  return () => {
    stop();
    removeHelp();
    unsubscribe();
    kit.destroy();
    root.destroy();
  };
}
