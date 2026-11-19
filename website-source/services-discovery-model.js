export const DISCOVERY_DEFAULTS = {
  "arrival": {
    "start": 0.5,
    "delay": 0.1,
    "fade": 0.3,
    "headingDelay": 0.15,
    "headingStagger": 0.4,
    "headingFade": 1.3
  },
  "surface": {
    "frost": 0.47,
    "grain": 0.23,
    "veil": 0.03,
    "colourStrength": 0.94,
    "transitionDistance": 0.7,
    "exitDistance": 0.6,
    "smoothing": 0.23
  },
  "colour": {
    "baseHighlight": "#66b2ed",
    "baseColour": "#58a4eb",
    "coral": "#f97662",
    "amber": "#ffc681",
    "orange": "#fb9a5d",
    "terracotta": "#ef8759",
    "rose": "#db9bbb",
    "saturation": 1.27
  },
  "flow": {
    "period": 16,
    "movement": 1.05,
    "spread": 1.05
  },
  "focus": {
    "clarity": 1,
    "blur": 0.75,
    "drift": 0.66,
    "softInk": 0.41
  },
  "type": {
    "desktopSize": 12.5,
    "phoneSize": 13,
    "listScale": 0.95,
    "tracking": -0.05,
    "phoneTracking": -0.045,
    "leading": 1.06,
    "phoneLeading": 1.06
  },
  "spacing": {
    "sceneHeight": 108,
    "phoneSceneHeight": 115,
    "phoneMinHeight": 880,
    "headingGap": 12,
    "itemGap": 3,
    "phoneHeadingGap": 10,
    "phoneItemGap": 3
  },
  "reveal": {
    "appear": 1.05,
    "stagger": 0.16,
    "reading": 10,
    "conceal": 1,
    "concealStagger": 0.1
  },
  "bloom": {
    "strength": 0.42,
    "duration": 1.9,
    "size": 1
  },
  "digitalExperiences": {
    "inset": 4,
    "top": 66
  },
  "visual": {
    "inset": 14,
    "top": 4
  },
  "direction": {
    "inset": 6,
    "top": 40
  },
  "phoneDigitalExperiences": {
    "inset": 6,
    "top": 54
  },
  "phoneVisual": {
    "inset": 6,
    "top": 0
  },
  "phoneDirection": {
    "inset": 6,
    "top": 26
  }
};
export const clamp = value => Math.max(0, Math.min(1, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Time-based following smooths wheel/scroll samples without taking over document scrolling.
export function easeSurface(current, target, elapsedMs, smoothingSeconds) {
  if (smoothingSeconds <= 0) return target;
  const next = target + (current - target) * Math.exp(-Math.max(0, elapsedMs) / (smoothingSeconds * 1000));
  return Math.abs(next - target) < .001 ? target : next;
}

export function surfaceEnvelope(top, bottom, viewportHeight, distance = .6, exitDistance = .85) {
  const span = viewportHeight * Math.max(.25, distance);
  return smooth((span - top) / span) * smooth(bottom / (viewportHeight * Math.max(.25, exitDistance)));
}
// Arrival controls intensity; departure is a spatial feather at the section edge.
export function surfaceArrival(top, viewportHeight, distance = .6) {
  const span = viewportHeight * Math.max(.25, distance);
  return smooth((span - top) / span);
}
export function nearestService(x, y, boxes) {
  let nearest = 0, minimum = Infinity;
  boxes.forEach((box, index) => {
    const dx = Math.max(box.left - x, 0, x - box.right);
    const dy = Math.max(box.top - y, 0, y - box.bottom);
    const distance = dx * dx + dy * dy;
    if (distance < minimum) { minimum = distance; nearest = index; }
  });
  return nearest;
}
export function cycleProgress(elapsedMs, seconds) {
  return (1 - Math.cos(elapsedMs / (Math.max(6, seconds) * 1000) * Math.PI * 2)) / 2;
}

// Project defaults are independent of browser storage.
export function savedDesktopDefaults() { return structuredClone(DISCOVERY_DEFAULTS); }
