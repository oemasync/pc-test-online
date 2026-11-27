// Framework-free logic for the system module. No Vue, no src/core imports.

export type SystemPhase = 'idle' | 'collecting' | 'ready' | 'error';

export type SystemEvent =
  | { type: 'start' }
  | { type: 'success' }
  | { type: 'failure' }
  | { type: 'reset' };

export interface ParsedUserAgent {
  browser: string;
  os: string;
  architecture: string;
}

export function parseUserAgent(ua: string): ParsedUserAgent {
  let browser = 'unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';

  let os = 'unknown';
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let architecture = 'unknown';
  if (/WOW64|Win64|x86_64|amd64/i.test(ua)) architecture = 'x64';
  else if (/i386|i686|x86\b/i.test(ua)) architecture = 'x86';
  else if (/aarch64|arm64/i.test(ua)) architecture = 'arm64';
  else if (/armv7|arm/i.test(ua)) architecture = 'arm';

  return { browser, os, architecture };
}

// Normalize GPU strings. Strip ANGLE wrapper and trailing API/feature tokens.
export function normalizeGpuRenderer(raw: string): string {
  const trimmed = raw.trim();
  const angleMatch = trimmed.match(/^ANGLE\s*\((.*)\)$/i);
  let inner = angleMatch ? angleMatch[1]!.trim() : trimmed;
  // If comma-separated, the renderer is typically the second field.
  const parts = inner.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  let candidate = parts.length >= 2 ? parts[1]! : parts[0] ?? inner;
  // Strip trailing Direct3D / GL / Vulkan / shader-model tokens.
  candidate = candidate.replace(/\s+(Direct3D.*|OpenGL.*|Vulkan.*|Metal.*)$/i, '').trim();
  // Collapse whitespace.
  candidate = candidate.replace(/\s+/g, ' ');
  return candidate.length > 0 ? candidate : trimmed;
}

export function normalizeGpuVendor(raw: string): string {
  const trimmed = raw.trim();
  const angleMatch = trimmed.match(/^ANGLE\s*\((.*)\)$/i);
  let inner = angleMatch ? angleMatch[1]!.trim() : trimmed;
  const parts = inner.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  let candidate = parts.length >= 2 ? parts[0]! : parts[0] ?? inner;
  candidate = candidate.replace(/\s+(Direct3D.*|OpenGL.*|Vulkan.*|Metal.*)$/i, '').trim();
  candidate = candidate.replace(/\s+/g, ' ');
  return candidate.length > 0 ? candidate : trimmed;
}

export function formatBytes(bytes: number): string {
  if (bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function physicalPixelCount(width: number, height: number, devicePixelRatio: number): number {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.round(width * dpr * height * dpr);
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
      void _exhaustive;
      return phase;
    }
  }
}
