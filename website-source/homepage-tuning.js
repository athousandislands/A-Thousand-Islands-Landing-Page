import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import { setHeartbeatTrimDb } from './site-sound.js';

export function mountHomepageTuning(page) {
  const host = document.createElement('div');
  host.setAttribute('data-lenis-prevent', '');
  page.append(host);
  createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });
  const kit = createDialKit('Homepage text and heartbeat', {
    sound: { heartbeatDb: [13, -12, 18, .5] },
    casingText: {
      weight: { type: 'select', default: '300', options: [
        { value: '300', label: 'Light' },
        { value: '400', label: 'Regular' },
      ] },
      weightFill: [.006, 0, .015, .001],
    },
    reset: { type: 'action', label: 'Reset defaults' },
    copy: { type: 'action', label: 'Copy settings' },
  }, {
    id: 'ati-homepage-text-heartbeat-v2',
    persist: true,
    onAction(action) {
      if (action === 'reset') kit.resetValues();
      if (action === 'copy') navigator.clipboard.writeText(JSON.stringify(kit.getValues(), null, 2)).catch(() => {});
    },
  });
  const apply = ({ sound, casingText }) => {
    setHeartbeatTrimDb(sound.heartbeatDb);
    page.style.setProperty('--casing-font-weight', casingText.weight);
    page.style.setProperty('--casing-weight-fill', casingText.weightFill + 'em');
  };
  kit.subscribe(apply);
  apply(kit.getValues());
}
