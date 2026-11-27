import { describe, it, expect } from 'vitest';
import {
    SWEEP_MIN_HZ,
    SWEEP_MAX_HZ,
    A4_HZ,
    sweepFrequencyAtTime,
    sweepTimeAtFrequency,
    midiNoteToFrequency,
    frequencyToMidiNote,
    noteNameToFrequency,
    panForChannel,
    gainRampEnvelope,
    clickFreeAttackDuration,
    chordFrequencies,
    pleasantChordFrequencies,
    MAJOR_CHORD_INTERVALS,
    polarityMultiplier,
    createAudibleRange,
    audibleRangeReducer,
    audibleRangeSpanOctaves,
    isAudibleRangeComplete,
    audioContextSupportsSinkId,
    mediaElementSupportsSinkId,
    detectSinkIdSupport,
    clampFrequency,
    type AudibleRangeState,
    type Channel,
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

    it('inverse clamps', () => {
        expect(sweepTimeAtFrequency(1, 10)).toBe(0);
        expect(sweepTimeAtFrequency(100000, 10)).toBe(10);
    });
});

describe('note to frequency', () => {
    it('A4 = 440', () => {
        expect(midiNoteToFrequency(69)).toBeCloseTo(440, 6);
        expect(noteNameToFrequency('A4')).toBeCloseTo(440, 6);
    });

    it('C4 ~ 261.63', () => {
        expect(noteNameToFrequency('C4')).toBeCloseTo(261.63, 2);
    });

    it('accidentals', () => {
        expect(noteNameToFrequency('A#4')).toBeCloseTo(466.16, 2);
        expect(noteNameToFrequency('Bb4')).toBeCloseTo(466.16, 2);
    });

    it('invalid returns null', () => {
        expect(noteNameToFrequency('Z9')).toBeNull();
        expect(noteNameToFrequency('')).toBeNull();
        expect(noteNameToFrequency('C')).toBeNull();
    });

    it('frequencyToMidiNote round trips', () => {
        expect(frequencyToMidiNote(440)).toBe(69);
        expect(midiNoteToFrequency(frequencyToMidiNote(261.63))).toBeCloseTo(261.63, 1);
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
        expect(pts[0]).toEqual({ time: 0, value: 0 });
        expect(pts[1]).toEqual({ time: 0.05, value: 0.3 });
        expect(pts[2]).toEqual({ time: 0.35, value: 0.3 });
        expect(pts[3]?.time).toBeCloseTo(0.4, 10);
        expect(pts[3]?.value).toBe(0);
    });

    it('clamps negatives', () => {
        const pts = gainRampEnvelope(1, -1, -1, -1, -1);
        expect(pts[0]?.value).toBe(0);
        expect(pts[1]?.value).toBe(0);
    });

    it('clickFreeAttackDuration positive', () => {
        expect(clickFreeAttackDuration(48000)).toBeGreaterThan(0);
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

    it('invalid root returns empty', () => {
        expect(chordFrequencies(0, [0, 4])).toEqual([]);
    });
});

describe('polarity', () => {
    it('normal = all +1', () => {
        expect(polarityMultiplier('left', 'normal')).toBe(1);
        expect(polarityMultiplier('right', 'normal')).toBe(1);
        expect(polarityMultiplier('both', 'normal')).toBe(1);
    });

    it('inverted flips right', () => {
        expect(polarityMultiplier('left', 'inverted')).toBe(1);
        expect(polarityMultiplier('right', 'inverted')).toBe(-1);
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

    it('clamps to sweep range', () => {
        let s: AudibleRangeState = createAudibleRange();
        s = audibleRangeReducer(s, { type: 'markLow', hz: 5 });
        s = audibleRangeReducer(s, { type: 'markHigh', hz: 30000 });
        expect(s.lowHz).toBe(SWEEP_MIN_HZ);
        expect(s.highHz).toBe(SWEEP_MAX_HZ);
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
    it('audioContext support', () => {
        expect(audioContextSupportsSinkId({ setSinkId: () => {} })).toBe(true);
        expect(audioContextSupportsSinkId({})).toBe(false);
        expect(audioContextSupportsSinkId(null)).toBe(false);
    });

    it('mediaElement support', () => {
        expect(mediaElementSupportsSinkId({ setSinkId: () => {} })).toBe(true);
        expect(mediaElementSupportsSinkId({})).toBe(false);
    });

    it('detectSinkIdSupport priority', () => {
        expect(detectSinkIdSupport({ setSinkId: () => {} }, null)).toBe('audioContext');
        expect(detectSinkIdSupport(null, { setSinkId: () => {} })).toBe('mediaElement');
        expect(detectSinkIdSupport(null, null)).toBe('none');
    });
});

describe('clampFrequency', () => {
    it('clamps and handles non-finite', () => {
        expect(clampFrequency(5, 20, 20000)).toBe(20);
        expect(clampFrequency(30000, 20, 20000)).toBe(20000);
    });
});