import { isHandheld } from './device-profile.js';
import { syncVideoTransport } from './video-transport.js';
import { createVideoLoader } from './video-loading.js';

export function initProjectVideoPlayer(frame) {
  if (!frame) return;
  const video = frame.querySelector('video');
  const launch = frame.querySelector('.reel-launch');
  const controls = frame.querySelector('.reel-player');
  const loader = createVideoLoader(frame, video);
  const play = frame.querySelector('.reel-pause');
  const mute = frame.querySelector('.reel-mute');
  const volume = frame.querySelector('.reel-volume');
  const seek = frame.querySelector('.reel-seek');
  const elapsed = frame.querySelector('.reel-elapsed');
  const duration = frame.querySelector('.reel-duration');
  const status = frame.querySelector('.reel-status');
  let previousVolume = 1;
  let context;
  let gain;
  let soundtrackHeld = false;
  let hideTimer;
  let pointerOnControl = false;

  function showControls() {
    if (controls.hidden) return;
    controls.classList.add('controls-visible');
    clearTimeout(hideTimer);
    if (video.paused || video.ended || pointerOnControl) return;
    hideTimer = setTimeout(() => {
      const keyboardFocus = controls.dataset.input === 'keyboard' && controls.contains(document.activeElement);
      if (!keyboardFocus) controls.classList.remove('controls-visible');
    }, isHandheld() ? 1200 : 1800);
  }

  function holdSoundtrack(hold) {
    if (soundtrackHeld === hold) return;
    soundtrackHeld = hold;
    document.dispatchEvent(new Event(hold ? 'showreel:open' : 'showreel:close'));
  }

  function time(seconds) {
    const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    return [Math.floor(value / 60), value % 60].map(part => String(part).padStart(2, '0')).join(':');
  }

  function sync() {
    syncVideoTransport(play, video.paused, 'Echo');
    seek.disabled = !Number.isFinite(video.duration);
    seek.max = seek.disabled ? 1 : video.duration;
    seek.value = video.currentTime;
    elapsed.textContent = time(video.currentTime);
    duration.textContent = time(video.duration);
    seek.setAttribute('aria-valuetext', elapsed.textContent + ' of ' + duration.textContent);
    mute.setAttribute('aria-label', video.muted ? 'Unmute Echo' : 'Mute Echo');
    mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" d="' +
      (video.muted ? 'm17 9 5 6m0-6-5 6' : 'M16 8q4 4 0 8m3-11q7 7 0 14') + '"/></svg>';
  }

  function setVolume(value) {
    if (value > 0) previousVolume = value;
    volume.value = value;
    if (gain) gain.gain.value = value;
    else video.volume = value;
    video.muted = value === 0;
    sync();
    showControls();
  }

  function start() {
    launch.hidden = true;
    controls.hidden = false;
    showControls();
    try {
      if (!context && window.AudioContext) {
        context = new AudioContext();
        const volumeGain = context.createGain();
        volumeGain.gain.value = Number(volume.value);
        video.volume = 1;
        context.createMediaElementSource(video).connect(volumeGain).connect(context.destination);
        gain = volumeGain;
      }
      context?.resume().catch(() => {});
    } catch { /* Use native video audio when Web Audio is unavailable. */ }
    status.textContent = '';
    if (video.error) video.load();
    loader.start();
    holdSoundtrack(true);
    video.play().catch(error => {
      loader.stop();
      if (error.name !== 'AbortError') status.textContent = 'Playback could not start. Press play to try again.';
      if (video.paused) holdSoundtrack(false);
      showControls();
    });
  }

  function pause() {
    loader.stop();
    video.pause();
    holdSoundtrack(false);
    showLaunch();
  }

  function showLaunch() {
    if (controls.hidden) return;
    clearTimeout(hideTimer);
    pointerOnControl = false;
    controls.hidden = true;
    launch.hidden = false;
    status.textContent = '';
    sync();
  }

  function toggle() {
    if (video.paused) start();
    else pause();
  }

  launch.addEventListener('click', () => {
    start();
    play.focus({ preventScroll: true });
  });
  frame.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') showControls(); });
  frame.addEventListener('pointerdown', event => {
    controls.dataset.input = 'pointer';
    pointerOnControl = controls.contains(event.target);
    showControls();
  });
  function releaseControl() {
    if (!pointerOnControl) return;
    pointerOnControl = false;
    showControls();
  }
  window.addEventListener('pointerup', releaseControl);
  window.addEventListener('pointercancel', releaseControl);
  frame.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible')) controls.dataset.input = 'keyboard';
    showControls();
  });
  frame.addEventListener('focusout', showControls);
  frame.addEventListener('keydown', () => {
    controls.dataset.input = 'keyboard';
    showControls();
  });
  play.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  mute.addEventListener('click', () => setVolume(video.muted ? previousVolume : 0));
  volume.addEventListener('input', () => setVolume(Number(volume.value)));
  seek.addEventListener('input', () => {
    if (!seek.disabled) video.currentTime = Number(seek.value);
    showControls();
  });
  for (const event of ['timeupdate', 'durationchange', 'volumechange']) video.addEventListener(event, sync);
  video.addEventListener('playing', () => { sync(); showControls(); });
  for (const event of ['pause', 'ended', 'error']) video.addEventListener(event, () => {
    if (video.paused || video.ended || video.error) holdSoundtrack(false);
    if (event.type === 'ended') showLaunch();
    if (video.error && !controls.hidden) status.textContent = 'The video could not load.';
    sync();
    showControls();
  });
  window.addEventListener('blur', () => { releaseControl(); pause(); });
  window.addEventListener('pagehide', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  sync();
  return { video, pause };
}
