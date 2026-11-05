// ================= Sound =================
const Snd = {
  ctx: null,
  c() { if (!S.sound) return null; try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
  tap(freq, vol, len) { const c = this.c(); if (!c) return; const n = c.sampleRate * len, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; g.gain.value = vol; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); },
  tone(f, len, vol) { const c = this.c(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + len); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + len); },
  move() { this.tap(900, .9, .07); }, capture() { this.tap(500, 1.3, .11); setTimeout(() => this.tap(1300, .5, .05), 40); },
  check() { this.tone(880, .18, .05); }, end() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, .3, .05), i * 130)); }
};

