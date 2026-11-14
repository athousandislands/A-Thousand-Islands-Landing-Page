import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDevice, usesPhoneLayout } from '../website-source/device-profile.js';

test('handheld profiles stay consistent when their screen dimensions are swapped', () => {
  const devices = [
    [{ userAgent: 'iPhone', touches: 5 }, 430, 932, 'phone'],
    [{ userAgent: 'Android Mobile', touches: 5 }, 412, 915, 'phone'],
    [{ userAgent: 'Macintosh', platform: 'MacIntel', touches: 5 }, 1032, 1376, 'tablet'],
    [{ userAgent: 'Macintosh', platform: 'iOS', mobile: true, touches: 1, coarse: true }, 1032, 1376, 'tablet'],
    [{ userAgent: 'Android', platform: 'Android', touches: 5 }, 800, 1280, 'tablet'],
    [{ userAgent: 'X11; Linux x86_64', touches: 5 }, 900, 1440, 'tablet'],
  ];
  for (const [signals, width, height, expected] of devices) {
    for (const [w, h] of [[width, height], [height, width]]) {
      assert.equal(classifyDevice({ ...signals, shortSide: Math.min(w, h) }), expected);
    }
  }
});

test('a desktop-sized UA can describe a handheld, while narrow desktop windows keep the desktop profile', () => {
  assert.equal(classifyDevice({ userAgent: 'Macintosh', touches: 5, shortSide: 430 }), 'phone');
  assert.equal(classifyDevice({ userAgent: 'Macintosh', touches: 0, shortSide: 600 }), 'desktop');
  assert.equal(classifyDevice({ userAgent: 'Windows NT', touches: 10, coarse: true, shortSide: 900 }), 'desktop');
});

test('a wide landscape phone uses the same layout as a desktop at that viewport size', () => {
  assert.equal(usesPhoneLayout('phone', 393, 852), true);
  assert.equal(usesPhoneLayout('phone', 852, 393), usesPhoneLayout('desktop', 852, 393));
  assert.equal(usesPhoneLayout('phone', 568, 320), true);
  assert.equal(usesPhoneLayout('tablet', 820, 1180), false);
});
