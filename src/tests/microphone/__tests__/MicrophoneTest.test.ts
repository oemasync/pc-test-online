import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import MicrophoneTest from '../MicrophoneTest.vue';
import { getAudioContext } from '@/lib/audio';

class FakeAnalyser {
    fftSize = 2048;
    frequencyBinCount = 1024;
    getFloatTimeDomainData(arr: Float32Array) {
        for (let i = 0; i < arr.length; i += 1) arr[i] = 0.1;
    }
    getByteFrequencyData(arr: Uint8Array) {
        for (let i = 0; i < arr.length; i += 1) arr[i] = 10;
    }
    connect() {}
    disconnect() {}
}

const closeSpy = vi.fn();
class FakeAudioContext {
    state = 'running';
    close = closeSpy;
    createAnalyser() {
        return new FakeAnalyser();
    }
    createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
    }
    async resume() {}
}

class FakeMediaRecorder {
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
        this.state = 'recording';
    }
    stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
    }
    static isTypeSupported() {
        return true;
    }
}

describe('MicrophoneTest', () => {
    beforeEach(() => {
        closeSpy.mockClear();
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            return setTimeout(() => cb(performance.now()), 0) as unknown as number;
        });
        vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
        // @ts-expect-error test override
        window.AudioContext = FakeAudioContext;
        // @ts-expect-error test override
        window.MediaRecorder = FakeMediaRecorder;
        const track = { stop: vi.fn(), getSettings: () => ({}) };
        const fakeStream = { getAudioTracks: () => [track], getTracks: () => [track] };
        // @ts-expect-error test override
        navigator.mediaDevices = {
            getUserMedia: vi.fn().mockResolvedValue(fakeStream),
            enumerateDevices: vi
                .fn()
                .mockResolvedValue([{ kind: 'audioinput', deviceId: 'mic1', label: 'Mic 1' }]),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('mounts without crashing', () => {
        const wrapper = mountWithPlugins(MicrophoneTest);
        expect(wrapper.exists()).toBe(true);
    });

    it('releases tracks on unmount', async () => {
        const cancelSpy = vi.fn();
        vi.stubGlobal('cancelAnimationFrame', cancelSpy);
        const track = { stop: vi.fn(), getSettings: () => ({}) };
        const fakeStream = { getAudioTracks: () => [track], getTracks: () => [track] };
        navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(fakeStream);
        const wrapper = mountWithPlugins(MicrophoneTest);
        await new Promise(r => setTimeout(r, 10));
        wrapper.unmount();
        await new Promise(r => setTimeout(r, 10));
        expect(track.stop).toHaveBeenCalled();
        expect(cancelSpy).toHaveBeenCalled();
        expect(closeSpy).not.toHaveBeenCalled();
        expect(getAudioContext()).not.toBeNull();
    });
});
