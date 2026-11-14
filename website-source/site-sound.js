import { playBloomSound } from './interaction-sound.js';
import { isHandheld, deviceProfile } from './device-profile.js';

const audio = document.querySelector('#background-music');
let headerTuningMounted = false;
let toggle;
let status;
let playing = false;
const track = new URL('./assets/audio/ocean-exploration-seamless.m4a', import.meta.url).href;
const heartbeat = new Audio();
heartbeat.loop = true;
heartbeat.preload = 'none';
heartbeat.playbackRate = 1.12;
heartbeat.preservesPitch = true;
let heartbeatLevel;
let menuOpen = false;
let heartbeatRevision = 0;
let heartbeatPauseTimer;
// Owner-approved heartbeat source gain, before the shared music/master buses.
let heartbeatTrim = 10 ** (13 / 20);

export function setHeartbeatTrimDb(decibels) {
  if (!Number.isFinite(decibels)) return;
  heartbeatTrim = 10 ** (Math.max(-12, Math.min(18, decibels)) / 20);
  syncHeartbeat();
}

export function setMenuHeartbeat(open) {
  menuOpen = open;
  syncHeartbeat();
}

function syncHeartbeat() {
  const run = ++heartbeatRevision;
  clearTimeout(heartbeatPauseTimer);
  const enabled = (menuOpen || footerDepth > .05) && requested && playing && pageActive() && !reelPlaying;
  if (!heartbeatLevel) return;
  heartbeatLevel.gain.setTargetAtTime(enabled ? heartbeatTrim : 0, context.currentTime, enabled ? .3 : .14);
  if (!enabled) {
    heartbeatPauseTimer = setTimeout(() => {
      if (run !== heartbeatRevision) return;
      heartbeat.pause();
      heartbeat.currentTime = 0;
    }, 700);
    return;
  }
  if (!heartbeat.hasAttribute('src')) heartbeat.src = new URL('./assets/audio/heartbeat-menu.m4a', import.meta.url).href;
  if (heartbeat.error) heartbeat.load();
  heartbeat.play().then(() => {
    if (run !== heartbeatRevision && !((menuOpen || footerDepth > .05) && requested && playing && pageActive() && !reelPlaying)) heartbeat.pause();
  }).catch(() => {
    if (run === heartbeatRevision) heartbeatLevel.gain.setTargetAtTime(0, context.currentTime, .05);
  });
}
// About 10 dB below the previous 0.3 amplitude. GainNode works on iOS too.
const atmosphereLevel = 0.3 * 10 ** (-10 / 20);
// One master bus lowers music and every interaction by exactly 2.5 dB.
const siteAudioLevel = 10 ** (-2.5 / 20);
let context;
let master;
let atmosphere;
let sceneFilter;
let sceneLevel;
let roomReturn;
let effects;
let requested = false;
let revision = 0;
let pauseTimer;
let reelPlaying = false;
const pageActive = () => !document.hidden && document.hasFocus();

let menuDepth = 0;
let footerDepth = 0;
let footerThaw = 0;
export const soundDials = {
  tone: { shelfFrequencyHz: [1100, 250, 4500, 25] },
  menu: { muffleDb: [27, 0, 36, .5], liftDb: [1, 0, 12, .5] },
  frostedFooter: { muffleDb: [25, 0, 36, .5], liftDb: [.5, 0, 12, .5], roomPercent: [7, 0, 30, 1] },
  thawedFooter: { muffleDb: [0, 0, 36, .5], liftDb: [.5, 0, 12, .5], roomPercent: [0, 0, 30, 1] },
};
let soundMix = Object.fromEntries(Object.entries(soundDials).map(([group, fields]) => [
  group, Object.fromEntries(Object.entries(fields).map(([name, [value]]) => [name, value])),
]));
let sceneFrequency;
let sceneTreble;
let sceneRoom;
let sceneBoost;

export function setSoundMix(values) {
  soundMix = values;
  updateAtmosphere(.2);
}

function updateAtmosphere(seconds, immediate = false) {
  if (!sceneFilter) return;
  const { tone, menu, frostedFooter, thawedFooter } = soundMix;
  const footerWeight = footerDepth * (1 - menuDepth);
  const footerMix = name => frostedFooter[name] + (thawedFooter[name] - frostedFooter[name]) * footerThaw;
  const frequency = tone.shelfFrequencyHz;
  const treble = -menu.muffleDb * menuDepth - footerMix('muffleDb') * footerWeight;
  const room = footerMix('roomPercent') * footerWeight / 100;
  // Lift the music along with the muffling, then let it settle as the glass clears.
  const boost = menu.liftDb * menuDepth + footerMix('liftDb') * footerWeight;
  const now = context.currentTime;
  const glide = (param, value) => {
    if (immediate) param.value = value;
    else param.setTargetAtTime(value, now, seconds / 4);
  };
  if (frequency !== sceneFrequency || immediate) glide(sceneFilter.frequency, frequency);
  if (treble !== sceneTreble || immediate) glide(sceneFilter.gain, treble);
  if (room !== sceneRoom || immediate) glide(roomReturn.gain, room);
  if (boost !== sceneBoost || immediate) glide(sceneLevel.gain, 10 ** (boost / 20));
  sceneFrequency = frequency;
  sceneTreble = treble;
  sceneRoom = room;
  sceneBoost = boost;
}

export function setMenuAtmosphere(depth, seconds = .14) {
  if (menuDepth === depth) return;
  menuDepth = depth;
  updateAtmosphere(seconds);
}

export function setFooterAtmosphere(depth, thaw, duration) {
  if (footerDepth === depth && footerThaw === thaw) return;
  const thawingInPlace = footerDepth === depth;
  footerDepth = depth;
  footerThaw = thaw;
  syncHeartbeat();
  updateAtmosphere(thawingInPlace ? Math.max(.3, duration / 1000) : .85);
}

function createRoomResponse() {
  // A short, diffuse stereo tail with a soft onset, built once when sound is enabled.
  const rate = context.sampleRate;
  const response = context.createBuffer(2, Math.ceil(rate * .9), rate);
  const start = Math.ceil(rate * .022);
  for (let channel = 0; channel < response.numberOfChannels; channel++) {
    const samples = response.getChannelData(channel);
    let noise = 0;
    for (let i = start; i < samples.length; i++) {
      const time = (i - start) / rate;
      noise = .65 * noise + .35 * (2 * Math.random() - 1);
      samples[i] = noise * Math.min(1, time / .03) * Math.exp(-time * 8);
    }
  }
  return response;
}

function prepareAudio() {
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = siteAudioLevel;
    master.connect(context.destination);
    atmosphere = context.createGain();
    atmosphere.gain.value = 0;
    heartbeatLevel = context.createGain();
    heartbeatLevel.gain.value = 0;
    context.createMediaElementSource(heartbeat).connect(heartbeatLevel).connect(atmosphere);
    effects = context.createGain();
    effects.gain.value = 0;
    effects.connect(master);
    sceneFilter = context.createBiquadFilter();
    sceneFilter.type = 'highshelf';
    const room = context.createConvolver();
    room.buffer = createRoomResponse();
    roomReturn = context.createGain();
    sceneLevel = context.createGain();
    sceneFilter.connect(room).connect(roomReturn).connect(sceneLevel);
    context.createMediaElementSource(audio).connect(sceneFilter).connect(sceneLevel).connect(atmosphere).connect(master);
    updateAtmosphere(.14, true);
  }
  return context.resume();
}
function fadeTo(value, seconds) {
  const gain = atmosphere.gain;
  const now = context.currentTime;
  if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
  else gain.cancelScheduledValues(now);
  gain.linearRampToValueAtTime(value, now + seconds);
}
function reflectToggle() {
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', String(playing));
  toggle.setAttribute('aria-label', playing ? 'Turn site sound off' : 'Turn site sound on');
}

function reflectPlayback(next) {
  playing = next;
  reflectToggle();
  if (effects) effects.gain.setTargetAtTime(playing ? 1 : 0, context.currentTime, 0.055);
  syncHeartbeat();
}

async function setSound(next) {
  const current = ++revision;
  requested = next;
  clearTimeout(pauseTimer);
  status.textContent = '';
  if (!requested) {
    reflectPlayback(false);
    if (atmosphere) fadeTo(0, 2.6);
    pauseTimer = setTimeout(() => { if (!requested) audio.pause(); }, 2650);
    return;
  }
  if (!pageActive() || reelPlaying) return;
  try {
    // Start both operations in the gesture handler, before awaiting either one.
    const ready = prepareAudio();
    master.gain.value = siteAudioLevel;
    if (!audio.hasAttribute('src')) audio.src = track;
    if (audio.error) audio.load();
    await Promise.all([ready, audio.play()]);
    if (current !== revision || !pageActive() || reelPlaying) return;
    reflectPlayback(true);
    fadeTo(atmosphereLevel, 3.4);
  } catch {
    if (current !== revision) return;
    requested = false;
    reflectPlayback(false);
    status.textContent = 'Music could not play. Please try again.';
  }
}
// Touch devices, including tablets with a connected mouse, opt in with the button.
// Desktop can still unlock sound on the first click unless the user muted it.
const mutedPreference = 'ati-site-sound-muted';
let firstInteraction = true;
try { firstInteraction = sessionStorage.getItem(mutedPreference) !== 'true'; } catch {}
function toggleSound() {
  firstInteraction = false;
  const next = !requested;
  try { sessionStorage.setItem(mutedPreference, String(!next)); } catch {}
  setSound(next);
}
document.addEventListener('click', event => {
  if (!firstInteraction || !event.isTrusted || event.target.closest?.('.sound, .project-inline-player, .project-back')) return;
  if (isHandheld() || !matchMedia('(hover: hover) and (pointer: fine)').matches ||
      event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents) return;
  firstInteraction = false;
  setSound(true);
});
audio.addEventListener('playing', () => {
  if (!pageActive() || reelPlaying || !requested) { audio.pause(); return; }
  reflectPlayback(true);
});
audio.addEventListener('pause', () => reflectPlayback(false));
audio.addEventListener('waiting', () => reflectPlayback(false));
audio.addEventListener('error', () => {
  requested = false;
  reflectPlayback(false);
  status.textContent = 'Music could not load. Please try again.';
});

// Effects share the site sound state and are silent until music is playing.
const interactionTones = {
  hover: { wave: 'sine', high: 460, low: 230, sweep: .065, peak: .065, attack: .018, decay: .17, stop: .2 },
  click: { wave: 'sine', high: 880, low: 540, sweep: .035, peak: .085, attack: .018, decay: .13, stop: .2 },
  tick: { wave: 'triangle', high: 1750, low: 1080, sweep: .018, peak: .05, attack: .003, decay: .042, stop: .05 },
  menuHover: { wave: 'sine', high: 340, low: 208, sweep: .022, peak: .048, attack: .007, decay: .072, stop: .085 },
};
let lastPop = 0;
function playInteraction(kind) {
  if (!pageActive() || !requested || audio.paused || !playing || context?.state !== 'running') return;
  if (kind === 'hover' && performance.now() - lastPop < 90) return;
  if (kind === 'hover') lastPop = performance.now();
  const tone = interactionTones[kind];
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = tone.wave;
  oscillator.frequency.setValueAtTime(tone.high, now);
  oscillator.frequency.exponentialRampToValueAtTime(tone.low, now + tone.sweep);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(tone.peak, now + tone.attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + tone.decay);
  oscillator.connect(envelope).connect(effects);
  oscillator.start(now);
  oscillator.stop(now + tone.stop);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
const boundControls = new WeakSet();

export function playMenuHover() { playInteraction('menuHover'); }

// The page controls can change while the audio element and its graph stay live.
export function bindPageSound(root) {
  if (!headerTuningMounted && new URLSearchParams(location.search).get('tune') === 'header') {
    headerTuningMounted = true;
    import('./header-tuning.js').then(module => module.mountHeaderTuning());
  }
  toggle = root.querySelector('.sound');
  status = root.querySelector('.sound-status');
  if (deviceProfile() === 'phone') toggle.innerHTML = '<span class="site-speaker" aria-hidden="true"></span>';
  reflectToggle();
  for (const button of root.querySelectorAll('.control, .reel-launch')) {
    if (boundControls.has(button)) continue;
    boundControls.add(button);
    if (button === toggle) button.addEventListener('click', toggleSound);
    bindControlFeedback(button);
  }
  bindHoverSound(root.querySelectorAll('.footer-contact__underline'), 'tick');
}

export function bindHoverSound(elements, tone) {
  for (const element of elements) {
    if (boundControls.has(element)) continue;
    boundControls.add(element);
    element.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') playInteraction(tone);
    });
  }
}

function bindControlFeedback(button) {
  // The Approach header can appear under a stationary pointer during the page swap.
  const hoverEvent = button.matches('.approach-page-header .project-back') ? 'pointermove' : 'pointerenter';
  button.addEventListener(hoverEvent, event => {
    if (event.pointerType === 'touch' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (button.classList.contains('is-hovered')) return;
    const bounds = button.getBoundingClientRect();
    button.style.setProperty('--entry-x', `${event.clientX - bounds.left}px`);
    button.style.setProperty('--entry-y', `${event.clientY - bounds.top}px`);
    button.classList.add('is-hovered');
    if (button.matches('.talk, .menu, .approach-button, .reel-launch, .project-back')) playInteraction('hover');
  });
  if (button.matches('.talk, .menu, .approach-button, .reel-launch')) button.addEventListener('click', () => playInteraction('click'));
  let pressTimer;
  button.addEventListener('click', event => {
    const bounds=button.getBoundingClientRect();
    button.style.setProperty('--entry-x', `${event.detail?event.clientX-bounds.left:bounds.width/2}px`);
    button.style.setProperty('--entry-y', `${event.detail?event.clientY-bounds.top:bounds.height/2}px`);
    clearTimeout(pressTimer);button.classList.add('is-pressed');
    pressTimer=setTimeout(()=>button.classList.remove('is-pressed'),650);
  });
  button.addEventListener('pointerleave', () => button.classList.remove('is-hovered'));
}

let finishBloom;
export function playGlassBloom() {
  if (!pageActive() || !requested || audio.paused || !playing || context?.state !== 'running') return;
  finishBloom?.();
  finishBloom = playBloomSound(context, effects);
}

function pauseForInactivity() {
  revision++;
  clearTimeout(pauseTimer);
  audio.pause();
  heartbeat.pause();
  if (master) master.gain.value = 0;
  if (atmosphere) {
    atmosphere.gain.cancelScheduledValues(context.currentTime);
    atmosphere.gain.value = 0;
  }
  reflectPlayback(false);
}
function resumeIfActive() {
  if (pageActive() && requested && !reelPlaying && audio.paused) setSound(true);
}
window.addEventListener('blur', pauseForInactivity);
window.addEventListener('focus', resumeIfActive);
window.addEventListener('pagehide', pauseForInactivity);
window.addEventListener('pageshow', resumeIfActive);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseForInactivity();
  else resumeIfActive();
});
document.addEventListener('showreel:open', () => {
  reelPlaying = true;
  pauseForInactivity();
});
document.addEventListener('showreel:close', () => {
  reelPlaying = false;
  resumeIfActive();
});
