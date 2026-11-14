import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import { setSoundMix, soundDials } from './site-sound.js';

export function mountSoundTuning(host) {
  createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });
  const kit = createDialKit('Site sound', {
    tone: { ...soundDials.tone, _collapsed: true },
    menu: soundDials.menu,
    frostedFooter: { ...soundDials.frostedFooter, _collapsed: true },
    thawedFooter: { ...soundDials.thawedFooter, _collapsed: true },
    resetMix: { type: 'action', label: 'Reset sound mix' },
  }, {
    id: 'ati-site-sound',
    persist: true,
    onAction: path => { if (path === 'resetMix') kit.resetValues(); },
  });
  kit.subscribe(setSoundMix);
}
