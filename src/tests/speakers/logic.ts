// Framework-free logic for the speakers test module.
// No Vue imports, no src/core imports.

export const SWEEP_MIN_HZ = 20;
export const SWEEP_MAX_HZ = 20000;
export const A4_HZ = 440;
export const A4_MIDI = 69;

export type Channel = 'left' | 'right' | 'both';

export type SinkIdSupport = 'audioContext' | 'mediaElement' | 'none';

export interface GainPoint {
    time: number;
    value: number;
}

export interface AudibleRangeState {
    lowHz: number | null;
    highHz: number | null;
    complete: boolean;
}

export type AudibleRangeAction =
    | { type: 'markLow'; hz: number }
    | { type: 'markHigh'; hz: number }
    | { type: 'reset' }
    | { type: 'complete' };

// ---------- Sweep (logarithmic 20 Hz .. 20 kHz) ----------

export function clampFrequency(hz: number, min: number, max: number): number {
    if (hz < min) return min;
    if (hz > max) return max;
    return hz;
}

export function sweepFrequencyAtTime(
    t: number,
    duration: number,
    min: number = SWEEP_MIN_HZ,
    max: number = SWEEP_MAX_HZ,
): number {
    if (duration <= 0) return min;
    const clampedT = t < 0 ? 0 : t > duration ? duration : t;
    const ratio = Math.pow(max / min, clampedT / duration);
    return min * ratio;
}

export function sweepTimeAtFrequency(
    hz: number,
    duration: number,
    min: number = SWEEP_MIN_HZ,
    max: number = SWEEP_MAX_HZ,
): number {
    if (duration <= 0) return 0;
    if (hz <= min) return 0;
    if (hz >= max) return duration;
    const span = Math.log(max / min);
    if (span === 0) return 0;
    const pos = Math.log(hz / min) / span;
    const t = pos * duration;
    if (t < 0) return 0;
    if (t > duration) return duration;
    return t;
}

// ---------- Note to frequency ----------

export function midiNoteToFrequency(midi: number): number {
    return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function frequencyToMidiNote(hz: number): number {
    if (hz <= 0) return A4_MIDI;
    return Math.round(A4_MIDI + 12 * Math.log2(hz / A4_HZ));
}

const NOTE_SEMITONES: Readonly<Record<string, number>> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
};

export function noteNameToFrequency(name: string): number | null {
    const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
    if (!m) return null;
    const letter = m[1];
    if (letter === undefined) return null;
    const accidental = m[2] ?? '';
    const octaveStr = m[3];
    if (octaveStr === undefined) return null;
    const octave = Number.parseInt(octaveStr, 10);
    if (!Number.isFinite(octave)) return null;
    const base = NOTE_SEMITONES[letter.toUpperCase()];
    if (base === undefined) return null;
    let semitone = base;
    if (accidental === '#') semitone += 1;
    else if (accidental === 'b') semitone -= 1;
    const midi = (octave + 1) * 12 + semitone;
    return midiNoteToFrequency(midi);
}

// ---------- Channel / panner ----------

export function panForChannel(channel: Channel): number {
    if (channel === 'left') return -1;
    if (channel === 'right') return 1;
    return 0;
}

// ---------- Gain ramp scheduling (avoid clicks) ----------

export function gainRampEnvelope(
    startTime: number,
    peak: number,
    attack: number,
    hold: number,
    release: number,
): GainPoint[] {
    const p = peak < 0 ? 0 : peak;
    const a = attack < 0 ? 0 : attack;
    const h = hold < 0 ? 0 : hold;
    const r = release < 0 ? 0 : release;
    const t0 = startTime;
    const t1 = t0 + a;
    const t2 = t1 + h;
    const t3 = t2 + r;
    return [
        { time: t0, value: 0 },
        { time: t1, value: p },
        { time: t2, value: p },
        { time: t3, value: 0 },
    ];
}

export function clickFreeAttackDuration(sampleRate: number): number {
    // ~5 ms attack avoids clicks on most hardware
    return sampleRate > 0 ? 0.005 : 0.005;
}

// ---------- Chord ----------

export const MAJOR_CHORD_INTERVALS: readonly number[] = [0, 4, 7];

export function chordFrequencies(rootHz: number, intervals: readonly number[]): number[] {
    if (rootHz <= 0) return [];
    const out: number[] = [];
    for (const semi of intervals) {
        out.push(rootHz * Math.pow(2, semi / 12));
    }
    return out;
}

export function pleasantChordFrequencies(rootHz: number = midiNoteToFrequency(60)): number[] {
    return chordFrequencies(rootHz, MAJOR_CHORD_INTERVALS);
}

// ---------- Polarity / phase ----------

export type Polarity = 'normal' | 'inverted';

export function polarityMultiplier(channel: Channel, polarity: Polarity): number {
    if (polarity === 'normal') return 1;
    // Inverted stereo: flip the right channel only.
    if (channel === 'right') return -1;
    if (channel === 'both') return 1;
    return 1;
}

// ---------- Audible range reducer ----------

export function createAudibleRange(): AudibleRangeState {
    return { lowHz: null, highHz: null, complete: false };
}

export function audibleRangeReducer(
    state: AudibleRangeState,
    action: AudibleRangeAction,
): AudibleRangeState {
    switch (action.type) {
        case 'markLow': {
            const hz = clampFrequency(action.hz, SWEEP_MIN_HZ, SWEEP_MAX_HZ);
            return { ...state, lowHz: hz };
        }
        case 'markHigh': {
            const hz = clampFrequency(action.hz, SWEEP_MIN_HZ, SWEEP_MAX_HZ);
            return { ...state, highHz: hz };
        }
        case 'reset':
            return createAudibleRange();
        case 'complete':
            return { ...state, complete: true };
        default: {
            const _exhaustive: never = action;
            throw new Error(`Unhandled action: ${String(_exhaustive)}`);
        }
    }
}

export function audibleRangeSpanOctaves(lowHz: number, highHz: number): number {
    if (lowHz <= 0 || highHz <= 0) return 0;
    if (highHz <= lowHz) return 0;
    return Math.log2(highHz / lowHz);
}

export function isAudibleRangeComplete(state: AudibleRangeState): boolean {
    return state.lowHz !== null && state.highHz !== null && state.lowHz < state.highHz;
}

// ---------- SinkId feature detection ----------

export function audioContextSupportsSinkId(ctx: { setSinkId?: unknown } | null | undefined): boolean {
    return !!ctx && typeof ctx.setSinkId === 'function';
}

export function mediaElementSupportsSinkId(el: { setSinkId?: unknown } | null | undefined): boolean {
    return !!el && typeof el.setSinkId === 'function';
}

export function detectSinkIdSupport(
    ctx: { setSinkId?: unknown } | null | undefined,
    el: { setSinkId?: unknown } | null | undefined,
): SinkIdSupport {
    if (audioContextSupportsSinkId(ctx)) return 'audioContext';
    if (mediaElementSupportsSinkId(el)) return 'mediaElement';
    return 'none';
}