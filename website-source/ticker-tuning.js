import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './ticker-tuning.css';
import { tickerDefaults } from './text-entrances.js';

export function mountTickerTuning(ticker, page) {
  const host = document.createElement('div');
  host.className = 'ticker-tuning';
  host.setAttribute('data-lenis-prevent', '');
  page.append(host);
  createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });
  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  host.append(status);
  const { entry, roll } = tickerDefaults;
  const kit = createDialKit('Create Your Reality', {
    entry: {
      trigger: { type: 'select', default: entry.trigger, options: [
        { value: 'section', label: 'Section edge (original)' },
        { value: 'heading', label: 'Heading edge' },
      ] },
      insetPercent: [entry.insetPercent, -35, 45, 1],
    },
    roll: {
      durationMs: [roll.durationMs, 250, 1800, 25],
      wordStaggerMs: [roll.wordStaggerMs, 0, 150, 5],
      letterStaggerMs: [roll.letterStaggerMs, 0, 40, 1],
      travelRows: [roll.travelRows, .25, 3, .25],
      curve: { type: 'select', default: roll.curve, options: [
        { value: 'original', label: 'Original' },
        { value: 'gentle', label: 'Softer start' },
        { value: 'balanced', label: 'Gradual start and finish' },
        { value: 'linear', label: 'Even speed' },
      ] },
    },
    replay: { type: 'action', label: 'Replay here' },
    scrollTest: { type: 'action', label: 'Test scroll entry' },
    copy: { type: 'action', label: 'Copy settings' },
    reset: { type: 'action', label: 'Reset to original' },
  }, {
    id: 'ati-create-reality-ticker',
    persist: true,
    async onAction(action) {
      if (action === 'replay') ticker.replay();
      if (action === 'scrollTest') ticker.testScrollEntry();
      if (action === 'reset') kit.resetValues();
      if (action === 'copy') {
        const { entry, roll } = kit.getValues();
        const json = JSON.stringify({ entry, roll }, null, 2);
        try {
          await navigator.clipboard.writeText(json);
          status.textContent = 'Ticker settings copied.';
        } catch {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const download = document.createElement('a');
          download.href = url;
          download.download = 'create-your-reality-ticker.json';
          download.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          status.textContent = 'Ticker settings downloaded.';
        }
      }
    },
  });
  kit.subscribe(({ entry, roll }) => ticker.update({ entry, roll }));
}
