import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './footer-glass-tuning.css';
import { deviceProfile, watchDeviceProfile } from './device-profile.js';
import { installFooterHelp } from './footer-glass-help.js';
import { approachSchemaFor, approachValuesFor, applyApproachSettings, readApproachProfiles, saveApproachProfiles } from './approach-settings.js';

const help = {
  Top: 'Move the whole composition up or down in pixels. Short phone screens limit extra space at the top.',
  'Title Gap': 'Change the space after the page title in the stacked layout. Short phone screens limit this extra space.',
  'Step Gap': 'Change the space between steps. On desktop this also changes the scroll distance between steps.',
  'Copy Gap': 'Change the space between each heading and its paragraph in the stacked layout.',
  'Column Offset': 'Widen or narrow the column gaps on desktop and tablet.',
  'Title Size': 'Scale the Our Approach title as a percentage of its responsive size.',
  'Title X': 'Move the page title left or right in pixels.',
  'Title Y': 'Move the page title up or down in pixels.',
  'Heading Size': 'Scale the three step headings as a percentage of their responsive size.',
  'Heading X': 'Move the step headings left or right in pixels.',
  'Heading Y': 'Move the step headings up or down in pixels.',
  'Copy Size': 'Scale the paragraphs as a percentage of their responsive size.',
  'Copy X': 'Move the paragraphs left or right in pixels.',
  'Copy Y': 'Move the paragraphs up or down in pixels.',
  'Inactive Opacity': 'Set the opacity of the upcoming desktop steps. At 1, they start fully visible.',
  'Reset this device': 'Restore the defaults for the current device.',
  'Download settings': 'Export the saved phone, tablet and desktop presets as JSON.',
};

export function mountApproachTuning(page, onChange) {
  const profiles = readApproachProfiles();
  const host = document.createElement('div');
  host.setAttribute('data-lenis-prevent', '');
  page.after(host);
  let cleanup;

  function mount(profile) {
    cleanup?.();
    const schema = approachSchemaFor(profile);
    const root = createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });
    root.element.classList.add('footer-dial');
    const name = profile[0].toUpperCase() + profile.slice(1);
    const kit = createDialKit(`Our Approach · ${name}`, {
      layout: schema.layout,
      title: { ...schema.title, _collapsed: true },
      headings: { ...schema.headings, _collapsed: true },
      paragraphs: { ...schema.paragraphs, _collapsed: true },
      ...(profile === 'desktop' && { handoff: { ...schema.handoff, _collapsed: true } }),
      reset: { type: 'action', label: 'Reset this device' },
      download: { type: 'action', label: 'Download settings' },
    }, {
      id: `ati-approach-${profile}`,
      onAction(path) {
        if (path === 'reset') kit.resetValues();
        if (path !== 'download') return;
        const settings = Object.fromEntries(['desktop', 'tablet', 'phone'].map(device => [device, approachValuesFor(device, profiles[device])]));
        const url = URL.createObjectURL(new Blob([JSON.stringify({ profiles: settings }, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ati-approach-settings.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    });
    function apply(values) {
      profiles[profile] = approachValuesFor(profile, values);
      saveApproachProfiles(profiles);
      applyApproachSettings(page, profile, values);
      onChange();
    }
    kit.setValues(approachValuesFor(profile, profiles[profile]));
    const unsubscribe = kit.subscribe(apply);
    const removeHelp = installFooterHelp(root.element, {
      help,
      tooltipId: 'approach-dial-help',
      tooltipTarget: host,
      numberStep: path => {
        const [group, key] = path.split('.');
        return schema[group]?.[key]?.[3];
      },
      onNumberEdit: (path, value) => kit.setValue(path, value),
    });
    cleanup = () => { removeHelp(); unsubscribe(); kit.destroy(); root.destroy(); };
  }

  mount(deviceProfile());
  const stopWatching = watchDeviceProfile(mount);
  return () => {
    stopWatching();
    cleanup();
    host.remove();
  };
}
