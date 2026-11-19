import './dial-help.css';

let nextTip = 0;

export function installTuningHelp(root, explanations) {
  const tip = document.createElement('div');
  tip.className = 'dial-help-tip';
  tip.id = `dial-help-${++nextTip}`;
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  const attached = new WeakMap();
  let active, pinned = false;

  function hide() {
    active?.removeAttribute('aria-describedby');
    active = undefined;
    pinned = false;
    tip.hidden = true;
  }

  function show(button, text) {
    active?.removeAttribute('aria-describedby');
    active = button;
    button.setAttribute('aria-describedby', tip.id);
    tip.textContent = text;
    tip.hidden = false;
    const box = button.getBoundingClientRect();
    tip.style.left = `${Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, box.right - tip.offsetWidth))}px`;
    const above = box.top - tip.offsetHeight - 8;
    tip.style.top = `${Math.max(8, above >= 8 ? above : Math.min(innerHeight - tip.offsetHeight - 8, box.bottom + 8))}px`;
  }

  function annotate() {
    const selector = '.dialkit-slider-label, .dialkit-folder-title, .dialkit-select-label, .dialkit-color-label, .dialkit-labeled-control-label, .dialkit-button, [data-help]';
    for (const label of root.querySelectorAll(selector)) {
      if (attached.get(label)?.isConnected) continue;
      const name = label.dataset.help || label.textContent.trim();
      const text = explanations[name];
      if (!text) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dial-help-button';
      button.textContent = '?';
      button.setAttribute('aria-label', `About ${name}`);
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Escape') hide();
      });
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (active === button && pinned) hide();
        else { pinned = true; show(button, text); }
      });
      button.addEventListener('mouseenter', () => { if (!pinned) show(button, text); });
      button.addEventListener('mouseleave', () => { if (!pinned) hide(); });
      button.addEventListener('focus', () => { if (!pinned) show(button, text); });
      button.addEventListener('blur', () => { if (!pinned) hide(); });
      const slider = label.closest('.dialkit-slider-wrapper');
      const control = label.closest('button, [role="button"]');
      if (slider) {
        slider.classList.add('dial-with-slider-help');
        slider.append(button);
      } else if (label.matches('.dialkit-button')) {
        const row = document.createElement('div');
        row.className = 'dial-with-help';
        label.replaceWith(row);
        row.append(label, button);
      } else if (control && control !== label) {
        control.parentElement.classList.add('dial-with-help');
        control.after(button);
        if (label.matches('.dialkit-select-label')) control.setAttribute('aria-label', name);
      } else {
        label.parentElement.classList.add('dial-with-help');
        label.after(button);
      }
      attached.set(label, button);
    }
    if (active && !active.isConnected) hide();
  }

  const events = new AbortController();
  const { signal } = events;
  document.addEventListener('pointerdown', event => {
    if (active && !active.contains(event.target) && !tip.contains(event.target)) hide();
  }, { capture: true, signal });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); }, { signal });
  window.addEventListener('resize', hide, { signal });
  root.addEventListener('scroll', () => {
    if (active) show(active, tip.textContent);
  }, { capture: true, passive: true, signal });
  const observer = new MutationObserver(annotate);
  observer.observe(root, { childList: true, subtree: true });
  annotate();
  return () => {
    hide();
    events.abort();
    observer.disconnect();
    root.querySelectorAll('.dial-help-button').forEach(button => button.remove());
    tip.remove();
  };
}
