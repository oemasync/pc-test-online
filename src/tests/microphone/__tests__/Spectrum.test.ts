import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import SpectrumView from '../Spectrum.vue';

describe('SpectrumView', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--bg', '#111111');
    document.documentElement.style.setProperty('--color-accent', '#22c55e');
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  it('draws without crashing when an analyser is provided', async () => {
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
    await new Promise((r) => setTimeout(r, 20));
    expect(wrapper.find('canvas').exists()).toBe(true);
    wrapper.unmount();
  });

  it('does not crash when analyser is null', async () => {
    const wrapper = mountWithPlugins(SpectrumView, { props: { analyser: null } });
    await new Promise((r) => setTimeout(r, 20));
    expect(wrapper.find('.spectrum').exists()).toBe(true);
    wrapper.unmount();
  });
});
