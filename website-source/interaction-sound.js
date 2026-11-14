// Adapted from the "bloom" archetype in m1ckc3s/procedural-sounds.
// MIT © 2026 Mick Cesanek. See assets/licenses/procedural-sounds.txt.
// Pinned source: bab3f31d0132972bec64b0856e72f09cb295ab3f/lib/audio/compose.ts
// Fixed recipe: warm root, lightly detuned companion and a soft fifth.
export const BLOOM_PEAK_BUDGET = 0.085; // Same amplitude ceiling as the existing click.
const layers = [
  { frequency: 330, detune: 0, share: .54, attack: .1, decay: .46 },
  { frequency: 330, detune: 9, share: .38, attack: .13, decay: .52 },
  { frequency: 495, detune: 0, share: .08, attack: .15, decay: .44 },
];

export function playBloomSound(context, destination) {
  const now = context.currentTime;
  const voices = [];
  for (const layer of layers) {
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = layer.frequency;
    tone.detune.value = layer.detune;
    const peak = BLOOM_PEAK_BUDGET * layer.share;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(peak, now + layer.attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + layer.attack + layer.decay);
    envelope.gain.linearRampToValueAtTime(0, now + layer.attack + layer.decay + .12);
    tone.connect(envelope).connect(destination);
    tone.start(now);
    tone.stop(now + layer.attack + layer.decay + .14);
    tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
    voices.push({tone, envelope});
  }
  // A new bloom replaces the previous gesture's tail instead of stacking levels.
  return () => {
    const at = context.currentTime;
    for (const {tone, envelope} of voices) {
      envelope.gain.cancelAndHoldAtTime(at);
      envelope.gain.linearRampToValueAtTime(0, at + .07);
      tone.stop(at + .08);
    }
  };
}
