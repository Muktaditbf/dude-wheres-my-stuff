/**
 * Sound effects, synthesized on the fly with the Web Audio API.
 * No audio files: nothing to download, nothing to cache, works offline.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ac: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!context) {
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
    return master ? { ac: context, out: master } : null;
  } catch {
    return null;
  }
}

interface Tone {
  type: OscillatorType;
  freq: number;
  start: number;
  duration: number;
  gain: number;
  freqEnd?: number;
  vibrato?: { rate: number; depth: number };
  destination?: AudioNode;
}

function tone(ac: AudioContext, out: AudioNode, t: Tone) {
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = t.type;
  osc.frequency.setValueAtTime(t.freq, t.start);
  if (t.freqEnd) osc.frequency.exponentialRampToValueAtTime(t.freqEnd, t.start + t.duration);
  if (t.vibrato) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = t.vibrato.rate;
    depth.gain.value = t.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t.start);
    lfo.stop(t.start + t.duration + 0.05);
  }
  env.gain.setValueAtTime(0.0001, t.start);
  env.gain.exponentialRampToValueAtTime(t.gain, t.start + 0.015);
  env.gain.setValueAtTime(t.gain, Math.max(t.start + 0.02, t.start + t.duration - 0.06));
  env.gain.exponentialRampToValueAtTime(0.0001, t.start + t.duration);
  osc.connect(env).connect(t.destination ?? out);
  osc.start(t.start);
  osc.stop(t.start + t.duration + 0.05);
}

function lowpass(ac: AudioContext, out: AudioNode, frequency: number) {
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = frequency;
  filter.connect(out);
  return filter;
}

/** A tiny "bloop" when something is stashed. */
export function playPop() {
  const a = audio();
  if (!a) return;
  const now = a.ac.currentTime;
  tone(a.ac, a.out, {
    type: 'sine',
    freq: 480,
    freqEnd: 1100,
    start: now,
    duration: 0.11,
    gain: 0.5,
  });
}

/** BWAA BWA BWAAAAA. Found it! */
export function playAirHorn() {
  const a = audio();
  if (!a) return;
  const now = a.ac.currentTime;
  const filter = lowpass(a.ac, a.out, 2600);
  const blasts: Array<[number, number]> = [
    [0, 0.14],
    [0.19, 0.14],
    [0.38, 0.6],
  ];
  for (const [offset, duration] of blasts) {
    for (const freq of [466, 587, 698]) {
      tone(a.ac, a.out, {
        type: 'sawtooth',
        freq,
        start: now + offset,
        duration,
        gain: 0.16,
        vibrato: { rate: 9, depth: 6 },
        destination: filter,
      });
    }
  }
}

/** Wah wah wah waaaah. It's not there. */
export function playSadTrombone() {
  const a = audio();
  if (!a) return;
  const now = a.ac.currentTime;
  const filter = lowpass(a.ac, a.out, 1100);
  const notes: Array<[number, number, number]> = [
    [392, 0, 0.32],
    [370, 0.36, 0.32],
    [349, 0.72, 0.32],
    [330, 1.08, 1.1],
  ];
  notes.forEach(([freq, offset, duration], i) => {
    tone(a.ac, a.out, {
      type: 'sawtooth',
      freq,
      start: now + offset,
      duration,
      gain: 0.45,
      vibrato: i === notes.length - 1 ? { rate: 5.5, depth: 9 } : undefined,
      destination: filter,
    });
  });
}

/** A cartoon "bonk" for things that don't exist. */
export function playBonk() {
  const a = audio();
  if (!a) return;
  const now = a.ac.currentTime;
  tone(a.ac, a.out, {
    type: 'triangle',
    freq: 330,
    freqEnd: 70,
    start: now,
    duration: 0.28,
    gain: 0.7,
  });
}

/** Phone buzz, where supported. */
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported: no buzz, no problem.
  }
}
