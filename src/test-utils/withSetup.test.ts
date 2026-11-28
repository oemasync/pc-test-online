import { describe, expect, it } from 'vitest';
import { withSetup } from '@/test-utils/withSetup';

describe('withSetup', () => {
    it('runs a composable inside a host component', () => {
        const { result, unmount } = withSetup(() => 42);
        expect(result).toBe(42);
        unmount();
    });
});
