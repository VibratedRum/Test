/* Procedural Web Audio — pirate adventure SFX & music beds */
const AudioSys = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let musicNodes = [];
  let muted = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(master);
  }

  async function unlock() {
    ensure();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  function tone(freq, dur, type = 'square', gain = 0.2, when = 0) {
    ensure();
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain = 0.15, when = 0) {
    ensure();
    const t0 = ctx.currentTime + when;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    src.start(t0);
    src.stop(t0 + dur);
  }

  const sfx = {
    swing() { tone(220, 0.08, 'sawtooth', 0.12); tone(140, 0.1, 'triangle', 0.08, 0.02); },
    hit() { tone(90, 0.12, 'square', 0.18); noise(0.08, 0.1); },
    hurt() { tone(180, 0.15, 'sawtooth', 0.15); tone(90, 0.2, 'square', 0.1, 0.05); },
    coin() { tone(880, 0.08, 'square', 0.1); tone(1320, 0.12, 'square', 0.08, 0.06); },
    heart() { tone(523, 0.1, 'triangle', 0.12); tone(784, 0.18, 'triangle', 0.1, 0.08); },
    chest() { tone(196, 0.1, 'square', 0.1); tone(294, 0.12, 'square', 0.08, 0.08); tone(392, 0.2, 'triangle', 0.1, 0.16); },
    bomb() { noise(0.35, 0.28); tone(60, 0.3, 'sawtooth', 0.2); },
    key() { tone(660, 0.1, 'square', 0.1); tone(990, 0.15, 'triangle', 0.1, 0.08); },
    door() { tone(120, 0.15, 'square', 0.12); tone(80, 0.2, 'triangle', 0.1, 0.05); },
    talk() { tone(300 + Math.random() * 80, 0.05, 'square', 0.06); },
    item() {
      [392, 494, 587, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, i * 0.09));
    },
    win() {
      [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.12));
    },
    die() { tone(200, 0.2, 'sawtooth', 0.15); tone(100, 0.4, 'sawtooth', 0.12, 0.15); },
    step() { noise(0.03, 0.04); },
  };

  function stopMusic() {
    musicNodes.forEach((n) => {
      try { n.stop(); } catch (_) {}
    });
    musicNodes = [];
  }

  function startMusic(mode = 'overworld') {
    ensure();
    stopMusic();
    if (muted) return;

    const tempo = mode === 'dungeon' ? 0.42 : mode === 'boss' ? 0.28 : 0.36;
    const roots = mode === 'dungeon'
      ? [110, 130.81, 98, 146.83]
      : mode === 'boss'
        ? [82.41, 98, 87.31, 110]
        : [146.83, 164.81, 130.81, 174.61];
    const pattern = mode === 'boss'
      ? [0, 0, 3, 2, 0, 1, 3, 2]
      : [0, 2, 1, 0, 3, 1, 2, 0];

    let step = 0;
    function schedule() {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const note = roots[pattern[(step + i) % pattern.length]];
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = mode === 'dungeon' ? 'triangle' : 'square';
        o.frequency.value = note * (i % 4 === 0 ? 1 : 2);
        const start = t0 + i * tempo;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + tempo * 0.85);
        o.connect(g);
        g.connect(musicGain);
        o.start(start);
        o.stop(start + tempo);
        musicNodes.push(o);
      }
      // bass drone
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = roots[0] / 2;
      bg.gain.value = 0.04;
      bass.connect(bg);
      bg.connect(musicGain);
      bass.start(t0);
      bass.stop(t0 + 8 * tempo);
      musicNodes.push(bass);
      step += 8;
      const id = setTimeout(schedule, 8 * tempo * 1000 - 40);
      musicNodes.push({ stop() { clearTimeout(id); } });
    }
    schedule();
  }

  return { unlock, sfx, startMusic, stopMusic, ensure };
})();
