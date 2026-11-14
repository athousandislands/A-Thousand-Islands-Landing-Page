// Keep the approved framing and patch masks, with a tint sampled from the settled menu.
export const approvedFooterLook = {
  "framing": {
    "sceneHeight": 95,
    "sectionOffset": 0,
    "videoSize": 0.98,
    "horizontal": 0,
    "vertical": -4,
    "edgeFeather": 30,
    "topFeather": 27,
    "bottomFog": 0.14
  },
  "timing": {
    "delay": 3.9,
    "duration": 15,
    "pace": 1.7
  },
  "beginning": {
    "blur": 14,
    "mist": 0.51,
    "tint": 0.53,
    "frost": 0.46
  },
  "end": {
    "blur": 0.35,
    "mist": 0.012,
    "tint": 0.16,
    "frost": 0.006
  },
  "surface": {
    "colour": "#c2dae4",
    "grain": 0.05,
    "backgroundRemoval": 1,
    "backgroundSoftness": 0.06,
    "tintFeather": 60
  },
  "fog": {
    "lingeringFog": 0.82,
    "eyeClarity": 0.95,
    "patchScale": 1
  }
};

const withFraming = framing => ({
  ...approvedFooterLook,
  framing: { ...approvedFooterLook.framing, ...framing },
});

export const APPROVED_FOOTER_PROFILES = {
  desktop: approvedFooterLook,
  tablet: withFraming({ sectionOffset: -18, vertical: -8, topFeather: 24 }),
  phone: withFraming({ horizontal: 2, topFeather: 34 }),
};
