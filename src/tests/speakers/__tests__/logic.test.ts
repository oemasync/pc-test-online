import { describe, it, expect } from 'vitest';
import {
    SWEEP_MIN_HZ,
    SWEEP_MAX_HZ,
    MAX_OUTPUT_GAIN,
    DEFAULT_TONE_VOLUME,
    CLICK_FREE_ATTACK_S,
    SWEEP_REACTION_TIME_S,
    sweepFrequencyAtTime,
    fallingSweepFrequencyAtTime,
    sweepTimeAtFrequency,
    compensatedSweepTime,
    markedSweepFrequency,
    midiNoteToFrequency,
    panForChannel,
    gainRampEnvelope,
    chordFrequencies,
    pleasantChordFrequencies,
    MAJOR_CHORD_INTERVALS,
    rightChannelPolarityMultiplier,
    createAudibleRange,
    audibleRangeReducer,
    audibleRangeSpanOctaves,
    isAudibleRangeComplete,
    detectSinkIdSupport,
    type AudibleRangeState,
} from '../logic';

describe('sweep', () => {
    it('starts at min and ends at max', () => {
        expect(sweepFrequencyAtTime(0, 10)).toBeCloseTo(SWEEP_MIN_HZ, 6);
        expect(sweepFrequencyAtTime(10, 10)).toBeCloseTo(SWEEP_MAX_HZ, 6);
    });

    it('is logarithmic midpoint = geometric mean', () => {
        const mid = sweepFrequencyAtTime(5, 10);
        const geo = Math.sqrt(SWEEP_MIN_HZ * SWEEP_MAX_HZ);
        expect(mid).toBeCloseTo(geo, 3);
    });

    it('clamps out-of-range t', () => {
        expect(sweepFrequencyAtTime(-1, 10)).toBeCloseTo(SWEEP_MIN_HZ, 6);
        expect(sweepFrequencyAtTime(100, 10)).toBeCloseTo(SWEEP_MAX_HZ, 6);
    });

    it('handles non-positive duration', () => {
        expect(sweepFrequencyAtTime(5, 0)).toBe(SWEEP_MIN_HZ);
    });

    it('inverse round-trips', () => {
        for (const t of [0, 1, 2.5, 5, 9.9]) {
            const f = sweepFrequencyAtTime(t, 10);
            const t2 = sweepTimeAtFrequency(f, 10);
            expect(t2).toBeCloseTo(t, 6);
        }
    });

    it('falling sweep starts high ends low', () => {
        expect(fallingSweepFrequencyAtTime(0, 10)).toBeCloseTo(SWEEP_MAX_HZ, 6);
        expect(fallingSweepFrequencyAtTime(10, 10)).toBeCloseTo(SWEEP_MIN_HZ, 6);
    });

    it('reaction-time compensation lowers marked frequency on rising sweep', () => {
        const pressTime = 5;
        const marked = markedSweepFrequency(pressTime, 10, SWEEP_REACTION_TIME_S);
        const atPress = sweepFrequencyAtTime(pressTime, 10);
        expect(marked).toBeLessThan(atPress);
    });

    it('compensatedSweepTime clamps', () => {
        expect(compensatedSweepTime(0.1, 0.25, 10)).toBe(0);
        expect(compensatedSweepTime(20, 0.25, 10)).toBe(10);
    });
});

describe('note to frequency', () => {
    it('A4 = 440', () => {
        expect(midiNoteToFrequency(69)).toBeCloseTo(440, 6);
    });

    it('C4 ~ 261.63', () => {
        expect(midiNoteToFrequency(60)).toBeCloseTo(261.63, 2);
    });
});

describe('channels', () => {
    it('pan values', () => {
        expect(panForChannel('left')).toBe(-1);
        expect(panForChannel('right')).toBe(1);
        expect(panForChannel('both')).toBe(0);
    });
});

describe('gain ramp', () => {
    it('produces attack/hold/release envelope', () => {
        const pts = gainRampEnvelope(0, 0.3, 0.05, 0.3, 0.05);
        expect(pts).toHaveLength(4);
        expect(pts[0]?.value).toBe(0);
        expect(pts[0]?.ramp).toBe('setTargetAtTime');
        expect(pts[1]?.value).toBeCloseTo(MAX_OUTPUT_GAIN, 6); // clamped to ceiling
        expect(pts[2]?.value).toBeCloseTo(MAX_OUTPUT_GAIN, 6);
        expect(pts[3]?.value).toBe(0);
        expect(pts[3]?.ramp).toBe('setTargetAtTime');
    });

    it('caps peak at ceiling', () => {
        const pts = gainRampEnvelope(0, 10, 0.01, 0.1, 0.01);
        for (const p of pts) expect(p.value).toBeLessThanOrEqual(MAX_OUTPUT_GAIN);
    });

    it('no exponential ramp targets zero', () => {
        const pts = gainRampEnvelope(0, 0.2, 0.01, 0.1, 0.01);
        for (const p of pts) {
            if (p.value === 0) expect(p.ramp).not.toBe('linear');
        }
    });
});

describe('chord', () => {
    it('major chord intervals', () => {
        const f = chordFrequencies(261.63, MAJOR_CHORD_INTERVALS);
        expect(f).toHaveLength(3);
        expect(f[0]).toBeCloseTo(261.63, 2);
        expect(f[1]).toBeCloseTo(329.63, 2);
        expect(f[2]).toBeCloseTo(392.0, 2);
    });

    it('pleasant chord defaults to C4 major', () => {
        const f = pleasantChordFrequencies();
        expect(f).toHaveLength(3);
    });
});

describe('polarity', () => {
    it('in-phase right multiplier +1', () => {
        expect(rightChannelPolarityMultiplier('inPhase')).toBe(1);
    });

    it('inverted right multiplier -1', () => {
        expect(rightChannelPolarityMultiplier('inverted')).toBe(-1);
    });
});

describe('audible range reducer', () => {
    it('starts empty', () => {
        const s = createAudibleRange();
        expect(s.lowHz).toBeNull();
        expect(s.highHz).toBeNull();
        expect(s.complete).toBe(false);
    });

    it('marks low/high', () => {
        let s: AudibleRangeState = createAudibleRange();
        s = audibleRangeReducer(s, { type: 'markLow', hz: 30 });
        s = audibleRangeReducer(s, { type: 'markHigh', hz: 18000 });
        expect(s.lowHz).toBe(30);
        expect(s.highHz).toBe(18000);
    });

    it('reset clears', () => {
        let s: AudibleRangeState = createAudibleRange();
        s = audibleRangeReducer(s, { type: 'markLow', hz: 30 });
        s = audibleRangeReducer(s, { type: 'reset' });
        expect(s.lowHz).toBeNull();
    });

    it('complete sets flag', () => {
        let s: AudibleRangeState = createAudibleRange();
        s = audibleRangeReducer(s, { type: 'complete' });
        expect(s.complete).toBe(true);
    });

    it('span octaves', () => {
        expect(audibleRangeSpanOctaves(100, 400)).toBeCloseTo(2, 6);
        expect(audibleRangeSpanOctaves(100, 100)).toBe(0);
    });

    it('isAudibleRangeComplete requires low<high', () => {
        let s: AudibleRangeState = createAudibleRange();
        s = audibleRangeReducer(s, { type: 'markLow', hz: 100 });
        s = audibleRangeReducer(s, { type: 'markHigh', hz: 50 });
        expect(isAudibleRangeComplete(s)).toBe(false);
        s = audibleRangeReducer(s, { type: 'markHigh', hz: 5000 });
        expect(isAudibleRangeComplete(s)).toBe(true);
    });
});

describe('sink id support', () => {
    it('detects via booleans', () => {
        expect(detectSinkIdSupport(true, false)).toBe('audioContext');
        expect(detectSinkIdSupport(false, true)).toBe('mediaElement');
        expect(detectSinkIdSupport(false, false)).toBe('none');
        expect(detectSinkIdSupport(true, true)).toBe('audioContext');
    });
});