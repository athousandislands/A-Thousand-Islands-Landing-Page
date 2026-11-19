import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './ticker-tuning.css';
import { titleMotionDefaults } from './text-entrances.js';
import { installTuningHelp } from './dial-help.js';

export function mountTickerTuning(motion, page) {
  const host = document.createElement('aside');
  host.className = 'ticker-tuning';
  host.setAttribute('aria-label', 'Create Your Reality motion controls');
  host.setAttribute('data-lenis-prevent', '');
  page.append(host);
  createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });

  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  host.append(status);

  const { startPercent, settlePercent, travelPx } = titleMotionDefaults;
  const kit = createDialKit('Create Your Reality', {
    preview: { type: 'action', label: 'Go to start of entrance' },
    startPercent: [startPercent, 75, 100, 1],
    settlePercent: [settlePercent, 30, 70, 1],
    travelPx: {
      desktop: [travelPx.desktop, 0, 40, 1],
      tablet: [travelPx.tablet, 0, 40, 1],
      phone: [travelPx.phone, 0, 40, 1],
    },
    copy: { type: 'action', label: 'Copy settings' },
    reset: { type: 'action', label: 'Reset settings' },
  }, {
    id: 'ati-create-reality-scroll',
    persist: true,
    async onAction(action) {
      if (action === 'preview') {
        motion.previewEntrance();
        status.textContent = 'Scroll down to preview the entrance.';
      }
      if (action === 'reset') kit.resetValues();
      if (action === 'copy') {
        const { startPercent, settlePercent, travelPx } = kit.getValues();
        const json = JSON.stringify({ startPercent, settlePercent, travelPx }, null, 2);
        try {
          await navigator.clipboard.writeText(json);
          status.textContent = 'Motion settings copied.';
        } catch {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const download = document.createElement('a');
          download.href = url;
          download.download = 'create-your-reality-motion.json';
          download.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          status.textContent = 'Motion settings downloaded.';
        }
      }
    },
  });
  kit.subscribe(({ startPercent, settlePercent, travelPx }) => motion.update({ startPercent, settlePercent, travelPx }));
  installTuningHelp(host, {
    'Create Your Reality': 'Control the gentle upward movement of the heading as you scroll. The words stay still when scrolling stops.',
    'Go to start of entrance': 'Move just before the heading begins its entrance, then scroll down to preview it.',
    'Start Percent': 'Heading position as a percentage of viewport height when upward travel starts. Higher begins earlier, near the bottom of the screen.',
    'Settle Percent': 'Heading position as a percentage of viewport height when the words reach their resting positions. Lower spreads the entrance over more scrolling.',
    'Travel Px': 'Maximum upward travel in pixels for each layout. Higher makes the parallax more visible. Zero keeps the words in place.',
    Desktop: 'Maximum travel in pixels for desktop layouts. Higher produces a larger upward entrance.',
    Tablet: 'Maximum travel in pixels for tablet and compact layouts. Higher produces a larger upward entrance.',
    Phone: 'Maximum travel in pixels for phone layouts. Higher produces a larger upward entrance.',
    'Copy settings': 'Copy the current start, settle and travel values as JSON. A JSON download is used if clipboard access is unavailable.',
    'Reset settings': 'Restore the current source defaults of 95 percent start, 55 percent settle and 32, 28 and 22 pixels of desktop, tablet and phone travel.',
  });
}
