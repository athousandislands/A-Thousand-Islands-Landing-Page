import './footer-contact.css';

const words = ['Reality', 'World', 'Story', 'Future'];
const nairobi = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true,
});

export function initFooterContact(root) {
  const clock = root.querySelector('.footer-contact__clock');
  const layers = [...root.querySelectorAll('.footer-contact__words > span')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;
  let wordIndex = 0;
  let current = 0;
  let wordTimer, clockTimer;
  let transition = [];

  function writeTime() {
    const now = new Date();
    clock.textContent = nairobi.format(now).replace(/\s/g, '');
    clock.dateTime = now.toISOString();
    return now.getTime();
  }

  function tick() {
    const now = writeTime();
    clockTimer = setTimeout(tick, 60_000 - (now % 60_000));
  }

  function scheduleWord() {
    wordTimer = setTimeout(swapWord, wordIndex === 0 ? 6000 : 4500);
  }

  function swapWord() {
    const outgoing = layers[current];
    const incoming = layers[1 - current];
    wordIndex = (wordIndex + 1) % words.length;
    incoming.textContent = words[wordIndex];
    incoming.hidden = false;
    const clear = { opacity: 1, filter: 'blur(0)' };
    const soft = { opacity: 0, filter: 'blur(.13em)' };
    const timing = { duration: 900, easing: 'ease-in-out', fill: 'both' };
    transition = [
      outgoing.animate([clear, { ...soft, offset: .72 }, soft], timing),
      incoming.animate([soft, { ...soft, offset: .24 }, clear], timing),
    ];
    transition[1].finished.then(() => {
      outgoing.hidden = true;
      current = 1 - current;
      transition.forEach(animation => animation.cancel());
      transition = [];
    }, () => {});
    scheduleWord();
  }

  function resetWords() {
    clearTimeout(wordTimer);
    transition.forEach(animation => animation.cancel());
    transition = [];
    wordIndex = current = 0;
    layers[0].textContent = words[0];
    layers[0].hidden = false;
    layers[1].hidden = true;
  }

  reduced.addEventListener('change', () => {
    resetWords();
    if (active && !reduced.matches) scheduleWord();
  });
  writeTime();

  return visible => {
    if (visible === active) return;
    active = visible;
    if (active) {
      tick();
      if (!reduced.matches) scheduleWord();
    } else {
      clearTimeout(clockTimer);
      resetWords();
    }
  };
}
