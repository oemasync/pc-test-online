import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import SpectrumView from '../Spectrum.vue';

describe('SpectrumView', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--bg', '#111111');
    document.documentElement.style.setProperty('--color-accent', '#22c55e');

    const contexts = new Map<HTMLCanvasElement, Record<string, unknown>>();
    const makeCtx = () => ({
      fillStyle: '',
      strokeStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      if (!contexts.has(this)) contexts.set(this, makeCtx());
      return contexts.get(this) as unknown as CanvasRenderingContext2D;
    });

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads token colours into the canvas context', async () => {
    const analyser = {
      fftSize: 64,
      frequencyBinCount: 32,
      getFloatTimeDomainData: (arr: Float32Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = 0;
      },
      getByteFrequencyData: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = 0;
      },
    } as unknown as AnalyserNode;

    const wrapper = mountWithPlugins(SpectrumView, { props: { analyser } });
    await new Promise((r) => setTimeout(r, 50));

    const canvases = wrapper.findAll('canvas');
    expect(canvases).toHaveLength(2);
    const waveContext = (canvases[0]!.element as HTMLCanvasElement).getContext(
      '2d',
    ) as unknown as { fillStyle: string; strokeStyle: string };
    const freqContext = (canvases[1]!.element as HTMLCanvasElement).getContext(
      '2d',
    ) as unknown as { fillStyle: string; strokeStyle: string };

    expect(waveContext.fillStyle).toBe('#111111');
    expect(waveContext.strokeStyle).toBe('#22c55e');
    expect(freqContext.fillStyle).toBe('#22c55e');

    wrapper.unmount();
  });

  it('throttles drawing when reduced motion is preferred', async () => {
    vi.useFakeTimers();
    const originalMatchMedia = window.matchMedia;

    const run = async (reducedMotion: boolean): Promise<number> => {
      let frameIndex = 0;
      const maxFrames = 63;
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        const idx = frameIndex;
        if (idx >= maxFrames) return 0;
        frameIndex += 1;
        return setTimeout(() => cb(idx * 16), 0) as unknown as number;
      });
      vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

      const getFloatSpy = vi.fn((arr: Float32Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = 0;
      });
      const analyser = {
        fftSize: 64,
        frequencyBinCount: 32,
        getFloatTimeDomainData: getFloatSpy,
        getByteFrequencyData: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i += 1) arr[i] = 0;
        },
      } as unknown as AnalyserNode;

      const mq = {
        matches: reducedMotion,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.stubGlobal('matchMedia', () => mq);

      const wrapper = mountWithPlugins(SpectrumView, { props: { analyser } });
      await vi.runAllTimersAsync();
      wrapper.unmount();
      return getFloatSpy.mock.calls.length;
    };

    const reducedCount = await run(true);
    const normalCount = await run(false);
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();

    expect(reducedCount).toBeGreaterThanOrEqual(3);
    expect(reducedCount).toBeLessThanOrEqual(5);
    expect(normalCount).toBeGreaterThan(50);
  });
    it('does not crash when analyser is null', async () => {
    const wrapper = mountWithPlugins(SpectrumView, { props: { analyser: null } });
    await new Promise((r) => setTimeout(r, 20));
    expect(wrapper.find('.spectrum').exists()).toBe(true);
    wrapper.unmount();
  });
});
