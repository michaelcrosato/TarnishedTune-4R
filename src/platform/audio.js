/** Procedural score and engine-synthesized effects. Audio unlocks only after a real user gesture. */
import { defineSfx, renderSfx, Rng } from '../../vendor/my3dge/my3dge.js';
const definitions = {
  hit: [
    { wave: 'noise', freq: 2600, to: 650, dur: 0.09, vol: 0.3 },
    { wave: 'triangle', freq: 155, to: 65, dur: 0.16, vol: 0.3 },
  ],
  swing: [{ wave: 'noise', freq: 900, to: 2400, dur: 0.18, vol: 0.12, filter: 'bandpass' }],
  parry: [
    { wave: 'sine', freq: 1250, dur: 0.6, vol: 0.3 },
    { wave: 'triangle', freq: 1865, dur: 0.4, vol: 0.12 },
    { wave: 'noise', freq: 4000, dur: 0.04, vol: 0.16 },
  ],
  bell: [
    { wave: 'sine', freq: 164.81, dur: 2.5, vol: 0.27 },
    { wave: 'sine', freq: 330.5, dur: 2.1, vol: 0.13 },
    { wave: 'sine', freq: 445.3, dur: 1.4, vol: 0.1 },
  ],
  heal: [
    { wave: 'sine', freq: 440, to: 880, dur: 0.65, vol: 0.13 },
    { wave: 'triangle', freq: 659, to: 1318, dur: 0.7, vol: 0.08 },
  ],
  step: [
    { wave: 'noise', freq: 1100, to: 400, dur: 0.065, vol: 0.1, filter: 'lowpass' },
    { wave: 'sine', freq: 100, to: 55, dur: 0.08, vol: 0.09 },
  ],
  hurt: [
    { wave: 'noise', freq: 550, to: 180, dur: 0.15, vol: 0.23 },
    { wave: 'sine', freq: 100, to: 35, dur: 0.3, vol: 0.3 },
  ],
  select: [{ wave: 'sine', freq: 550, to: 660, dur: 0.08, vol: 0.08 }],
};
for (const [name, voices] of Object.entries(definitions))
  defineSfx(`sfx:tune-${name}`, { voices, variants: 3, vary: 0.05 });
const eventSound = {
  hit: 'hit',
  swing: 'swing',
  parry: 'parry',
  block: 'parry',
  heal: 'heal',
  pickup: 'bell',
  rest: 'bell',
  upgrade: 'heal',
  hurt: 'hurt',
  death: 'hurt',
  'boss-enter': 'bell',
  phase: 'bell',
  resonance: 'bell',
  victory: 'bell',
  break: 'hit',
  roll: 'swing',
  land: 'step',
  'enemy-swing': 'swing',
  gate: 'bell',
};
export function createSound(settings) {
  let ctx = null,
    master = null,
    music = null,
    ready = false,
    lastEvent = 0,
    lastStep = 0,
    lastNote = 0,
    buffers = new Map(),
    played = 0;
  function configure(s) {
    settings = s;
    if (master) master.gain.setTargetAtTime(settings.volume, ctx.currentTime, 0.08);
    if (music) music.gain.setTargetAtTime(settings.music * 0.22, ctx.currentTime, 0.2);
  }
  function play(name, volume = 1) {
    if (!ready || ctx.state !== 'running') return;
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffers.get(name);
    gain.gain.value = volume;
    source.connect(gain).connect(master);
    source.start();
    played++;
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }
  return {
    async unlock() {
      if (ctx) {
        if (ctx.state === 'suspended') await ctx.resume();
        return;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.connect(ctx.destination);
        music = ctx.createGain();
        music.connect(master);
        for (const name of Object.keys(definitions)) {
          const samples = renderSfx(`sfx:tune-${name}`, { sampleRate: ctx.sampleRate });
          const b = ctx.createBuffer(1, samples.length, ctx.sampleRate);
          b.copyToChannel(samples, 0);
          buffers.set(name, b);
        }
        const rng = new Rng(45),
          impulse = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const a = impulse.getChannelData(c);
          for (let i = 0; i < a.length; i++) a[i] = rng.range(-1, 1) * Math.pow(1 - i / a.length, 3) * 0.22;
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = 0.3;
        music.connect(reverb).connect(wet).connect(master);
        for (const freq of [82.4069, 123.4708, 164.8138]) {
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.value = 0.22;
          o.connect(g).connect(music);
          o.start();
        }
        configure(settings);
        await ctx.resume();
        ready = true;
      } catch {
        ready = false;
      }
    },
    configure,
    play,
    reset() {
      lastEvent = 0;
      lastStep = 0;
    },
    frame(s, time, mode) {
      if (!ready) return;
      for (const e of s.c.events)
        if (e.id > lastEvent) {
          if (eventSound[e.type]) play(eventSound[e.type], e.type === 'enemy-swing' ? 0.45 : 0.7);
          lastEvent = e.id;
        }
      if (s.p.speed > 0.5 && time - lastStep > (s.p.speed > 5 ? 0.28 : 0.42)) {
        play('step', 0.45);
        lastStep = time;
      }
      if (time - lastNote > (s.c.bossStarted ? 4 : 11)) {
        play('bell', s.c.bossStarted ? 0.12 : 0.07);
        lastNote = time;
      }
      music.gain.setTargetAtTime(
        settings.music * (mode === 'title' ? 0.1 : s.c.bossStarted ? 0.3 : 0.18),
        ctx.currentTime,
        2,
      );
    },
    get info() {
      return { state: ctx?.state || 'locked', ready, played, effects: buffers.size };
    },
  };
}
