import { vi } from 'vitest';

export interface FakeOscillator {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    frequency: {
        value: number;
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    onended: (() => void) | null;
}

export function makeFakeAudioContext(): {
    ctx: AudioContext;
    oscillators: FakeOscillator[];
    gains: {
        gain: {
            value: number;
            setValueAtTime: ReturnType<typeof vi.fn>;
            linearRampToValueAtTime: ReturnType<typeof vi.fn>;
            setTargetAtTime: ReturnType<typeof vi.fn>;
        };
        connect: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
    }[];
} {
    const oscillators: FakeOscillator[] = [];
    const gains: {
        gain: {
            value: number;
            setValueAtTime: ReturnType<typeof vi.fn>;
            linearRampToValueAtTime: ReturnType<typeof vi.fn>;
            setTargetAtTime: ReturnType<typeof vi.fn>;
        };
        connect: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
    }[] = [];
    const ctx = {
        currentTime: 0.5,
        state: 'running',
        destination: {},
        resume: vi.fn(async () => undefined),
        createOscillator: vi.fn(() => {
            const osc: FakeOscillator = {
                start: vi.fn(),
                stop: vi.fn(),
                disconnect: vi.fn(),
                connect: vi.fn(),
                frequency: {
                    value: 0,
                    setValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn(),
                },
                onended: null,
            };
            oscillators.push(osc);
            return osc as unknown as OscillatorNode;
        }),
        createGain: vi.fn(() => {
            const gain = {
                gain: {
                    value: 0,
                    setValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn(),
                    setTargetAtTime: vi.fn(),
                },
                connect: vi.fn(),
                disconnect: vi.fn(),
            };
            gains.push(gain);
            return gain as unknown as GainNode;
        }),
        createStereoPanner: vi.fn(() => ({
            pan: { value: 0 },
            connect: vi.fn(),
            disconnect: vi.fn(),
        })),
    } as unknown as AudioContext;
    return { ctx, oscillators, gains };
}
