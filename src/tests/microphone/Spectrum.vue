<template>
  <div class="spectrum">
    <canvas
      ref="waveCanvas"
      class="spectrum__canvas"
      width="320"
      height="80"
    />
    <canvas
      ref="freqCanvas"
      class="spectrum__canvas"
      width="320"
      height="80"
    />
  </div>
</template>

<script setup lang="ts">
import { defineOptions } from 'vue';
defineOptions({ name: 'SpectrumView' });
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
    analyser: AnalyserNode | null;
}>();

const waveCanvas = ref<HTMLCanvasElement | null>(null);
const freqCanvas = ref<HTMLCanvasElement | null>(null);

let rafId = 0;

function draw(): void {
    const analyser = props.analyser;
    const wave = waveCanvas.value;
    const freq = freqCanvas.value;
    if (!analyser || !wave || !freq) {
        rafId = requestAnimationFrame(draw);
        return;
    }
    const wctx = wave.getContext('2d');
    const fctx = freq.getContext('2d');
    if (!wctx || !fctx) {
        rafId = requestAnimationFrame(draw);
        return;
    }

    const rootStyle = getComputedStyle(wave);
    const bg = rootStyle.getPropertyValue('--bg').trim() || rootStyle.getPropertyValue('--surface').trim();
    const accent = rootStyle.getPropertyValue('--color-accent').trim();

    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);
    wctx.fillStyle = bg;
    wctx.fillRect(0, 0, wave.width, wave.height);
    wctx.strokeStyle = accent;
    wctx.beginPath();
    for (let i = 0; i < timeData.length; i += 1) {
        const x = (i / timeData.length) * wave.width;
        const y = (1 - ((timeData[i] as number) + 1) / 2) * wave.height;
        if (i === 0) wctx.moveTo(x, y);
        else wctx.lineTo(x, y);
    }
    wctx.stroke();

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    fctx.fillStyle = bg;
    fctx.fillRect(0, 0, freq.width, freq.height);
    const barWidth = freq.width / freqData.length;
    fctx.fillStyle = accent;
    for (let i = 0; i < freqData.length; i += 1) {
        const h = ((freqData[i] as number) / 255) * freq.height;
        fctx.fillRect(i * barWidth, freq.height - h, barWidth - 1, h);
    }

    rafId = requestAnimationFrame(draw);
}

onMounted(() => {
    rafId = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.spectrum {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.spectrum__canvas {
    width: 100%;
    height: 80px;
    background: var(--bg);
    border-radius: 4px;
}
</style>
