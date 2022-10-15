import { reactive } from "@vue/reactivity";
import { hasOwn } from "@vue/shared";

export function initProps(instance, rawProps) {
    const props = {};
    const attrs = {};

    const options = instance.propsOptions || {};

    if(rawProps) {
        for(let key in rawProps) {
            const value = rawProps[key]
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

const hasPropsChanged = (prevProps = {}, nextProps = {}) => {
    const nextKeys = Object.keys(nextProps);
    const prevKeys = Object.keys(prevProps);

    // 比对属性个数是否一致
    if(nextKeys.length !== prevKeys.length) {
        return true
    }

    // 比对属性对应的值是否一致
    for(let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if(nextProps[key] !== prevProps[key]) {
            return true;
        }
    }

    return false;
}

export function updateProps(instance, prevProps, nextProps) {
    // 1. 看一下属性有没有变化
    // 2. 值的变化
    // 3. 属性的个数是否发生变化

    // 值和属性的个数是不是发生变化
    if(hasPropsChanged(prevProps, nextProps)) {
        for(const key in nextProps) {
            instance.props[key] = nextProps[key];
        }

        // 删除新的不存在的属性
        for(const key in instance.props) {
            if(!hasOwn(nextProps, key)) {
                delete instance.props[key];
            }
        }
    }
}
