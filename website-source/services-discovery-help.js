const HELP = {
  Arrival: 'Colour and headings arrive on one shared clock. Visual Design appears first, then Creative Direction, then Digital Experiences. Their layout positions stay fixed.',
  'Heading Delay': 'Seconds after colour starts before the first heading begins appearing. Zero starts the first heading with the colour.',
  'Heading Stagger': 'Seconds between successive headings. Higher spaces out Visual Design, Creative Direction and Digital Experiences more distinctly.',
  'Heading Fade': 'Seconds for each heading to become fully visible. This changes opacity only, keeping every heading in its final position.',
  Start: 'Colour starts preparing when the top of the scene reaches this fraction of the screen height. Lower means you scroll further before colour arrives.',
  Delay: 'Seconds between entering the scene and the start of the colour and heading sequence.',
  Fade: 'Seconds for the colour to fade in after the delay. Higher gives a slower introduction.',
  Surface: 'The frosted material and its gradual fade into and out of the normal page.',
  Frost: 'Strength of the frosted texture. Higher feels more textured; zero removes this texture while keeping the colour flow.',
  Grain: 'Amount of fine surface grain. Higher adds speckle; lower looks smoother.',
  Veil: 'A light wash over the material. Higher softens the colours; zero keeps their original strength.',
  'Colour Strength': 'Opacity of the moving colour pools. Higher gives stronger colour against the blue base.',
  'Transition Distance': 'Length of the entrance fade, measured in screen heights. Higher starts earlier and spreads the transition over more scrolling.',
  'Exit Distance': 'Length of the fade back to the normal page, measured in screen heights. Higher makes the exit more gradual.',
  Smoothing: 'Seconds used to soften changes from wheel or trackpad scrolling. Higher feels slower; zero follows scrolling immediately.',
  Colour: 'The same source colours used in the homepage active state. Changes here affect Services only.',
  'Base Highlight': 'The lighter blue in the underlying homepage colour field.',
  'Base Colour': 'The main blue beneath the moving colour pools.',
  Coral: 'Colour of the coral pool, towards the right in the desktop composition.',
  Amber: 'Colour of the pale warm pool near the lower centre on desktop.',
  Orange: 'Colour of the warm orange pool that blends with the coral and amber.',
  Terracotta: 'Colour of the smaller warm pool towards the upper right on desktop.',
  Rose: 'Colour of the soft rose pool towards the upper left on desktop.',
  Saturation: 'Colour vividness. One keeps the original palette; lower is muted and higher is more vivid.',
  Flow: 'How the colour pools travel beneath the stationary frost.',
  Period: 'Seconds for one complete colour journey out and back. Higher means slower movement.',
  Movement: 'Distance and rotation of colour travel. Zero holds the pools still; one uses the homepage movement range.',
  Spread: 'Size of the individual colour pools. Higher blends them across a larger area; lower makes smaller, more distinct pools.',
  Focus: 'Readability and the small changes in focus on the main headings. Service lists always remain clear after arriving.',
  Clarity: 'Minimum sharpness of every heading. Keep this near one for strong legibility. One keeps all the lettering sharp.',
  Blur: 'Blur radius around the soft copy of each heading, in pixels. Lower is sharper; zero removes this softness.',
  Drift: 'How far the areas of focus move across the lettering. Zero stops this movement.',
  'Soft Ink': 'Visibility of the soft lettering beneath the sharp layer. Higher adds a stronger soft edge.',
  Type: 'Heading size, letter spacing and line spacing, plus the size of service lists.',
  'Desktop Size': 'Maximum heading size on desktop and tablet, in percent of screen height. Available screen width can limit the size.',
  'Phone Size': 'Maximum phone heading size, in percent of screen width. Short screens also limit this to keep words readable.',
  'List Scale': 'Size multiplier for service-list text on every device. One is the default; higher makes the lists larger.',
  Tracking: 'Desktop and tablet letter spacing, relative to font size. More negative pulls letters closer together.',
  'Phone Tracking': 'Phone letter spacing. More negative pulls letters closer together.',
  Leading: 'Line-height multiplier for desktop and tablet headings. Higher gives wrapped lines more breathing room.',
  'Phone Leading': 'Line-height multiplier for wrapped phone headings. Higher increases the gap between lines.',
  Spacing: 'Scene height and the spacing of revealed lists. Position each heading in its own named group below.',
  'Scene Height': 'Height of the Services scene on desktop and tablet, as a percentage of screen height. Higher provides more vertical space.',
  'Phone Scene Height': 'Phone scene height as a percentage of screen height. Phone Min Height can keep short screens taller than this.',
  'Phone Min Height': 'Minimum portrait-phone scene height in pixels. This prevents revealed lists from overlapping on shorter phones.',
  'Heading Gap': 'Space in pixels between each heading and its service list on desktop and tablet.',
  'Item Gap': 'Extra space in pixels between service-list rows on desktop and tablet.',
  'Phone Heading Gap': 'Space in pixels between a phone heading and its service list.',
  'Phone Item Gap': 'Extra space in pixels between service-list rows on phones.',
  Reveal: 'How service-list rows arrive, remain readable and fade away after activation.',
  Appear: 'Seconds for each service row to become fully clear. Higher gives a slower arrival.',
  Stagger: 'Seconds between the start of successive service rows. Higher creates a more spaced rhythm.',
  Reading: 'Seconds the complete list stays readable after its last row arrives. Another activation extends this time.',
  Conceal: 'Seconds for each service row to disappear after the reading time.',
  'Conceal Stagger': 'Seconds between disappearing rows. They leave in reverse order.',
  Bloom: 'The soft coloured bloom from the homepage, originating at your click or tap. No ring outlines.',
  Strength: 'Peak visibility of the coloured bloom. The homepage default is 0.7.',
  Duration: 'Bloom duration in seconds. The homepage default is 1.9 seconds.',
  Size: 'Bloom size multiplier. One matches the homepage proportions.',
  Visual: 'Position of Visual Design on desktop and tablet.',
  Direction: 'Position of Creative Direction on desktop and tablet.',
  'Digital Experiences': 'Position of Digital Experiences on desktop and tablet.',
  'Phone Visual': 'Position of Visual Design on phones only.',
  'Phone Direction': 'Position of Creative Direction on phones only.',
  'Phone Digital Experiences': 'Position of Digital Experiences on phones only.',
  'Left Inset': 'Distance from the left edge of the scene, in percent of its width. Higher moves the heading right.',
  'Right Inset': 'Distance from the right edge of the scene, in percent of its width. Higher moves the heading left.',
  Top: 'Vertical position in percent of the usable layout area. Higher moves the heading and its list down.',
};

export function installDialHelp() {
  const tip = document.createElement('div');
  tip.className = 'services-dial-tooltip'; tip.id = 'services-dial-tooltip';
  tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.append(tip);
  let active, pinned = false;
  const attached = new WeakMap();
  const hide = () => { active?.removeAttribute('aria-describedby'); active = null; pinned = false; tip.hidden = true; };
  function show(button, text) {
    active?.removeAttribute('aria-describedby'); active = button;
    button.setAttribute('aria-describedby', tip.id); tip.textContent = text; tip.hidden = false;
    const box = button.getBoundingClientRect();
    tip.style.left = `${Math.max(12, Math.min(innerWidth - tip.offsetWidth - 12, box.left - tip.offsetWidth + box.width))}px`;
    tip.style.top = `${Math.max(12, box.top - tip.offsetHeight - 8 < 12 ? Math.min(innerHeight - tip.offsetHeight - 12, box.bottom + 8) : box.top - tip.offsetHeight - 8)}px`;
  }
  function annotate() {
    document.querySelectorAll('.dialkit-root .dialkit-slider-label, .dialkit-root .dialkit-color-label, .dialkit-root .dialkit-folder-title').forEach(label => {
      if (attached.get(label)?.isConnected) return;
      const name = label.textContent.trim(), text = HELP[name];
      if (!text) return;
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'services-dial-help'; button.textContent = '?'; button.setAttribute('aria-label', `About ${name}`);
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('keydown', event => { event.stopPropagation(); if (event.key === 'Escape') hide(); });
      button.addEventListener('click', event => { event.stopPropagation(); if (active === button && pinned) hide(); else { pinned = true; show(button, text); } });
      button.addEventListener('mouseenter', () => { if (!pinned) show(button, text); });
      button.addEventListener('mouseleave', () => { if (!pinned) hide(); });
      button.addEventListener('focus', () => { if (!pinned) show(button, text); });
      button.addEventListener('blur', () => { if (!pinned) hide(); });
      if (label.classList.contains('dialkit-slider-label')) {
        const wrapper = label.closest('.dialkit-slider-wrapper');
        wrapper.style.position = 'relative';
        button.classList.add('services-slider-help');
        wrapper.append(button);
      } else label.append(button);
      attached.set(label, button);
    });
  }
  const outside = event => { if (active && !active.contains(event.target) && !tip.contains(event.target)) hide(); };
  document.addEventListener('pointerdown', outside, true);
  const key = event => { if (event.key === 'Escape') hide(); };
  document.addEventListener('keydown', key);
  const observer = new MutationObserver(annotate);
  document.querySelectorAll('.dialkit-root').forEach(root => observer.observe(root, {childList:true, subtree:true}));
  annotate();
  return () => { observer.disconnect(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key); tip.remove(); };
}
