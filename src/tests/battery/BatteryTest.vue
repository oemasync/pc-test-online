<template>
  <div
    v-if="!isSupported"
    class="battery-test"
  >
    <TestLayout
      test-id="battery"
      :title="t('tests.battery.title')"
      :details="details"
      :can-pass="false"
    >
      <div class="battery-test__unsupported">
        <p>{{ t('tests.battery.unsupportedTitle') }}</p>
        <p>{{ t('tests.battery.unsupportedMessage') }}</p>
      </div>
    </TestLayout>
  </div>

  <TestLayout
    v-else
    test-id="battery"
    :title="t('tests.battery.title')"
    :details="details"
    :can-pass="hasReading"
  >
    <div class="battery-test">
      <div class="battery-test__status">
        <StatTile
          :label="t('tests.battery.levelLabel')"
          :value="`${levelPercent}%`"
        />
        <StatTile
          :label="t('tests.battery.statusLabel')"
          :value="charging ? t('tests.battery.charging') : t('tests.battery.notCharging')"
        />
        <StatTile
          :label="t('tests.battery.chargingTimeLabel')"
          :value="chargingTimeText"
        />
        <StatTile
          :label="t('tests.battery.dischargingTimeLabel')"
          :value="dischargingTimeText"
        />
        <StatTile
          :label="t('tests.battery.rateLabel')"
          :value="rateText"
        />
        <StatTile
          :label="t('tests.battery.etaLabel')"
          :value="etaText"
        />
      </div>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import StatTile from '@/ui/StatTile.vue';
import {
    computeRatePerSecond,
    estimateEtaSeconds,
    durationParts,
    toNullableSeconds,
    levelToPercent,
    pruneSamples,
    type BatteryReading,
    type BatterySample,
} from './logic';

const { t } = useI18n();

const isSupported = 'getBattery' in navigator;

interface BatteryManagerLike {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    addEventListener: (type: string, cb: () => void) => void;
    removeEventListener: (type: string, cb: () => void) => void;
}

const battery = ref<BatteryManagerLike | null>(null);
const level = ref(0);
const charging = ref(false);
const chargingTime = ref<number | null>(null);
const dischargingTime = ref<number | null>(null);
const samples = ref<BatterySample[]>([]);
const hasReading = ref(false);

const WINDOW_MS = 120000;
const levelPercent = computed(() => levelToPercent(level.value));

const reading = computed<BatteryReading>(() => ({
    level: level.value,
    charging: charging.value,
    chargingTime: chargingTime.value,
    dischargingTime: dischargingTime.value,
}));

const rate = computed(() => {
    const now = samples.value.length
        ? samples.value[samples.value.length - 1]!.timestamp
        : Date.now();
    const windowed = pruneSamples(samples.value, now, WINDOW_MS);
    return computeRatePerSecond(windowed);
});

const eta = computed(() => estimateEtaSeconds(reading.value, rate.value));

const chargingTimeText = computed(() => {
    const p = durationParts(chargingTime.value);
    return p
        ? `${p.hours}${t('tests.battery.hoursAbbr')} ${p.minutes}${t('tests.battery.minutesAbbr')} ${p.seconds}${t('tests.battery.secondsAbbr')}`
        : t('tests.battery.unknown');
});
const dischargingTimeText = computed(() => {
    const p = durationParts(dischargingTime.value);
    return p
        ? `${p.hours}${t('tests.battery.hoursAbbr')} ${p.minutes}${t('tests.battery.minutesAbbr')} ${p.seconds}${t('tests.battery.secondsAbbr')}`
        : t('tests.battery.unknown');
});
const rateText = computed(() =>
    rate.value === null ? t('tests.battery.measuring') : rate.value.toFixed(6)
);
const etaText = computed(() => {
    const p = durationParts(eta.value);
    return p
        ? `${p.hours}${t('tests.battery.hoursAbbr')} ${p.minutes}${t('tests.battery.minutesAbbr')} ${p.seconds}${t('tests.battery.secondsAbbr')}`
        : t('tests.battery.measuring');
});

const details = computed(() => ({
    supported: isSupported,
    levelPercent: levelPercent.value,
    charging: charging.value,
    chargingTimeSeconds: chargingTime.value ?? Infinity,
    dischargingTimeSeconds: dischargingTime.value ?? Infinity,
    ratePerSecond: rate.value ?? 0,
    etaSeconds: eta.value ?? -1,
    sampleCount: samples.value.length,
}));

function syncFromBattery(b: BatteryManagerLike): void {
    level.value = b.level;
    charging.value = b.charging;
    chargingTime.value = toNullableSeconds(b.chargingTime);
    dischargingTime.value = toNullableSeconds(b.dischargingTime);
    samples.value = [...samples.value, { level: b.level, timestamp: Date.now() }];
    hasReading.value = true;
}

let onChange: (() => void) | null = null;

onMounted(async () => {
    if (!isSupported) return;
    try {
        const b = (await (
            navigator as unknown as { getBattery: () => Promise<BatteryManagerLike> }
        ).getBattery()) as BatteryManagerLike;
        battery.value = b;
        syncFromBattery(b);
        onChange = () => syncFromBattery(b);
        b.addEventListener('levelchange', onChange);
        b.addEventListener('chargingchange', onChange);
        b.addEventListener('chargingtimechange', onChange);
        b.addEventListener('dischargingtimechange', onChange);
    } catch {
        hasReading.value = false;
    }
});

onUnmounted(() => {
    if (battery.value && onChange) {
        battery.value.removeEventListener('levelchange', onChange);
        battery.value.removeEventListener('chargingchange', onChange);
        battery.value.removeEventListener('chargingtimechange', onChange);
        battery.value.removeEventListener('dischargingtimechange', onChange);
    }
    battery.value = null;
});
</script>

<style scoped>
.battery-test__status {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
}
.battery-test__unsupported {
    padding: 1rem;
    text-align: center;
}
</style>
