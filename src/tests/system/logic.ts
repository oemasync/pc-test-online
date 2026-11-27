// Framework-free logic for the system module. No Vue, no src/core imports.

export type SystemPhase = 'idle' | 'collecting' | 'ready' | 'error';

export type SystemEvent =
    { type: 'start' } | { type: 'success' } | { type: 'failure' } | { type: 'reset' };

export interface ParsedUserAgent {
    browser: string;
    os: string;
    architecture: string;
}

export interface GpuInfo {
    vendor: string;
    renderer: string;
}

// maxTouchPoints helps distinguish iPadOS 13+ (reports a Mac UA) from macOS.
export function parseUserAgent(ua: string, maxTouchPoints: number = 0): ParsedUserAgent {
    let browser = 'unknown';
    if (/EdgiOS\//.test(ua) || /Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    else if (/CriOS\//.test(ua) || /Chrome\//.test(ua)) browser = 'Chrome';
    else if (/FxiOS\//.test(ua) || /Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';

    let os = 'unknown';
    if (/Windows NT/.test(ua)) os = 'Windows';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/CrOS/.test(ua)) os = 'ChromeOS';
    else if (/Mac OS X/.test(ua)) {
        if (maxTouchPoints > 1) os = 'iPadOS';
        else os = 'macOS';
    } else if (/Linux/.test(ua)) os = 'Linux';

    let architecture = 'unknown';
    // macOS UAs always say 'Intel Mac OS X' even on Apple Silicon; do not trust.
    if (os === 'macOS') {
        architecture = 'unknown';
    } else if (/WOW64|Win64|x86_64|amd64/i.test(ua)) {
        architecture = 'x64';
    } else if (/i386|i686|x86\b/i.test(ua)) {
        architecture = 'x86';
    } else if (/aarch64|arm64/i.test(ua)) {
        architecture = 'arm64';
    } else if (/armv7|arm/i.test(ua)) {
        architecture = 'arm';
    }

    return { browser, os, architecture };
}

// OS version from UA is unreliable (Chrome freezes 'Windows NT 10.0').
// Use userAgentData.platformVersion: >= 13 means Windows 11.
export function isWindows11(platform: string, platformVersion: string): boolean {
    if (platform !== 'Windows') return false;
    const major = Number.parseInt(platformVersion.split('.')[0] ?? '0', 10);
    return Number.isFinite(major) && major >= 13;
}

export function parseGpu(raw: string): GpuInfo {
    const trimmed = raw.trim();
    const angleMatch = trimmed.match(/^ANGLE\s*\((.*)\)$/i);
    if (!angleMatch) {
        return { vendor: 'unknown', renderer: trimmed };
    }
    const inner = angleMatch[1]!.trim();
    const parts = inner
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    const vendor = parts.length >= 1 ? parts[0]! : 'unknown';
    const rawRenderer = parts.length >= 2 ? parts[1]! : '';

    let renderer = rawRenderer;
    // Metal renderer: 'ANGLE Metal Renderer: Apple M2'
    const metalMatch = renderer.match(/Metal Renderer:\s*(.+)$/i);
    if (metalMatch) renderer = metalMatch[1]!.trim();
    // Remove parenthesized device ids like (0x00005917).
    renderer = renderer.replace(/\s*\(\s*0x[0-9a-fA-F]+\s*\)/g, '');
    // Remove trailing API / shader-model tokens.
    renderer = renderer.replace(/\s+(Direct3D.*|OpenGL.*|Vulkan.*|Metal.*)$/i, '');
    // Remove /PCIe/SSE2 style suffixes.
    renderer = renderer.replace(/\/PCIe\/SSE2/gi, '');
    renderer = renderer.replace(/\s+/g, ' ').trim();
    if (renderer.length === 0) renderer = trimmed;

    return { vendor: vendor.trim(), renderer };
}

// Base 1000 with KB/MB/GB labels.
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1000)));
    const value = bytes / Math.pow(1000, i);
    return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function physicalPixelCount(
    width: number,
    height: number,
    devicePixelRatio: number
): number {
    return Math.round(width * devicePixelRatio * height * devicePixelRatio);
}

export function reduceSystemPhase(phase: SystemPhase, event: SystemEvent): SystemPhase {
    switch (event.type) {
        case 'start':
            return 'collecting';
        case 'success':
            return 'ready';
        case 'failure':
            return 'error';
        case 'reset':
            return 'idle';
        default: {
            const _exhaustive: never = event;
            throw new Error(`unhandled system event: ${JSON.stringify(_exhaustive)}`);
        }
    }
}
