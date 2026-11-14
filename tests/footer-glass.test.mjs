import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { footerDefaults, footerProfiles, normalizeFooter, footerMaterial, createFooterThaw } from '../website-source/footer-glass-model.js';

test('the footer stays frosted until three deliberate presses reveal it', () => {
  const thaw = createFooterThaw();
  thaw.advance(60_000);
  assert.equal(thaw.current().phase, 'frosted');
  assert.equal(thaw.current().deadline, null);
  assert.equal(thaw.press(60_000), true);
  assert.deepEqual(thaw.current(), { phase: 'clearing', progress: .32, duration: 650, deadline: 60_650 });
  assert.equal(thaw.press(60_040), false);
  assert.equal(thaw.press(60_100), true);
  assert.equal(thaw.current().progress, .68);
  assert.equal(thaw.press(60_200), true);
  assert.equal(thaw.current().progress, 1);
  assert.equal(thaw.press(61_000), false);
  thaw.advance(61_499);
  assert.equal(thaw.current().phase, 'clearing');
  thaw.advance(61_500);
  assert.equal(thaw.current().phase, 'clear');
  assert.equal(thaw.current().deadline, 63_500);
  assert.equal(thaw.press(63_000), false);
});

test('a partial reveal waits for the next press and leaving clears pending work', () => {
  const thaw = createFooterThaw();
  thaw.press(100);
  thaw.advance(750);
  thaw.advance(5_000);
  assert.equal(thaw.current().phase, 'partial');
  assert.equal(thaw.current().progress, .32);
  thaw.press(5_000);
  thaw.reset();
  thaw.advance(5_300);
  assert.deepEqual(thaw.current(), { phase: 'frosted', progress: 0, duration: 0, deadline: null });
  assert.equal(thaw.press(5_310), true);
  assert.equal(thaw.current().progress, .32);
});

test('refogging can finish or reverse to the next step above the current clarity', () => {
  const thaw = createFooterThaw();
  const reachRefog = start => {
    for (const offset of [0, 200, 400]) thaw.press(start + offset);
    thaw.advance(start + 1700);
    thaw.advance(start + 3700);
    assert.deepEqual(thaw.current(), { phase: 'fogging', progress: 0, duration: 10000, deadline: start + 13700 });
  };
  reachRefog(0);
  assert.equal(thaw.press(4_000, .40), true);
  assert.equal(thaw.current().progress, .68);
  thaw.advance(4_950);
  assert.equal(thaw.current().phase, 'partial');
  thaw.reset();
  reachRefog(5_000);
  thaw.advance(18_700);
  assert.equal(thaw.current().phase, 'frosted');
  assert.equal(thaw.current().deadline, null);
});

test('reduced motion keeps the interaction and hold without animating the material', () => {
  const thaw = createFooterThaw();
  for (const time of [100, 300, 500]) {
    thaw.press(time, undefined, true);
    assert.equal(thaw.current().duration, 0);
    thaw.advance(time, true);
  }
  assert.equal(thaw.current().phase, 'clear');
  thaw.advance(2_500, true);
  assert.equal(thaw.current().phase, 'frosted');
});

test('imported controls are bounded and profiles are independent', () => {
  const values = normalizeFooter({ framing: { videoSize: 50, vertical: -100 }, reveal: { delay: NaN }, surface: { sage: 'url(bad)' } }, 'phone');
  assert.equal(values.framing.videoSize, 1.6); assert.equal(values.framing.vertical, -30);
  assert.equal(values.timing.delay, 3.9); assert.equal(values.surface.colour, footerDefaults('phone').surface.colour);
  const phone = footerDefaults('phone'); phone.framing.videoSize = .7;
  assert.equal(footerDefaults('desktop').framing.videoSize, .98);
});

test('each thaw step interpolates between the configured materials', () => {
  const config = footerDefaults();
  const beginning = footerMaterial(0, config);
  const end = footerMaterial(1, config);
  const middle = footerMaterial(.68, config);
  assert.deepEqual(beginning, { ...config.beginning, patches: config.fog.lingeringFog });
  assert.ok(end.patches > 0 && end.patches < .2);
  for (const key of ['blur', 'mist', 'tint', 'frost', 'patches']) {
    assert.ok(middle[key] < beginning[key] && middle[key] > end[key]);
  }
  for (const key of Object.keys(config.end)) {
    assert.equal(end[key], config.end[key]);
  }
});

test('earlier saved settings migrate without losing device framing or reveal values', () => {
  const values = normalizeFooter({
    framing: { videoSize: .82, horizontal: 4 },
    reveal: { delay: 6, clearingTime: 30, slowdown: 3, initialBlur: 35, finalBlur: 4, initialMist: .6, finalMist: .12 },
    surface: { sage: '#dae3db', tint: .4, frost: .3, grain: .04 },
  }, 'phone');
  assert.equal(values.framing.videoSize, .82); assert.equal(values.framing.horizontal, 4);
  assert.deepEqual(values.timing, { delay: 6, duration: 30, pace: 3 });
  assert.equal(values.beginning.blur, 35); assert.equal(values.end.mist, .12);
  assert.equal(values.beginning.tint, 0); assert.equal(values.end.tint, .4);
  assert.equal(values.surface.colour, '#dae3db');
});

test('the icy tint and thaw levels match across devices while preserving approved framing', () => {
  const profiles = JSON.parse(readFileSync(new URL('../design-references/footer/approved-settings/ati-footer-glass-1793733785632.json', import.meta.url), 'utf8')).profiles;
  const desktop = footerDefaults();
  for (const device of ['desktop', 'tablet', 'phone']) {
    assert.deepEqual(footerDefaults(device), {
      ...desktop,
      framing: {
        ...profiles[device].framing,
        ...(device === 'phone' ? { horizontal: 2 } : {}),
        bottomFog: profiles.desktop.framing.bottomFog,
      },
    });
  }
  const phone = footerDefaults('phone'); phone.framing.videoSize = .4;
  assert.equal(footerDefaults('phone').framing.videoSize, .98);
  assert.equal(desktop.surface.colour, '#c2dae4');
  assert.deepEqual(desktop.fog, profiles.desktop.fog);
  for (const key of ['blur', 'mist', 'frost']) {
    assert.ok(desktop.beginning[key] > profiles.desktop.beginning[key]);
    assert.ok(desktop.end[key] < profiles.desktop.end[key]);
  }
  assert.equal(normalizeFooter({ framing: { topFeather: 90 } }, 'tablet').framing.topFeather, 70);
});

test('older profiles gain uneven fog and updated tablet defaults without losing custom edits', () => {
  const saved = {
    tablet: { framing: { sectionOffset: -8, vertical: -4, topFeather: 34, videoSize: .87 } },
    phone: { framing: { videoSize: .63, sectionOffset: -2 }, end: { mist: .17 } },
  };
  const migrated = footerProfiles(saved, { previous: true });
  assert.equal(migrated.tablet.framing.sectionOffset, -18);
  assert.equal(migrated.tablet.framing.vertical, -8);
  assert.equal(migrated.tablet.framing.topFeather, 24);
  assert.equal(migrated.tablet.framing.videoSize, .87);
  assert.equal(migrated.phone.framing.sectionOffset, -2);
  assert.equal(migrated.phone.end.mist, .17);
  assert.equal(migrated.phone.fog.lingeringFog, .82);
  saved.tablet.framing = { sectionOffset: -12, vertical: 3, topFeather: 17 };
  assert.equal(footerProfiles(saved, { previous: true }).tablet.framing.sectionOffset, -12);
  assert.equal(footerProfiles(saved, { previous: true }).tablet.framing.vertical, 3);
  assert.equal(footerProfiles(saved, { previous: true }).tablet.framing.topFeather, 17);
  assert.equal(footerProfiles(saved).phone.framing.videoSize, .63);
});

test('imported fog controls are bounded and device edits stay independent', () => {
  const profiles = footerProfiles({ phone: { fog: { lingeringFog: 4, eyeClarity: -1, patchScale: 9 } } });
  assert.deepEqual(profiles.phone.fog, { lingeringFog: 1, eyeClarity: 0, patchScale: 1.5 });
  profiles.phone.fog.lingeringFog = 0;
  assert.equal(profiles.tablet.fog.lingeringFog, .82);
  assert.equal(normalizeFooter({ fog: { lingeringFog: NaN } }).fog.lingeringFog, .82);
});

test('one surface colour migrates from sage and new background controls survive normalization', () => {
  const legacy = normalizeFooter({ surface: { sage: '#b7c2de', grain: .1 } }, 'phone');
  assert.equal(legacy.surface.colour, '#b7c2de');
  assert.equal(legacy.surface.backgroundRemoval, 1);
  assert.equal(legacy.surface.grain, .1);
  const edited = normalizeFooter({ surface: { colour: '#c9b2c7', backgroundRemoval: .7, backgroundSoftness: .04, tintFeather: 80 } });
  assert.equal(edited.surface.colour, '#c9b2c7');
  assert.equal(edited.surface.backgroundRemoval, .7);
  assert.equal(edited.surface.backgroundSoftness, .04);
  assert.equal(edited.surface.tintFeather, 80);
  const bounded = normalizeFooter({ surface: { colour: 'url(bad)', backgroundRemoval: 9, backgroundSoftness: 0, tintFeather: 400 } });
  assert.equal(bounded.surface.colour, footerDefaults().surface.colour);
  assert.equal(bounded.surface.backgroundRemoval, 1);
  assert.equal(bounded.surface.backgroundSoftness, .015);
  assert.equal(bounded.surface.tintFeather, 100);
});
