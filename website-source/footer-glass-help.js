const HELP = {
  Framing: 'These settings belong to the current device profile: phone up to 640px, tablet up to 1024px, and desktop above that. Changing one profile leaves the other two alone.',
  'Scene Height': 'Height of this section as a percentage of the stable viewport height. 100 fills one screen. It does not stretch the video.',
  'Section Offset': 'Where this whole section begins relative to Featured Work, in percent of viewport height. Negative starts it higher and closes the gap; positive starts it lower. This device only. The video position inside the section is controlled separately by Vertical.',
  'Video Size': 'Uniform scale of the complete video. 1 is the natural full-cover framing; lower makes the character smaller, higher zooms in. The original proportions are preserved.',
  Horizontal: 'Horizontal position as a percentage of the section width. Positive moves the video right; negative moves it left.',
  Vertical: 'Vertical position as a percentage of the section height. Positive moves the video down; negative moves it up.',
  'Top Feather': 'Length of the soft arrival from the page above, measured as a percentage of section height. Higher makes the whole surface enter more gradually. It feathers the background, figure and fog together. Tint Feather separately softens the colour overlay.',
  Colour: 'One Surface Colour controls the background, mist, lingering fog, tint and lower feather. Background Removal reduces the original grey studio backdrop without applying that colour to the skin. Beginning and End Tint still set the overlay strength.',
  'Surface Colour': 'The shared colour of the entire atmosphere: background, mist, patches, lower haze and tint. The same colour is used at Beginning and End; only strength changes. You can paste a six-digit hex colour or use the picker.',
  'Background Removal': 'Reduces the grey studio background so Surface Colour shows behind the figure. 1 is full removal; 0 keeps the original video. This is a soft grey key with a protected facial core, not a precise traced cutout. Reflective metal may blend with the new background.',
  'Background Softness': 'Softness of the grey-background key. Higher blends more neutral edge colours into the chosen background; lower retains more edge detail. Use with Background Removal while checking the metal and head outline.',
  'Tint Feather': 'How far down the section the tint softly builds from zero to its Beginning or End strength. Higher delays full colour near the top. This keeps the colour overlay from creating a line at the page transition.',
  Fog: 'Uneven patches of mist stay over the forehead, cheeks and neck while the eyes become clearer. This layer follows Video Size and position. It remains at the End, instead of the whole surface clearing evenly.',
  'Lingering Fog': 'Strength of the cloudy patches that remain after the timed reveal. Higher conceals more of the face and neck. Zero removes this layer. The Beginning and End Mist values control the separate, overall haze.',
  'Eye Clarity': 'How much the lingering fog opens around the eyes and a small area of the cheek. Higher reveals these details while leaving other patches concealed. The Beginning Blur still holds back detail on arrival.',
  'Patch Scale': 'Size of the irregular cloudy patches. Higher makes broader clouds; lower makes smaller pockets. The clearer eye area stays in the same place on the video.',
  'Edge Feather': 'Soft blending at the left and right edges of the video, measured as a percentage of its width. Helps smaller video framing blend into the selected Surface Colour.',
  'Bottom Fog': 'Extra static haze across the lower neck and shoulders. Higher conceals more of the lower crop. This remains after the timed reveal.',
  Timing: 'Hold Beginning for Delay seconds, clear toward End over Duration seconds, then return smoothly to Beginning over the same duration. This cycle repeats while Contact is in view. Leaving Contact, hiding the tab or opening the showreel stops and resets it; returning starts foggy again. Buffering only pauses it.',
  Delay: 'Seconds held at the foggy Beginning before each clearing pass. The approved starting value is 3.9 seconds. Only visible, playing video counts.',
  Duration: 'Seconds for each direction: Beginning to End, then End back to Beginning. The full cycle takes Delay plus twice Duration. Halfway previews the middle of the clearing pass. The shorter video repetition stays independent.',
  Beginning: 'Set how the surface looks on arrival. Opening or editing this group automatically previews the Beginning. The transition calculates every in-between look for you.',
  End: 'Set the clearest point of the cycle, before the surface returns smoothly to Beginning. Opening or editing this group holds the End preview. It can retain blur, frost and the separate Fog patches.',
  Blur: 'Blur radius in pixels for this look. Higher conceals facial detail more strongly; zero is sharp. The other endpoint keeps its own setting.',
  Mist: 'Haze in your selected Surface Colour, from 0 to 1. Higher conceals the figure more strongly. This changes density, without introducing a second colour.',
  Tint: 'Strength of the selected Surface Colour over the figure, from 0 to 1. It is uniform below the Tint Feather. The background, mist and lower fog use the same colour independently of this strength.',
  Frost: 'Static glass texture strength for this look. Set Beginning and End independently; the transition blends between them.',
  Advanced: 'Optional texture, side feather and lower crop controls. The atmosphere colour is in Colour, where one colour applies throughout the surface.',
  Grain: 'Fine static surface grain. It remains throughout the reveal. High settings make the surface rougher; low settings feel smoother.',
  Preview: 'Beginning and End hold your two saved looks. Halfway holds the middle of the clearing pass. Live transition repeats Beginning to End to Beginning while you watch. The video keeps playing in every preview.',
  'Play from beginning': 'Returns to the live surface cycle: foggy Beginning, Delay, clearing to End, then back to Beginning. Repeats until you leave Contact. Leaving also resets the video itself.',
  Settings: 'Save or restore all device profiles. Values save automatically in this browser while tuning.',
  'Reset this device': 'Restores the starting values only for the current desktop, tablet or phone profile. Other device profiles stay saved.',
  'Download settings': 'Downloads one JSON file containing all three device profiles, ready to keep or send back for approval.',
  'Import settings': 'Restores device profiles from a Footer Glass JSON file. Existing values are validated and limited to the supported control ranges.',
};

export function installFooterHelp(root, { numberStep, onNumberEdit, help = HELP, tooltipId = 'footer-glass-help', tooltipTarget = document.body } = {}) {
  const tip = document.createElement('div');
  tip.id = tooltipId; tip.className = 'footer-dial-tooltip'; tip.role = 'tooltip'; tip.hidden = true;
  tooltipTarget.append(tip);
  const attached = new WeakMap();
  const numberObservers = [];
  let active, pinned = false;
  function hide() { active?.removeAttribute('aria-describedby'); active = null; pinned = false; tip.hidden = true; }
  function show(button, text) {
    active?.removeAttribute('aria-describedby'); active = button;
    button.setAttribute('aria-describedby', tip.id); tip.textContent = text; tip.hidden = false;
    const b = button.getBoundingClientRect();
    tip.style.left = `${Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, b.right - tip.offsetWidth))}px`;
    tip.style.top = `${Math.max(8, b.top - tip.offsetHeight - 8 < 8 ? Math.min(innerHeight - tip.offsetHeight - 8, b.bottom + 8) : b.top - tip.offsetHeight - 8)}px`;
  }
  function annotate() {
    const labels = root.querySelectorAll('.dialkit-slider-label,.dialkit-folder-title,.dialkit-color-label,.dialkit-select-label,.dialkit-text-label,.dialkit-button');
    for (const label of labels) {
      if (attached.get(label)?.isConnected) continue;
      const name = label.textContent.trim();
      const text = help[name] || (name.startsWith('Footer Glass') ? 'Set Beginning and End, choose a duration, then Play from beginning. Click any number to type a value immediately, or drag its slider. Fog controls the patches that stay concealed. Each device profile saves independently.' : '');
      if (!text) continue;
      if (label.matches('.dialkit-slider-label')) {
        const track = label.closest('.dialkit-slider');
        const original = track.querySelector('input');
        track.querySelector('.dialkit-slider-value').classList.add('footer-native-hidden');
        original.classList.add('footer-native-hidden'); original.setAttribute('aria-hidden', 'true'); original.tabIndex = -1;
        const field = document.createElement('input'); field.type = 'number'; field.inputMode = 'decimal'; field.step = 'any';
        field.className = 'footer-number-input'; field.setAttribute('aria-label', `${name} value`);
        field.min = track.getAttribute('aria-valuemin'); field.max = track.getAttribute('aria-valuemax');
        field.value = track.getAttribute('aria-valuenow');
        const folder = label.closest('.dialkit-folder');
        const title = folder.querySelector(':scope > .dialkit-folder-header .dialkit-folder-title').textContent.trim();
        const group = title.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase());
        const camel = name.replace(/\s+(\w)/g, (_, c) => c.toUpperCase());
        const path = `${group}.${camel[0].toLowerCase()}${camel.slice(1)}`;
        field.step = String(numberStep?.(path) ?? 'any');
        const sync = () => { if (document.activeElement !== field) field.value = track.getAttribute('aria-valuenow'); };
        field.addEventListener('input', () => {
          if (!field.value.trim()) return;
          const value = Number(field.value);
          if (Number.isFinite(value)) onNumberEdit?.(path, Math.max(Number(field.min), Math.min(Number(field.max), value)));
        });
        field.addEventListener('blur', () => { field.value = track.getAttribute('aria-valuenow'); });
        field.addEventListener('pointerdown', e => e.stopPropagation());
        field.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') field.blur(); });
        track.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); field.focus(); field.select(); } }, true);
        track.parentElement.append(field);
        const numbers = new MutationObserver(sync); numbers.observe(track, { attributes: true, attributeFilter: ['aria-valuenow'] }); numberObservers.push(numbers);
      }
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'footer-dial-help'; button.textContent = '?'; button.setAttribute('aria-label', `About ${name}`);
      button.addEventListener('pointerdown', e => e.stopPropagation());
      button.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') hide(); });
      button.addEventListener('click', e => { e.stopPropagation(); if (active === button && pinned) hide(); else { pinned = true; show(button, text); } });
      button.addEventListener('mouseenter', () => { if (!pinned) show(button, text); });
      button.addEventListener('mouseleave', () => { if (!pinned) hide(); });
      button.addEventListener('focus', () => { if (!pinned) show(button, text); });
      button.addEventListener('blur', () => { if (!pinned) hide(); });
      if (label.matches('.dialkit-folder-title')) label.parentElement.append(button);
      else if (label.matches('.dialkit-text-label')) {
        const control = label.closest('.dialkit-text-control');
        const row = document.createElement('div');
        row.className = 'footer-text-help-row';
        control.before(row); row.append(control, button);
      } else if (label.matches('.dialkit-button')) {
        const row = document.createElement('div'); row.className = 'footer-action-row';
        label.before(row); row.append(button, label);
      }
      else {
        const row = label.closest('.dialkit-slider-wrapper,.dialkit-color-control,.dialkit-select-row') || label.parentElement;
        row.classList.add('footer-help-row'); row.append(button);
      }
      attached.set(label, button);
    }
  }
  const outside = e => { if (active && !active.contains(e.target) && !tip.contains(e.target)) hide(); };
  const escape = e => { if (e.key === 'Escape') hide(); };
  const observer = new MutationObserver(annotate); observer.observe(root, { childList: true, subtree: true }); annotate();
  document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', escape);
  window.addEventListener('scroll', hide, { passive: true });
  return () => { observer.disconnect(); numberObservers.forEach(observer => observer.disconnect()); tip.remove(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', hide); };
}
