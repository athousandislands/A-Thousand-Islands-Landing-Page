// Device presets use hardware signals. Viewport width is only used for layout.
export function classifyDevice({ userAgent = '', platform = '', mobile = false, touches = 0, coarse = false, shortSide = 0 } = {}) {
  if (/iPad|\bTablet\b|PlayBook|Kindle|Silk/i.test(userAgent)) return 'tablet';
  if (/iPhone|iPod|Windows Phone/i.test(userAgent)) return 'phone';
  // Desktop-mode iPads can report a Mac UA alongside mobile or touch signals.
  if ((touches > 0 || coarse || mobile) && /Macintosh|MacIntel/i.test(`${userAgent} ${platform}`)) {
    return shortSide > 0 && shortSide < 600 ? 'phone' : 'tablet';
  }
  if (/Android/i.test(`${userAgent} ${platform}`)) {
    return mobile || /\bMobile\b/i.test(userAgent) || (shortSide > 0 && shortSide < 600) ? 'phone' : 'tablet';
  }
  if (mobile) return 'phone';
  // Desktop-mode Android can report Linux. A compact touch screen still
  // identifies the handheld case when the browser supplies no mobile UA.
  if ((touches > 0 || coarse) && shortSide > 0 && shortSide <= 1200 && !/Windows|CrOS/i.test(`${userAgent} ${platform}`)) {
    return shortSide < 600 ? 'phone' : 'tablet';
  }
  return 'desktop';
}

let profile = 'desktop';
const listeners = new Set();

export function usesPhoneLayout(device, width, height) {
  return width <= 640 || (device === 'phone' && width <= height);
}

export const isPhoneLayout = () => usesPhoneLayout(profile, innerWidth, innerHeight);

if (typeof window !== 'undefined') {
  const coarse = matchMedia('(any-pointer: coarse)');
  const root = document.documentElement;
  const update = () => {
    const next = classifyDevice({
      userAgent: navigator.userAgent,
      platform: navigator.userAgentData?.platform || navigator.platform,
      mobile: navigator.userAgentData?.mobile,
      touches: navigator.maxTouchPoints,
      coarse: coarse.matches,
      shortSide: Math.min(screen.width, screen.height),
    });
    const changed = next !== profile;
    profile = next;
    root.dataset.deviceProfile = profile;
    root.toggleAttribute('data-phone-layout', isPhoneLayout());
    root.toggleAttribute('data-compact-layout', profile !== 'desktop' || innerWidth <= 1180);
    if (changed) listeners.forEach(listener => listener(profile));
  };
  update();
  window.addEventListener('pointerdown', () => { root.dataset.controlInput = 'pointer'; }, { capture: true, passive: true });
  window.addEventListener('keydown', () => { root.dataset.controlInput = 'keyboard'; }, { capture: true });
  window.addEventListener('resize', update);
  coarse.addEventListener('change', update);
}

export const deviceProfile = () => profile;
export const isHandheld = () => profile !== 'desktop';
export function watchDeviceProfile(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
