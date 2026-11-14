const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h3v16H7zm7 0h3v16h-3z"/></svg>';

export function syncVideoTransport(button, paused, title) {
  const label = `${paused ? 'Play' : 'Pause'} ${title}`;
  if (button.firstElementChild && button.getAttribute('aria-label') === label) return;
  button.setAttribute('aria-label', label);
  button.innerHTML = paused ? playIcon : pauseIcon;
}
