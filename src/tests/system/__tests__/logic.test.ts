import { describe, it, expect } from 'vitest';
import {
    parseUserAgent,
    isWindows11,
    parseGpu,
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

    it('macOS architecture is unknown (Apple Silicon ambiguity)', () => {
        const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const parsed = parseUserAgent(ua);
        expect(parsed.os).toBe('macOS');
        expect(parsed.architecture).toBe('unknown');
    });

    it('iPadOS 13+ with maxTouchPoints > 1', () => {
        const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';
        const parsed = parseUserAgent(ua, 5);
        expect(parsed.os).toBe('iPadOS');
    });

    it('detects CriOS/FxiOS/EdgiOS', () => {
        expect(parseUserAgent('... CriOS/120.0 ...').browser).toBe('Chrome');
        expect(parseUserAgent('... FxiOS/120.0 ...').browser).toBe('Firefox');
        expect(parseUserAgent('... EdgiOS/120.0 ...').browser).toBe('Edge');
    });

    it('isWindows11 from platformVersion', () => {
        expect(isWindows11('Windows', '13.0.0')).toBe(true);
        expect(isWindows11('Windows', '10.0.0')).toBe(false);
        expect(isWindows11('macOS', '13.0.0')).toBe(false);
    });

    it('parses ANGLE GPU strings', () => {
        expect(
            parseGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)')
        ).toEqual({
            vendor: 'NVIDIA',
            renderer: 'NVIDIA GeForce RTX 3060',
        });
        expect(
            parseGpu(
                'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)'
            )
        ).toEqual({
            vendor: 'Intel',
            renderer: 'Intel(R) UHD Graphics 620',
        });
        expect(
            parseGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')
        ).toEqual({
            vendor: 'Apple',
            renderer: 'Apple M2',
        });
        expect(
            parseGpu(
                'ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0 NVIDIA 535.54)'
            )
        ).toEqual({
            vendor: 'NVIDIA Corporation',
            renderer: 'NVIDIA GeForce GTX 1080',
        });
    });

    it('handles ANGLE string with vendor only', () => {
        expect(parseGpu('ANGLE (NVIDIA)')).toEqual({
            vendor: 'NVIDIA',
            renderer: 'ANGLE (NVIDIA)',
        });
    });

    it('parses Opera, Android and iOS user agents', () => {
        expect(parseUserAgent('Mozilla/5.0 ... OPR/100.0').browser).toBe('Opera');
        expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) ... Chrome/120').os).toBe('Android');
        expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) ...').os).toBe('iOS');
    });

    it('isWindows11 handles missing version', () => {
        expect(isWindows11('Windows', '')).toBe(false);
    });

    it('formats single-digit bytes', () => {
        expect(formatBytes(5)).toBe('5 B');
    });

    it('parses ChromeOS user agent', () => {
        expect(parseUserAgent('Mozilla/5.0 (X11; CrOS x86_64) ...').os).toBe('ChromeOS');
    });

    it('isWindows11 handles non-numeric version', () => {
        expect(isWindows11('Windows', 'abc')).toBe(false);
    });

    it('handles empty ANGLE inner', () => {
        expect(parseGpu('ANGLE ()')).toEqual({ vendor: 'unknown', renderer: 'ANGLE ()' });
    });

    it('handles Firefox sanitized and plain GPU strings', () => {
        expect(parseGpu('NVIDIA GeForce GTX 980, or similar')).toEqual({
            vendor: 'unknown',
            renderer: 'NVIDIA GeForce GTX 980, or similar',
        });
        expect(parseGpu('Mali-G78')).toEqual({ vendor: 'unknown', renderer: 'Mali-G78' });
    });

    it('formats bytes base 1000', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1000)).toBe('1.00 KB');
        expect(formatBytes(1500)).toBe('1.50 KB');
        expect(formatBytes(1000000)).toBe('1.00 MB');
    });

    it('computes physical pixels', () => {
        expect(physicalPixelCount(1920, 1080, 2)).toBe(1920 * 2 * 1080 * 2);
    });

    it('parses x86, arm64, arm architectures', () => {
        expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; i686) ...').architecture).toBe('x86')
        expect(parseUserAgent('Mozilla/5.0 (Linux; aarch64) ...').architecture).toBe('arm64')
        expect(parseUserAgent('Mozilla/5.0 (Linux; armv7l) ...').architecture).toBe('arm')
    })

    it('reduces system phase and throws on unknown', () => {
        expect(reduceSystemPhase('idle', { type: 'start' })).toBe('collecting');
        expect(reduceSystemPhase('collecting', { type: 'success' })).toBe('ready');
        expect(reduceSystemPhase('collecting', { type: 'failure' })).toBe('error');
        expect(reduceSystemPhase('ready', { type: 'reset' })).toBe('idle');
        expect(() => reduceSystemPhase('idle', { type: 'bogus' } as never)).toThrow();
    });
});
