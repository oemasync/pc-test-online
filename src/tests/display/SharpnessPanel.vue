<template>
  <section class="sharpness-panel">
    <h3>{{ t('tests.display.sharpness.title') }}</h3>
    <p>{{ t('tests.display.sharpness.description') }}</p>
    <canvas
      ref="canvasRef"
      class="sharpness-panel__canvas"
    />
    <label class="sharpness-panel__toggle">
      <input
        v-model="defect"
        type="checkbox"
      >
      {{ t('tests.display.sharpness.markDefect') }}
    </label>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{ (e: 'update:defect', value: boolean): void }>();

const { t } = useI18n();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const defect = ref(false);

function draw(): void {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const cssWidth = 320;
    const cssHeight = 160;
    const ratio = window.devicePixelRatio || 1;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, cssWidth, cssHeight);

    const deviceWidth = canvas.width;
    const deviceHeight = canvas.height;
    context.fillStyle = '#000000';
    for (let y = 0; y < deviceHeight; y += 1) {
        for (let x = 0; x < deviceWidth; x += 1) {
            if ((x + y) % 2 === 0) {
                context.fillRect(x / ratio, y / ratio, 1 / ratio, 1 / ratio);
            }
        }
    }

    context.strokeStyle = '#000000';
    context.lineWidth = 1 / ratio;
    const midY = Math.round(cssHeight / 2);
    const midX = Math.round(cssWidth / 2);
    context.beginPath();
    context.moveTo(0, midY);
    context.lineTo(cssWidth, midY);
    context.moveTo(midX, 0);
    context.lineTo(midX, cssHeight);
    context.stroke();
}

onMounted(() => {
    draw();
});

watch(defect, value => emit('update:defect', value));
</script>

<style scoped>
.sharpness-panel__canvas {
    display: block;
    max-width: 100%;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 0.5rem;
    margin: 0.5rem 0;
}

.sharpness-panel__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
