import test from 'node:test';
import assert from 'node:assert/strict';
import approved from '../website-source/settings/pulse-approved.json' with { type: 'json' };
import { readProjectSettings } from '../website-source/project-settings.js';

test('a fresh browser gets the approved Pulse framing without changing Echo', () => {
  const { project, ...settings } = approved;
  assert.deepEqual(readProjectSettings('pulse'), settings);
  const echo = readProjectSettings('echo');
  assert.equal(echo['video-size'], 100);
  assert.equal(echo['video-x'], 0);
  assert.equal(echo['video-y'], 0);
});
