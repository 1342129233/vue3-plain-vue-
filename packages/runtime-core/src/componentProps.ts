import { reactive } from "@vue/reactivity";
import { hasOwn } from "@vue/shared";

export function initProps(instance, rowProps) {
    const props = {};
    const attrs = {};

    const options = instance.propsOptions || {};

    if(rowProps) {
        for(let key in rowProps) {
            const value = [key]
            if(hasOwn(options, key)) {
                props[key] = value
            } else {
                attrs[key] = value
            }
        }
    }
    // 这里 props 不希望组件内部被修改，但是 props 是响应式，后面属性变化要更新视图
    instance.props = reactive(props)
    instance.attrs = attrs;
};
