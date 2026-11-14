import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './services-discovery-tuning.css';
import './page-background-tuning.css';

export function mountBackgroundTuning() {
  document.body.classList.add('is-tuning-background');
  const root = createDialRoot({ position: 'bottom-right', theme: 'light', defaultOpen: true });
  const kit = createDialKit('Page Atmosphere', {
    mist: {
      strength: [.65, 0, 1, .01], spread: [1, .5, 2, .05],
      fieldHeight: [1600, 800, 3200, 50],
    },
    palette: {
      _collapsed: true,
      base: { type: 'color', default: '#f1f4f1' },
      blue: { type: 'color', default: '#c3d8dc' },
      sage: { type: 'color', default: '#d7e1d1' },
      ivory: { type: 'color', default: '#eee7d4' },
      blueStrength: [.7, 0, 1, .01], sageStrength: [.6, 0, 1, .01], ivoryStrength: [.35, 0, 1, .01],
    },
    grain: { strength: [.035, 0, .15, .005], size: [160, 64, 320, 8] },
  }, { id: 'ati-page-atmosphere-reference-v2', persist: true });
  const unsubscribe = kit.subscribe(values => {
    const properties = {
      '--page-base': values.palette.base, '--page-blue': values.palette.blue,
      '--page-sage': values.palette.sage, '--page-ivory': values.palette.ivory,
      '--page-mist': values.mist.strength, '--page-spread': values.mist.spread,
      '--page-field-height': `${values.mist.fieldHeight}px`,
      '--page-blue-strength': values.palette.blueStrength, '--page-sage-strength': values.palette.sageStrength,
      '--page-ivory-strength': values.palette.ivoryStrength,
      '--page-grain': values.grain.strength, '--page-grain-size': `${values.grain.size}px`,
    };
    for (const [key, value] of Object.entries(properties)) document.body.style.setProperty(key, String(value));
  });
  return () => { unsubscribe(); kit.destroy(); root.destroy(); document.body.classList.remove('is-tuning-background'); };
}
