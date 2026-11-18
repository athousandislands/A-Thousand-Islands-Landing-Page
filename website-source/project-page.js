import { initPortfolioSettings } from './portfolio-settings.js';
import { initProjectVideoPlayer } from './project-video-player.js';
import { applyProjectLayout, projectContentStagger, readProjectSettings } from './project-settings.js';
import { mountNextProject } from './project-next.js';
import { isHandheld } from './device-profile.js';
import { createVideoLoader } from './video-loading.js';

const mobileClips = {
  echo: {
    hero: new URL('./assets/video/mobile-projects/echo-main.mp4', import.meta.url).href,
    dynamic: new URL('./assets/video/mobile-projects/echo-dynamic.mp4', import.meta.url).href,
    identity: new URL('./assets/video/mobile-projects/echo-identity.mp4', import.meta.url).href,
  },
  pulse: {
    hero: new URL('./assets/video/mobile-projects/pulse-hero.mp4', import.meta.url).href,
    gesture: new URL('./assets/video/mobile-projects/pulse-gesture.mp4', import.meta.url).href,
  },
  'creative-portfolio': {
    mindMap: new URL('./assets/video/mobile-projects/portfolio-mind-map.mp4', import.meta.url).href,
  },
};
export function mountPage(root) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const project = location.pathname.split('/')[1];
  root.dataset.project = project;
  const settings = readProjectSettings(project);
  applyProjectLayout(root, settings);
  const portfolio = project === 'creative-portfolio' ? initPortfolioSettings(root) : null;
  let stopPortfolio;
  let stopNextProject;

  const shots = [...root.querySelectorAll('.project-shot')];
  if (isHandheld()) {
    for (const video of root.querySelectorAll('.project-shot video')) {
      const mobileSrc = mobileClips[project]?.[video.dataset.clip];
      if (mobileSrc) video.src = mobileSrc;
    }
  }
  const videos = [...root.querySelectorAll('.project-media-frame:not(.project-inline-player) > video')];
  const clipControls = new Map();
  const inlinePlayer = initProjectVideoPlayer(root.querySelector('.project-inline-player'));
  const header = root.querySelector('.header');
  const content = root.querySelector('main');
  const visibleVideos = new Set();
  let active = false;
  let unmountTuning;
  let tuningRequest = 0;
  let arrival = [];

  function cancelArrival() {
    arrival.forEach(animation => animation.cancel());
    arrival = [];
  }

  function playArrival(delay) {
    cancelArrival();
    if (reducedMotion.matches || !header.animate) return;
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    const timing = { fill: 'backwards', easing: 'cubic-bezier(.33,0,.33,1)' };
    arrival = [
      header.animate(keyframes, { ...timing, delay, duration: 360 }),
      content.animate(keyframes, { ...timing, delay: delay + projectContentStagger, duration: 410 }),
    ];
  }

  function playClip(video, requested = false) {
    const control = clipControls.get(video);
    if (control.pending && !requested) return;
    const attempt = Symbol();
    control.pending = attempt;
    const showPlay = () => {
      if (control.pending === attempt && active && visibleVideos.has(video) && !document.hidden) {
        control.button.hidden = false;
      }
    };
    if (requested) {
      control.button.hidden = true;
      control.loader.start();
    }
    video.dataset.playback = 'starting';
    const fallback = requested ? undefined : setTimeout(showPlay, 2000);
    video.play()
      .catch(error => {
        if (control.pending !== attempt) return;
        control.loader.stop();
        if (error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') control.manualOnly = true;
        video.dataset.playback = error.name === 'NotAllowedError' ? 'blocked' : 'error';
        video.dataset.playbackError = error.name;
        showPlay();
      })
      .finally(() => {
        clearTimeout(fallback);
        if (control.pending === attempt) control.pending = undefined;
      });
  }

  for (const video of videos) {
    video.muted = true;
    video.playsInline = true;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-video-play reel-launch';
    button.innerHTML = '<span class="reel-play"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6.5c0-1 1-1.6 1.9-1.1l17 9.5c.9.5.9 1.8 0 2.3l-17 9.4c-.9.5-1.9-.1-1.9-1.1Z"/></svg></span>';
    button.setAttribute('aria-label', `Play ${video.getAttribute('aria-label')}`);
    button.hidden = true;
    const control = { button, loader: createVideoLoader(video.parentElement, video), manualOnly: false, started: false };
    clipControls.set(video, control);

    function reflectPlaying(playing) {
      button.hidden = playing && !isHandheld() && !control.manualOnly;
      button.dataset.playing = String(playing);
      button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${video.getAttribute('aria-label')}`);
    }

    button.addEventListener('click', () => {
      control.manualOnly = true;
      if (!video.paused && button.dataset.playing === 'true') {
        video.pause();
        return;
      }
      if (video.error) video.load();
      playClip(video, true);
    });
    video.addEventListener('playing', () => {
      if (!active || !visibleVideos.has(video) || document.hidden) { video.pause(); return; }
      control.started = true;
      video.dataset.playback = 'playing';
      delete video.dataset.playbackError;
      reflectPlaying(true);
    });
    video.addEventListener('pause', () => {
      video.dataset.playback = 'paused';
      if (control.started || control.manualOnly) reflectPlaying(false);
    });
    video.addEventListener('waiting', () => { video.dataset.playback = 'buffering'; });
    video.addEventListener('canplay', () => {
      if (active && visibleVideos.has(video) && video.paused && !control.manualOnly) syncVideo(video);
    });
    video.addEventListener('ended', () => {
      control.manualOnly = true;
      reflectPlaying(false);
    });
    video.addEventListener('error', () => reflectPlaying(false));
    video.after(button);
  }

  function syncVideo(video) {
    const control = clipControls.get(video);
    if (!active || !visibleVideos.has(video) || document.hidden) {
      if (control.started && isHandheld()) control.manualOnly = true;
      control.pending = undefined;
      control.loader.stop();
      video.pause();
    } else if (video.paused && (reducedMotion.matches || control.manualOnly)) {
      control.button.hidden = false;
    } else if (video.paused) playClip(video);
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (!active) return;
    for (const entry of entries) {
      const shot = entry.target;
      if (entry.intersectionRatio >= 0.16) shot.classList.add('is-laid-out');
      const video = shot.querySelector('video');
      if (!video) continue;
      if (video === inlinePlayer?.video) {
        if (!entry.isIntersecting) inlinePlayer.pause();
        continue;
      }
      if (entry.intersectionRatio >= 0.16) visibleVideos.add(video);
      else if (!entry.isIntersecting) visibleVideos.delete(video);
      syncVideo(video);
    }
  }, { threshold: [0, 0.16] }) : null;

  const preloadObserver = observer && new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!active || !entry.isIntersecting) continue;
      const video = entry.target;
      // Start fetching nearby clips without starting playback.
      video.preload = video === inlinePlayer?.video && !isHandheld() ? 'metadata' : 'auto';
      preloadObserver.unobserve(video);
    }
  }, { rootMargin: '800px 0px' });

  if (observer && !reducedMotion.matches) {
    shots.forEach(shot => shot.classList.add('will-lay-out'));
  }

  const syncAll = () => videos.forEach(syncVideo);
  document.addEventListener('visibilitychange', syncAll);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      cancelArrival();
      videos.forEach(video => video.pause());
    }
    syncAll();
  });

  return {
    activate({ nextProject, continueToNext, preloadNext, sliding } = {}) {
      if (active) return;
      active = true;
      if (portfolio) { portfolio.apply(); stopPortfolio = portfolio.watchProfiles(portfolio.apply); }
      if (!sliding) playArrival(settings['fade-in-delay']);
      if (nextProject) stopNextProject = mountNextProject(content, nextProject, continueToNext, preloadNext);
      if (observer) shots.forEach(shot => observer.observe(shot));
      else videos.forEach(video => visibleVideos.add(video));
      for (const video of root.querySelectorAll('.project-shot video')) preloadObserver?.observe(video);
      syncAll();
      if (new URLSearchParams(location.search).get('tune') !== project) return;
      const request = ++tuningRequest;
      if (portfolio) {
        import('./portfolio-tuning.js').then(({ mountPortfolioTuning }) => {
          if (request === tuningRequest) unmountTuning = mountPortfolioTuning(portfolio);
        });
        return;
      }
      import('./project-tuning.js').then(({ mountProjectTuning }) => {
        if (request === tuningRequest) unmountTuning = mountProjectTuning(root, settings, playArrival, project);
      });
    },
    deactivate() {
      active = false;
      stopPortfolio?.();
      stopNextProject?.();
      stopNextProject = undefined;
      inlinePlayer?.pause();
      cancelArrival();
      observer?.disconnect();
      preloadObserver?.disconnect();
      visibleVideos.clear();
      syncAll();
      tuningRequest++;
      unmountTuning?.();
      unmountTuning = undefined;
    },
  };
}
