import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './footer-glass-tuning.css';
import { menuSchemaFor } from './site-menu-settings.js';
import { installFooterHelp } from './footer-glass-help.js';

const help = {
  Blue: 'Colour at the top of the frosted surface.',
  Sage: 'Colour at the bottom of the frosted surface.',
  Grain: 'Strength of the static SVG texture.',
  Portrait: 'Frame Seya independently of the menu links. The image always fills the menu.',
  'Portrait Size': 'Zoom in from the full-cover framing.',
  'Portrait Horizontal': 'Reframe Seya left or right where the image extends past the menu. Zoom in to create more room to move.',
  'Portrait Vertical': 'Reframe Seya up or down where the image extends past the menu. Zoom in to create more room to move.',
  Thaw: 'The mist is the full menu-color veil. The fog adds softer patches over the portrait. Both fade between the two saved states.',
  'Reveal Delay': 'Seconds to hold the opening state before the thaw.',
  'Reveal Duration': 'Seconds to fade from opening to final.',
  'Opening Mist': 'Strength of the full veil on opening. Lower it below 1 to see the fog patches beneath it.',
  'Opening Fog': 'Strength of the fog patches on opening.',
  'Final Mist': 'How much of the full veil remains when the menu settles.',
  'Final Fog': 'How much of the patchy fog remains when the menu settles.',
  'Preview opening': 'Hold the opening mist and fog while you adjust them.',
  'Preview final': 'Hold the final mist and fog while you adjust them.',
  'Replay thaw': 'Replay the opening hold and transition with the current settings.',
  'Menu Size': 'Scale the four menu options together.',
  'Menu Horizontal': 'Move the options left or right as a percentage of the viewport width.',
  'Menu Vertical': 'Move the options up or down as a percentage of the viewport height.',
  'Line Spacing': 'Change the distance between the four menu options.',
  'Contact Horizontal': 'Move the contact block left or right as a percentage of the viewport width.',
  'Contact Vertical': 'Move the contact block up or down as a percentage of the viewport height.',
  'Focus Blur': 'Set how much the other links blur in focus mode. Desktop hover also softens the portrait and contact details.',
  'Home To Process': 'Adjust the Home to Process gap as a percentage of the menu type size. Negative values bring the words closer.',
  'Process To Work': 'Adjust the Process to Work gap as a percentage of the menu type size. Negative values bring the words closer.',
  'Work To Contact': 'Adjust the Work to Contact gap as a percentage of the menu type size. Negative values bring the words closer.',
  Typeface: 'Choose the font for the options and the email.',
  Weight: 'Set the weight of the four menu options.',
  Tracking: 'Set the space between letters in the menu options.',
  'Process Size': 'Resize Process independently. At 100, it matches the other options.',
  'Contact Size': 'Resize the Contact Us label.',
  'Email Size': 'Resize the email link.',
  'Reset this layout': 'Restore the defaults for the current layout. Tablets save portrait and landscape separately.',
  'Download this layout': 'Export the active layout profile as JSON.',
  'Download all devices': 'Export phone, both tablet orientations, and desktop settings together.',
};

function downloadMenu(filename, values) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(values, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountMenuTuning(host, profile, profiles, onChange, previewScene) {
  const menuSchema = menuSchemaFor(profile);
  const slug = profile.toLowerCase().replaceAll(' ', '-');
  const root = createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });
  root.element.classList.add('footer-dial');
  const kit = createDialKit(`Menu · ${profile}`, {
    portrait: { ...menuSchema.portrait, _collapsed: true },
    thaw: { ...menuSchema.thaw, _collapsed: true },
    previewOpening: { type: 'action', label: 'Preview opening' },
    previewFinal: { type: 'action', label: 'Preview final' },
    replay: { type: 'action', label: 'Replay thaw' },
    background: { ...menuSchema.background, _collapsed: true },
    layout: menuSchema.layout,
    spacing: menuSchema.spacing,
    typography: { ...menuSchema.typography, _collapsed: true },
    reset: { type: 'action', label: 'Reset this layout' },
    download: { type: 'action', label: 'Download this layout' },
    downloadAll: { type: 'action', label: 'Download all devices' },
  }, {
    id: `ati-menu-${slug}`,
    onAction(path) {
      if (path === 'previewOpening') previewScene('opening');
      if (path === 'previewFinal') previewScene('final');
      if (path === 'replay') previewScene('live');
      if (path === 'reset') kit.resetValues();
      if (path === 'download') downloadMenu(`ati-menu-${slug}-settings.json`, { device: profile, profiles: { [profile]: profiles[profile] } });
      if (path === 'downloadAll') downloadMenu('ati-menu-all-device-settings.json', { profiles });
    },
  });
  kit.setValues(profiles[profile]);
  const unsubscribe = kit.subscribe(({ background, layout, spacing, typography, portrait, thaw }) => {
    profiles[profile] = { background, layout, spacing, typography, portrait, thaw };
    onChange();
  });
  const removeHelp = installFooterHelp(root.element, {
    help,
    tooltipId: 'menu-dial-help',
    tooltipTarget: host,
    numberStep: path => {
      const [group, name] = path.split('.');
      return menuSchema[group]?.[name]?.[3];
    },
    onNumberEdit: (path, value) => kit.setValue(path, value),
  });
  return () => { removeHelp(); unsubscribe(); kit.destroy(); root.destroy(); };
}
