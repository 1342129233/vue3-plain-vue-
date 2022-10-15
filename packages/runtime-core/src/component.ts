import { reactive, ReactiveEffect } from "@vue/reactivity";
import { initProps } from "./componentProps";
import { isArray, isString, ShapeFlags, isNumber, hasOwn, isFunction } from "@vue/shared";

// 1. 要创造一个组件的实例
export function createComponentInstance(vnode) {
    const instance = { // 组件的实例
        state: null, // 状态
        vnode, // 虚拟节点
        subTree: null, // vnodez组件的虚拟节点, 渲染的组件内容
        isMounted: false,
        props: {},
        propsOptions: vnode.type.props,
        attrs: {},
        proxy: null, // 代理对象
        slots: null,
        update: null
    }

    return instance;
}

// 公共的属性映射表
const publicPropertyMap = {
    $attrs: (i) => i.attrs
}

const publicInstanceProxy = {
    get(target, key) {
        const { data, props } = target;
        if(data && hasOwn(data, key)) {
            return data[key];
        } else if(props && hasOwn(props, key)) {
            return props[key];
        }
        const getter = publicPropertyMap[key]; // this.$attrs
        if(getter) {
            return getter(target);
        }
    },
    set(target, key, value) {
        const { data, props } = target;
        if(data && hasOwn(data, key)) {
            data[key] = value;
            return true;

            // 用户操作的属性是代理对象,这里面被屏蔽了
            // 但是我们可以通过 instance.props 拿到真实的 props
        } else if(props && hasOwn(props, key)) {
            console.log('attempting to mutate prop' + (key as string))
            return false;
        }
        return true;
    }
}

// 2. 给实例上赋值
export function setupComponent(instance) {
    let { props, type } = instance.vnode

    initProps(instance, props)
    instance.proxy = new Proxy(instance, publicInstanceProxy)

    let data = type.data

    if(data) {
        if(!isFunction(data)) return console.warn('data option must be a function');
        instance.data = reactive(data.call(instance.proxy))
    }

    instance.render = type.render
}
