import { describe, it, expect } from 'vitest';
import {
  parseUserAgent,
  normalizeGpuRenderer,
  normalizeGpuVendor,
  formatBytes,
  physicalPixelCount,
  reduceSystemPhase,
} from '../logic';

describe('system logic', () => {
  it('parses user agent', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const parsed = parseUserAgent(ua);
    expect(parsed.browser).toBe('Chrome');
    expect(parsed.os).toBe('Windows');
    expect(parsed.architecture).toBe('x64');
  });

  it('parses firefox on linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
    const parsed = parseUserAgent(ua);
    expect(parsed.browser).toBe('Firefox');
    expect(parsed.os).toBe('Linux');
    expect(parsed.architecture).toBe('x64');
  });

  it('normalizes ANGLE renderer string', () => {
    const raw = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)';
    expect(normalizeGpuRenderer(raw)).toBe('NVIDIA GeForce RTX 3060');
  });

  it('normalizes ANGLE vendor string', () => {
    const raw = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)';
    expect(normalizeGpuVendor(raw)).toBe('NVIDIA');
  });

  it('passes through non-ANGLE strings', () => {
    expect(normalizeGpuRenderer('Apple GPU')).toBe('Apple GPU');
  });

  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
  });

  it('computes physical pixels', () => {
    expect(physicalPixelCount(1920, 1080, 2)).toBe(1920 * 2 * 1080 * 2);
  });

  it('reduces system phase', () => {
    expect(reduceSystemPhase('idle', { type: 'start' })).toBe('collecting');
    expect(reduceSystemPhase('collecting', { type: 'success' })).toBe('ready');
    expect(reduceSystemPhase('collecting', { type: 'failure' })).toBe('error');
    expect(reduceSystemPhase('ready', { type: 'reset' })).toBe('idle');
  });
});
