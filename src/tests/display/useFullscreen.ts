import { ref, type Ref } from 'vue';

export function useFullscreen(
    target: Ref<HTMLElement | null> | (() => HTMLElement | null),
) {
    const unavailable = ref(false);

    function resolveTarget(): HTMLElement | null {
        return typeof target === 'function' ? target() : target.value;
    }

    async function request(): Promise<void> {
        const element = resolveTarget();
        if (!element) {
            return;
        }

        unavailable.value = false;

        if (typeof element.requestFullscreen !== 'function') {
            unavailable.value = true;
            return;
        }

        try {
            await element.requestFullscreen();
        } catch {
            unavailable.value = true;
        }
    }

    return { unavailable, request };
}
