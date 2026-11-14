import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './services-discovery-tuning.css';
import './footer-glass-tuning.css';
import { installFooterHelp } from './footer-glass-help.js';

const controlsFor = config => ({
  framing: config.framing, timing: config.timing, beginning: config.beginning, end: config.end,
  fog: config.fog,
  colour: { surfaceColour: config.surface.colour, backgroundRemoval: config.surface.backgroundRemoval, backgroundSoftness: config.surface.backgroundSoftness, tintFeather: config.surface.tintFeather },
  advanced: { grain: config.surface.grain, edgeFeather: config.framing.edgeFeather, bottomFog: config.framing.bottomFog },
});

export function mountFooterTuning(api) {
  const v = api.values();
  const root = createDialRoot({ position: 'bottom-right', theme: 'light', defaultOpen: true });
  root.element.classList.add('footer-dial');
  const status = document.createElement('div'); status.className = 'footer-dial-status'; status.role = 'status'; document.body.append(status);
  let statusTimer, suppressPreview = false;
  const notify = message => { clearTimeout(statusTimer); status.textContent = message; statusTimer = setTimeout(() => { status.textContent = ''; }, 4000); };
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true; root.element.append(input);
  const look = state => ({
    _collapsed: true, blur: [state.blur, 0, 50, .5], mist: [state.mist, 0, .9, .01],
    tint: [state.tint, 0, .8, .01], frost: [state.frost, 0, .6, .005],
  });
  const controls = {
    preview: { type: 'select', options: [{ value: 'live', label: 'Live transition' }, { value: 'frosted', label: 'Beginning' }, { value: 'halfway', label: 'Halfway' }, { value: 'clear', label: 'End' }], default: 'live' },
    play: { type: 'action', label: 'Play from beginning' },
    timing: { delay: [v.timing.delay, 0, 12, .1], duration: [v.timing.duration, 4, 60, .5] },
    beginning: look(v.beginning), end: look(v.end),
    colour: {
      _collapsed: true, surfaceColour: { type: 'color', default: v.surface.colour },
      backgroundRemoval: [v.surface.backgroundRemoval, 0, 1, .01], backgroundSoftness: [v.surface.backgroundSoftness, .015, .15, .005],
      tintFeather: [v.surface.tintFeather, 10, 100, 1],
    },
    framing: {
      _collapsed: true, sceneHeight: [v.framing.sceneHeight, 70, 160, 1], videoSize: [v.framing.videoSize, .35, 1.6, .01],
      sectionOffset: [v.framing.sectionOffset, -50, 25, 1],
      horizontal: [v.framing.horizontal, -35, 35, 1], vertical: [v.framing.vertical, -30, 30, 1],
      topFeather: [v.framing.topFeather, 8, 70, 1],
    },
    fog: {
      _collapsed: true, lingeringFog: [v.fog.lingeringFog, 0, 1, .01],
      eyeClarity: [v.fog.eyeClarity, 0, 1, .01], patchScale: [v.fog.patchScale, .65, 1.5, .01],
    },
    advanced: {
      _collapsed: true, grain: [v.surface.grain, 0, .3, .005],
      edgeFeather: [v.framing.edgeFeather, 0, 30, 1], bottomFog: [v.framing.bottomFog, 0, .8, .01],
    },
    settings: {
      _collapsed: true, reset: { type: 'action', label: 'Reset this device' },
      download: { type: 'action', label: 'Download settings' }, import: { type: 'action', label: 'Import settings' },
    },
  };
  const kit = createDialKit(`Footer Glass · ${api.device()}`, controls, {
    id: `ati-footer-glass-${api.device()}-v6`, persist: false,
    onAction(path) {
      if (path === 'play') { kit.setValue('preview', 'live'); api.replay(); }
      if (path === 'settings.reset') { api.reset(); restoreControls(); notify('Starting values restored for this device.'); }
      if (path === 'settings.import') input.click();
      if (path === 'settings.download') {
        const settings = { type: 'ati-footer-glass-settings', version: 2, profiles: api.allValues() };
        const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = `ati-footer-glass-${Date.now()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify('All three device profiles downloaded.');
      }
    },
  });
  kit.setValues(controlsFor(v)); kit.setValue('preview', 'live');
  let previous = structuredClone(kit.getValues());
  const unsubscribe = kit.subscribe(values => {
    const beginningChanged = JSON.stringify(values.beginning) !== JSON.stringify(previous.beginning);
    const endChanged = JSON.stringify(values.end) !== JSON.stringify(previous.end);
    previous = structuredClone(values);
    api.configure({
      framing: { ...values.framing, edgeFeather: values.advanced.edgeFeather, bottomFog: values.advanced.bottomFog },
      timing: { ...values.timing, pace: api.values().timing.pace }, beginning: values.beginning, end: values.end,
      surface: { colour: values.colour.surfaceColour, backgroundRemoval: values.colour.backgroundRemoval, backgroundSoftness: values.colour.backgroundSoftness, tintFeather: values.colour.tintFeather, grain: values.advanced.grain },
      fog: values.fog,
    });
    if (!suppressPreview && beginningChanged && !endChanged && values.preview !== 'frosted') { kit.setValue('preview', 'frosted'); return; }
    if (!suppressPreview && endChanged && !beginningChanged && values.preview !== 'clear') { kit.setValue('preview', 'clear'); return; }
    api.study(values.preview);
  });
  function restoreControls() {
    suppressPreview = true; kit.setValues(controlsFor(api.values())); kit.setValue('preview', 'live'); suppressPreview = false;
  }
  // Opening an endpoint shows it immediately, without a second selector action.
  function previewFolder(event) {
    if (event.target.closest('.footer-dial-help')) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    const header = event.target.closest('.dialkit-folder-header-top');
    if (!header || header.getAttribute('aria-expanded') !== 'false') return;
    const name = header.querySelector('.dialkit-folder-title')?.textContent.trim();
    if (name === 'Beginning' || name === 'End') kit.setValue('preview', name === 'Beginning' ? 'frosted' : 'clear');
  }
  root.element.addEventListener('click', previewFolder, true);
  root.element.addEventListener('keydown', previewFolder, true);
  input.addEventListener('change', async () => {
    try { if (!input.files[0]) return; api.import(JSON.parse(await input.files[0].text())); restoreControls(); notify('Device profiles restored.'); }
    catch (error) { notify(error.message); }
    finally { input.value = ''; }
  });
  const destroyHelp = installFooterHelp(root.element, {
    numberStep: path => path.split('.').reduce((control, key) => control?.[key], controls)?.[3],
    onNumberEdit: (path, value) => kit.setValue(path, value),
  });
  return () => { destroyHelp(); clearTimeout(statusTimer); status.remove(); unsubscribe(); root.element.removeEventListener('click', previewFolder, true); root.element.removeEventListener('keydown', previewFolder, true); kit.destroy(); root.destroy(); };
}
