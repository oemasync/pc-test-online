// Framework-free logic for the speakers test module.
// No Vue imports, no src/core imports.

export const SWEEP_MIN_HZ = 20;
export const SWEEP_MAX_HZ = 20000;
export const A4_HZ = 440;
export const A4_MIDI = 69;
export const MAX_OUTPUT_GAIN = 0.25; // -12 dBFS ceiling for every gain path
export const DEFAULT_TONE_VOLUME = 0.1;
export const CLICK_FREE_ATTACK_S = 0.005;
export const SWEEP_REACTION_TIME_S = 0.25;

export type Channel = 'left' | 'right' | 'both';
export type SweepDirection = 'rising' | 'falling';
export type Polarity = 'inPhase' | 'inverted';
export type SinkIdSupport = 'audioContext' | 'mediaElement' | 'none';
export type RampKind = 'set' | 'linear' | 'setTargetAtTime';

export interface GainPoint {
    time: number;
    value: number;
    ramp: RampKind;
    timeConstant?: number;
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

export interface MarkedSweepOptions {
    pressTime: number;
    duration: number;
    direction?: SweepDirection;
    reactionTime?: number;
    min?: number;
    max?: number;
}

// ---------- Sweep (logarithmic 20 Hz .. 20 kHz) ----------

export function sweepFrequencyAtTime(
    t: number,
    duration: number,
    min: number = SWEEP_MIN_HZ,
    max: number = SWEEP_MAX_HZ
): number {
    const ratio = Math.pow(max / min, t / duration);
    return min * ratio;
}

export function fallingSweepFrequencyAtTime(
    t: number,
    duration: number,
    min: number = SWEEP_MIN_HZ,
    max: number = SWEEP_MAX_HZ
): number {
    const ratio = Math.pow(min / max, t / duration);
    return max * ratio;
}

export function sweepTimeAtFrequency(
    hz: number,
    duration: number,
    min: number = SWEEP_MIN_HZ,
    max: number = SWEEP_MAX_HZ
): number {
    const span = Math.log(max / min);
    const pos = Math.log(hz / min) / span;
    return pos * duration;
}

export function compensatedSweepTime(
    pressTime: number,
    reactionTime: number,
    duration: number
): number {
    const t = pressTime - reactionTime;
    if (t < 0) return 0;
    if (t > duration) return duration;
    return t;
}

export function markedSweepFrequency(options: MarkedSweepOptions): number {
    const min = options.min ?? SWEEP_MIN_HZ;
    const max = options.max ?? SWEEP_MAX_HZ;
    const reactionTime = options.reactionTime ?? SWEEP_REACTION_TIME_S;
    const direction = options.direction ?? 'rising';
    const t = compensatedSweepTime(options.pressTime, reactionTime, options.duration);
    return direction === 'falling'
        ? fallingSweepFrequencyAtTime(t, options.duration, min, max)
        : sweepFrequencyAtTime(t, options.duration, min, max);
}

// ---------- Note to frequency ----------

export function midiNoteToFrequency(midi: number): number {
    return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

// ---------- Channel / panner ----------

export function panForChannel(channel: Channel): number {
    if (channel === 'left') return -1;
    if (channel === 'right') return 1;
    return 0;
}

// ---------- Gain ----------

export function voiceGain(volume: number, voiceCount: number): number {
    const v = volume > MAX_OUTPUT_GAIN ? MAX_OUTPUT_GAIN : volume;
    return v / voiceCount;
}

export function gainRampEnvelope(
    startTime: number,
    peak: number,
    attack: number,
    hold: number,
    release: number
): GainPoint[] {
    const clampedPeak = peak > MAX_OUTPUT_GAIN ? MAX_OUTPUT_GAIN : peak;
    const t0 = startTime;
    const t1 = t0 + attack;
    const t2 = t1 + hold;
    const t3 = t2 + release;
    const timeConstant = release / 5;
    return [
        { time: t0, value: 0, ramp: 'set' },
        { time: t1, value: clampedPeak, ramp: 'linear' },
        { time: t2, value: 0, ramp: 'setTargetAtTime', timeConstant },
        { time: t3, value: 0, ramp: 'set' },
    ];
}

// ---------- Chord ----------

export const MAJOR_CHORD_INTERVALS: readonly number[] = [0, 4, 7];

export function chordFrequencies(rootHz: number, intervals: readonly number[]): number[] {
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

export function rightChannelPolarityMultiplier(polarity: Polarity): number {
    return polarity === 'inverted' ? -1 : 1;
}

// ---------- Audible range reducer ----------

export function createAudibleRange(): AudibleRangeState {
    return { lowHz: null, highHz: null, complete: false };
}

export function audibleRangeReducer(
    state: AudibleRangeState,
    action: AudibleRangeAction
): AudibleRangeState {
    switch (action.type) {
        case 'markLow': {
            return { ...state, lowHz: action.hz };
        }
        case 'markHigh': {
            return { ...state, highHz: action.hz };
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
    if (highHz <= lowHz) return 0;
    return Math.log2(highHz / lowHz);
}

export function isAudibleRangeComplete(state: AudibleRangeState): boolean {
    return state.lowHz !== null && state.highHz !== null && state.lowHz < state.highHz;
}

// ---------- SinkId feature detection ----------

export function detectSinkIdSupport(
    audioContextHasSetSinkId: boolean,
    mediaElementHasSetSinkId: boolean
): SinkIdSupport {
    if (audioContextHasSetSinkId) return 'audioContext';
    if (mediaElementHasSetSinkId) return 'mediaElement';
    return 'none';
}
