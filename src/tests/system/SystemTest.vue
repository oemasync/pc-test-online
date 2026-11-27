<template>
  <TestLayout
    test-id="system"
    :title="t('tests.system.title')"
    :details="details"
    :can-pass="true"
  >
    <div
      class="system-test"
      aria-live="polite"
    >
      <div class="system-test__actions">
        <button
          type="button"
          class="system-test__copy"
          @click="copySpecs"
        >
          {{ copied ? t('tests.system.copied') : t('tests.system.copySpecs') }}
        </button>
        <span
          v-if="copyError"
          class="system-test__copy-error"
        >{{
          t('tests.system.copyFailed')
        }}</span>
      </div>

      <section class="system-test__section">
        <h3>{{ t('tests.system.sectionCpu') }}</h3>
        <dl>
          <dt>{{ t('tests.system.coresLabel') }}</dt>
          <dd>{{ cores }}</dd>
          <dt>{{ t('tests.system.deviceMemoryLabel') }}</dt>
          <dd>{{ deviceMemoryText }}</dd>
          <dt>{{ t('tests.system.platformLabel') }}</dt>
          <dd>{{ platform }}</dd>
          <dt>{{ t('tests.system.platformVersionLabel') }}</dt>
          <dd>{{ platformVersion }}</dd>
          <dt>{{ t('tests.system.architectureLabel') }}</dt>
          <dd>{{ architecture }}</dd>
          <dt>{{ t('tests.system.bitnessLabel') }}</dt>
          <dd>{{ bitness }}</dd>
          <dt>{{ t('tests.system.modelLabel') }}</dt>
          <dd>{{ model }}</dd>
        </dl>
      </section>

      <section class="system-test__section">
        <h3>{{ t('tests.system.sectionGpu') }}</h3>
        <dl>
          <dt>{{ t('tests.system.gpuVendorLabel') }}</dt>
          <dd>{{ gpuVendor }}</dd>
          <dt>{{ t('tests.system.gpuRendererLabel') }}</dt>
          <dd>{{ gpuRenderer }}</dd>
          <dt>{{ t('tests.system.webgpuLabel') }}</dt>
          <dd>{{ webgpuInfo }}</dd>
        </dl>
      </section>

      <section class="system-test__section">
        <h3>{{ t('tests.system.sectionScreen') }}</h3>
        <dl>
          <dt>{{ t('tests.system.screenSizeLabel') }}</dt>
          <dd>{{ screenSize }}</dd>
          <dt>{{ t('tests.system.physicalPixelsLabel') }}</dt>
          <dd>{{ physicalPixels }}</dd>
          <dt>{{ t('tests.system.colorDepthLabel') }}</dt>
          <dd>{{ colorDepth }}</dd>
          <dt>{{ t('tests.system.colorGamutLabel') }}</dt>
          <dd>{{ colorGamut }}</dd>
          <dt>{{ t('tests.system.dynamicRangeLabel') }}</dt>
          <dd>{{ dynamicRange }}</dd>
        </dl>
      </section>

      <section class="system-test__section">
        <h3>{{ t('tests.system.sectionStorage') }}</h3>
        <dl>
          <dt>{{ t('tests.system.storageUsageLabel') }}</dt>
          <dd>{{ storageUsage }}</dd>
          <dt>{{ t('tests.system.storageQuotaLabel') }}</dt>
          <dd>{{ storageQuota }}</dd>
        </dl>
      </section>

      <section class="system-test__section">
        <h3>{{ t('tests.system.sectionNetwork') }}</h3>
        <dl>
          <dt>{{ t('tests.system.connectionTypeLabel') }}</dt>
          <dd>{{ connectionType }}</dd>
          <dt>{{ t('tests.system.downlinkLabel') }}</dt>
          <dd>{{ downlink }}</dd>
          <dt>{{ t('tests.system.rttLabel') }}</dt>
          <dd>{{ rtt }}</dd>
        </dl>
      </section>

      <section class="system-test__section">
        <h3>{{ t('tests.system.sectionLocale') }}</h3>
        <dl>
          <dt>{{ t('tests.system.languagesLabel') }}</dt>
          <dd>{{ languages }}</dd>
          <dt>{{ t('tests.system.timezoneLabel') }}</dt>
          <dd>{{ timezone }}</dd>
        </dl>
      </section>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import { parseUserAgent, isWindows11, parseGpu, formatBytes, physicalPixelCount } from './logic';

const { t } = useI18n();

const na = () => t('tests.system.notAvailable');

const cores = ref<number>(navigator.hardwareConcurrency ?? 0);
const deviceMemory = ref<number | null>(
    (navigator as { deviceMemory?: number }).deviceMemory ?? null
);
const platform = ref('unknown');
const platformVersion = ref('unknown');
const architecture = ref('unknown');
const bitness = ref('unknown');
const model = ref('unknown');

const gpuVendor = ref('unknown');
const gpuRenderer = ref('unknown');
const webgpuInfo = ref('unknown');

const screenWidth = ref(0);
const screenHeight = ref(0);
const dpr = ref(1);
const colorDepth = ref(0);
const colorGamut = ref('unknown');
const dynamicRange = ref('unknown');

const storageUsage = ref('0 B');
const storageQuota = ref('0 B');
const storageUsageBytes = ref(0);
const storageQuotaBytes = ref(0);

const connectionType = ref(na());
const downlink = ref(na());
const rtt = ref(na());

const languages = ref(navigator.languages?.join(', ') ?? 'unknown');
const timezone = ref('unknown');

const copied = ref(false);
const copyError = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let glContext: WebGLRenderingContext | null = null;

const deviceMemoryText = computed(() => {
    const v = deviceMemory.value;
    if (v === null) return na();
    if (v >= 8) return t('tests.system.deviceMemoryCapped');
    return `${v} GB`;
});

const screenSize = computed(() => `${screenWidth.value}x${screenHeight.value}`);
const physicalPixels = computed(() =>
    physicalPixelCount(screenWidth.value, screenHeight.value, dpr.value)
);

const details = computed(() => ({
    hardwareConcurrency: cores.value,
    deviceMemoryGb: deviceMemory.value ?? 0,
    platform: platform.value,
    platformVersion: platformVersion.value,
    architecture: architecture.value,
    bitness: bitness.value,
    model: model.value,
    gpuRenderer: gpuRenderer.value,
    gpuVendor: gpuVendor.value,
    webgpuAdapterInfo: webgpuInfo.value,
    screenWidth: screenWidth.value,
    screenHeight: screenHeight.value,
    devicePixelRatio: dpr.value,
    colorDepth: colorDepth.value,
    physicalPixels: physicalPixels.value,
    colorGamut: colorGamut.value,
    dynamicRangeHigh: dynamicRange.value === 'high',
    storageUsageBytes: storageUsageBytes.value,
    storageQuotaBytes: storageQuotaBytes.value,
    connectionEffectiveType: connectionType.value,
    connectionDownlinkMbps: downlink.value,
    connectionRttMs: rtt.value,
    connectionSaveData: false,
    languages: languages.value,
    timeZone: timezone.value,
}));

async function collect(): Promise<void> {
    // UA client hints
    const uaData = (
        navigator as unknown as {
            userAgentData?: {
                getHighEntropyValues: (keys: string[]) => Promise<Record<string, string>>;
            };
        }
    ).userAgentData;
    if (uaData?.getHighEntropyValues) {
        try {
            const v = await uaData.getHighEntropyValues([
                'platform',
                'platformVersion',
                'architecture',
                'bitness',
                'model',
                'fullVersionList',
            ]);
            platform.value = v.platform ?? platform.value;
            platformVersion.value = v.platformVersion ?? platformVersion.value;
            architecture.value = v.architecture ?? architecture.value;
            bitness.value = v.bitness ?? bitness.value;
            model.value = v.model ?? model.value;
            if (isWindows11(platform.value, platformVersion.value)) {
                platformVersion.value = 'Windows 11';
            }
        } catch {
            applyUaFallback();
        }
    } else {
        applyUaFallback();
    }

    // GPU via WebGL
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
        glContext = gl;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
            const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
            const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string;
            const parsed = parseGpu(String(renderer ?? ''));
            gpuRenderer.value = parsed.renderer;
            gpuVendor.value = vendor ? String(vendor) : parsed.vendor;
        }
    }

    // WebGPU
    const gpu = (
        navigator as unknown as {
            gpu?: {
                requestAdapter: () => Promise<{
                    info?: {
                        vendor?: string;
                        architecture?: string;
                        device?: string;
                        description?: string;
                    };
                } | null>;
            };
        }
    ).gpu;
    if (gpu?.requestAdapter) {
        try {
            const adapter = await gpu.requestAdapter();
            if (adapter?.info) {
                const i = adapter.info;
                webgpuInfo.value =
                    [i.vendor, i.architecture, i.device, i.description]
                        .filter(Boolean)
                        .join(' / ') || 'available';
            } else {
                webgpuInfo.value = 'available';
            }
        } catch {
            webgpuInfo.value = na();
        }
    } else {
        webgpuInfo.value = na();
    }

    // Screen
    screenWidth.value = window.screen?.width ?? 0;
    screenHeight.value = window.screen?.height ?? 0;
    dpr.value = window.devicePixelRatio ?? 1;
    colorDepth.value = window.screen?.colorDepth ?? 0;
    colorGamut.value =
        ['rec2020', 'p3', 'srgb'].find(g => window.matchMedia(`(color-gamut: ${g})`).matches) ??
        'srgb';
    dynamicRange.value = window.matchMedia('(dynamic-range: high)').matches ? 'high' : 'standard';

    // Storage
    if (navigator.storage?.estimate) {
        try {
            const est = await navigator.storage.estimate();
            storageUsage.value = formatBytes(est.usage ?? 0);
            storageQuota.value = formatBytes(est.quota ?? 0);
            storageUsageBytes.value = est.usage ?? 0;
            storageQuotaBytes.value = est.quota ?? 0;
        } catch {
            storageUsage.value = na();
            storageQuota.value = na();
        }
    } else {
        storageUsage.value = na();
        storageQuota.value = na();
    }

    // Connection
    const conn = (
        navigator as unknown as {
            connection?: { effectiveType?: string; downlink?: number; rtt?: number };
        }
    ).connection;
    if (conn) {
        connectionType.value = conn.effectiveType ?? na();
        downlink.value = conn.downlink != null ? `${conn.downlink} Mbps` : na();
        rtt.value = conn.rtt != null ? `${conn.rtt} ms` : na();
    }

    // Timezone
    try {
        timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        timezone.value = 'unknown';
    }
}

function applyUaFallback(): void {
    const parsed = parseUserAgent(navigator.userAgent);
    platform.value = parsed.os;
    architecture.value = parsed.architecture;
}

const specText = computed(() => JSON.stringify(details.value, null, 2));

async function copySpecs(): Promise<void> {
    copied.value = false;
    copyError.value = false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(specText.value);
            copied.value = true;
        } else {
            throw new Error('no clipboard');
        }
    } catch {
        copyError.value = true;
    }
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
        copied.value = false;
        copyError.value = false;
    }, 2000);
}

onMounted(() => {
    // fill UA fallback fields initially
    const parsed = parseUserAgent(navigator.userAgent);
    platform.value = parsed.os;
    architecture.value = parsed.architecture;
    // bitness/model unknown from UA
    void collect();
});

onUnmounted(() => {
    if (glContext) {
        const ext = glContext.getExtension('WEBGL_lose_context');
        ext?.loseContext();
        glContext = null;
    }
    if (copyTimer) clearTimeout(copyTimer);
});
</script>

<style scoped>
.system-test__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}
.system-test__section {
    margin-bottom: 1rem;
}
.system-test__section dl {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.25rem 0.75rem;
}
.system-test__section dt {
    font-weight: 600;
}
</style>
" content">>
