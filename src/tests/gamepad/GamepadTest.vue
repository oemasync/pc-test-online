<template>
  <TestLayout
    test-id="gamepad"
    :title="t('tests.gamepad.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.gamepad.instructions') }}
    </template>

    <p
      v-if="!supported"
      class="gamepad-test__unsupported"
    >
      {{ t('buttons.unsupported') }}
    </p>

    <div
      v-else-if="!selected"
      class="gamepad-test__empty"
    >
      {{ t('tests.gamepad.noPad') }}
    </div>

    <div
      v-else
      class="gamepad-test"
    >
      <PadPicker
        :pads="pads"
        :selected-index="selectedIndex"
        @update:selected-index="selectedIndex = $event"
      />

      <p class="gamepad-test__mapping">
        {{
          selected.mapping === 'standard'
            ? t('tests.gamepad.standardMapping')
            : t('tests.gamepad.genericMapping')
        }}
      </p>

      <ControllerVisual
        :mapping="selected.mapping"
        :left-x="axis(selected, 0)"
        :left-y="axis(selected, 1)"
        :right-x="axis(selected, 2)"
        :right-y="axis(selected, 3)"
        :button-pressed="selected.buttons.map(button => button.pressed)"
      />

      <div class="gamepad-test__sticks">
        <StickPanel
          :title="t('tests.gamepad.leftStick')"
          :x="axis(selected, 0)"
          :y="axis(selected, 1)"
          :drift="leftDrift"
          :circularity="leftCircularity"
          :samples="leftSamples"
          :rest-count="leftRest.length"
        />
        <StickPanel
          :title="t('tests.gamepad.rightStick')"
          :x="axis(selected, 2)"
          :y="axis(selected, 3)"
          :drift="rightDrift"
          :circularity="rightCircularity"
          :samples="rightSamples"
          :rest-count="rightRest.length"
        />
      </div>

      <StatTile
        :label="t('tests.gamepad.buttonsTested')"
        :value="`${buttonCoverageSummary.testedCount} / ${buttonCoverageSummary.total}`"
        aria-live="polite"
      />

      <TriggerPanel
        :left="leftTrigger"
        :right="rightTrigger"
      />

      <VibrationPanel
        :supported="vibrationSupported"
        :tested="vibrationTested"
        @test="testVibration"
      />
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import StatTile from '@/ui/StatTile.vue';
import PadPicker from './PadPicker.vue';
import ControllerVisual from './ControllerVisual.vue';
import StickPanel from './StickPanel.vue';
import TriggerPanel from './TriggerPanel.vue';
import VibrationPanel from './VibrationPanel.vue';
import {
    buttonCoverage,
    buttonCoverageReducer,
    circularityError,
    createCoverage,
    createTriggerRange,
    detectStickDrift,
    triggerRangeReducer,
    type StickPoint,
} from './logic';

const { t } = useI18n();
const supported = 'getGamepads' in navigator;

const pads = ref<Gamepad[]>([]);
const selectedIndex = ref<number | null>(null);
const selected = computed<Gamepad | null>(
    () => pads.value.find(pad => pad.index === selectedIndex.value) ?? null
);

const buttonCoverageState = ref<readonly boolean[]>([]);
const leftTrigger = ref(createTriggerRange());
const rightTrigger = ref(createTriggerRange());
const leftSamples = ref<StickPoint[]>([]);
const rightSamples = ref<StickPoint[]>([]);
const leftRest = ref<StickPoint[]>([]);
const rightRest = ref<StickPoint[]>([]);
const vibrationTested = ref(false);

let trackedPadIndex: number | null = null;
let trackedButtonCount = 0;
let rafId = 0;

function axis(pad: Gamepad | null, index: number): number {
    return pad?.axes[index] ?? 0;
}

function clampSamples(samples: StickPoint[]): StickPoint[] {
    if (samples.length <= 720) return samples;
    return samples.slice(samples.length - 720);
}

function clampRest(samples: StickPoint[]): StickPoint[] {
    if (samples.length <= 120) return samples;
    return samples.slice(samples.length - 120);
}

function resetForPad(pad: Gamepad): void {
    buttonCoverageState.value = createCoverage(pad.buttons.length);
    leftTrigger.value = createTriggerRange();
    rightTrigger.value = createTriggerRange();
    leftSamples.value = [];
    rightSamples.value = [];
    leftRest.value = [];
    rightRest.value = [];
    vibrationTested.value = false;
}

function refresh(): void {
    const raw = navigator.getGamepads?.() ?? [];
    const next = raw.filter((pad): pad is Gamepad => pad !== null && pad.connected);
    pads.value = next;

    if (selectedIndex.value === null || !next.some(pad => pad.index === selectedIndex.value)) {
        selectedIndex.value = next[0]?.index ?? null;
    }

    const pad = selected.value;
    if (!pad) return;

    if (trackedPadIndex !== pad.index || trackedButtonCount !== pad.buttons.length) {
        trackedPadIndex = pad.index;
        trackedButtonCount = pad.buttons.length;
        resetForPad(pad);
    }

    pad.buttons.forEach((button, index) => {
        if (button.pressed) {
            buttonCoverageState.value = buttonCoverageReducer(buttonCoverageState.value, index);
        }
    });

    const leftButton = pad.buttons[6];
    if (leftButton) {
        leftTrigger.value = triggerRangeReducer(leftTrigger.value, leftButton.value);
    }
    const rightButton = pad.buttons[7];
    if (rightButton) {
        rightTrigger.value = triggerRangeReducer(rightTrigger.value, rightButton.value);
    }

    const leftPoint = { x: axis(pad, 0), y: axis(pad, 1) };
    const rightPoint = { x: axis(pad, 2), y: axis(pad, 3) };
    leftSamples.value = clampSamples([...leftSamples.value, leftPoint]);
    rightSamples.value = clampSamples([...rightSamples.value, rightPoint]);

    if (Math.hypot(leftPoint.x, leftPoint.y) <= 0.1) {
        leftRest.value = clampRest([...leftRest.value, leftPoint]);
    }
    if (Math.hypot(rightPoint.x, rightPoint.y) <= 0.1) {
        rightRest.value = clampRest([...rightRest.value, rightPoint]);
    }
}

const leftDrift = computed(() => detectStickDrift(leftRest.value));
const rightDrift = computed(() => detectStickDrift(rightRest.value));
const leftCircularity = computed(() => circularityError(leftSamples.value));
const rightCircularity = computed(() => circularityError(rightSamples.value));
const buttonCoverageSummary = computed(() => buttonCoverage(buttonCoverageState.value));
const vibrationSupported = computed(() => !!selected.value?.vibrationActuator);

const details = computed<Record<string, string | number | boolean>>(() => ({
    connectedPads: pads.value.length,
    selectedPadIndex: selectedIndex.value ?? -1,
    standardMapped: selected.value?.mapping === 'standard',
    buttonCount: selected.value?.buttons.length ?? 0,
    buttonsTested: buttonCoverageSummary.value.testedCount,
    buttonCoverage: buttonCoverageSummary.value.ratio,
    axisCount: selected.value?.axes.length ?? 0,
    leftStickMeanOffset: leftDrift.value.meanOffset,
    leftStickMaxOffset: leftDrift.value.maxOffset,
    leftStickNoise: leftDrift.value.noise,
    leftStickDrifting: leftDrift.value.drifting,
    rightStickMeanOffset: rightDrift.value.meanOffset,
    rightStickMaxOffset: rightDrift.value.maxOffset,
    rightStickNoise: rightDrift.value.noise,
    rightStickDrifting: rightDrift.value.drifting,
    leftStickCircularityError: leftCircularity.value.error,
    leftStickCircularityCoverage: leftCircularity.value.coverage,
    rightStickCircularityError: rightCircularity.value.error,
    rightStickCircularityCoverage: rightCircularity.value.coverage,
    leftTriggerMin: leftTrigger.value.min,
    leftTriggerMax: leftTrigger.value.max,
    leftTriggerFullRange: leftTrigger.value.fullRange,
    rightTriggerMin: rightTrigger.value.min,
    rightTriggerMax: rightTrigger.value.max,
    rightTriggerFullRange: rightTrigger.value.fullRange,
    vibrationSupported: vibrationSupported.value,
    vibrationTested: vibrationTested.value,
}));

const canPass = computed(() => {
    if (!selected.value) return false;
    const coverage = buttonCoverageSummary.value;
    if (coverage.total === 0 || coverage.testedCount < coverage.total) return false;
    if (leftRest.value.length < 8 || rightRest.value.length < 8) return false;
    if (leftDrift.value.drifting || rightDrift.value.drifting) return false;
    if (leftCircularity.value.coverage < 0.9 || rightCircularity.value.coverage < 0.9) return false;
    if (leftCircularity.value.error > 0.2 || rightCircularity.value.error > 0.2) return false;
    if (!leftTrigger.value.fullRange || !rightTrigger.value.fullRange) return false;
    return true;
});

async function testVibration(): Promise<void> {
    const actuator = selected.value?.vibrationActuator;
    if (!actuator?.playEffect) return;
    try {
        await actuator.playEffect('dual-rumble', {
            duration: 150,
            startDelay: 0,
            strongMagnitude: 0.5,
            weakMagnitude: 0.5,
        });
        vibrationTested.value = true;
    } catch {
        vibrationTested.value = false;
    }
}

function onConnect(): void {
    refresh();
}

function onDisconnect(): void {
    refresh();
}

onMounted(() => {
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    rafId = requestAnimationFrame(function loop() {
        refresh();
        rafId = requestAnimationFrame(loop);
    });
});

onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    window.removeEventListener('gamepadconnected', onConnect);
    window.removeEventListener('gamepaddisconnected', onDisconnect);
});
</script>

<style scoped>
.gamepad-test {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.gamepad-test__sticks {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}
.gamepad-test__empty,
.gamepad-test__unsupported {
    padding: 1rem;
    border: 1px dashed var(--border);
    border-radius: 0.5rem;
}
@media (max-width: 720px) {
    .gamepad-test__sticks {
        grid-template-columns: 1fr;
    }
}
</style>
