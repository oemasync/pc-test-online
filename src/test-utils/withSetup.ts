import { defineComponent, h } from 'vue';
import { mountWithPlugins } from '@/test-utils/mount';

export function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
    let result!: T;
    const Comp = defineComponent({
        setup() {
            result = composable();
            return () => h('div');
        },
    });
    const wrapper = mountWithPlugins(Comp);
    return { result, unmount: () => wrapper.unmount() };
}
