export function createVideoLoader(container, video) {
  const indicator = document.createElement('span');
  indicator.className = 'video-loading-dots';
  indicator.setAttribute('role', 'status');
  indicator.innerHTML = '<span class="sr-only">Loading video</span><span class="video-loading-dot" aria-hidden="true"></span><span class="video-loading-dot" aria-hidden="true"></span><span class="video-loading-dot" aria-hidden="true"></span>';
  indicator.hidden = true;
  container.append(indicator);

  let requested = false;
  let delay;
  function hide() {
    clearTimeout(delay);
    delay = undefined;
    indicator.hidden = true;
  }
  function wait() {
    if (!requested || delay !== undefined || !indicator.hidden) return;
    delay = setTimeout(() => {
      delay = undefined;
      indicator.hidden = false;
    }, 180);
  }
  function stop() {
    requested = false;
    hide();
  }
  video.addEventListener('waiting', wait);
  video.addEventListener('playing', hide);
  for (const event of ['pause', 'ended', 'error']) video.addEventListener(event, stop);
  return {
    start() { requested = true; wait(); },
    stop,
  };
}
