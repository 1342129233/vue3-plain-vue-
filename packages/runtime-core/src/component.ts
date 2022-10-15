import { reactive, ReactiveEffect } from "@vue/reactivity";
import { initProps } from "./componentProps";
import { isArray, isString, ShapeFlags, isNumber, hasOwn, isFunction } from "@vue/shared";

// 1. 要创造一个组件的实例
export function createComponentInstance(vnode) {
    const instance = {
        // 组件的实例
        data: null,
        vnode, // vue2的源码中组件的虚拟节点叫$vnode  渲染的内容叫_vnode
        subTree: null, // vnode组件的虚拟节点   subTree渲染的组件内容
        isMounted: false,
        update: null,
        propsOptions: vnode.type.props,
        props: {},
        attrs: {},
        proxy: null,
        render: null,
        setupState: {}, // 这里就是 setup函数返回的对象
        slots: {} // 这里就是插槽相关内容
    }
    return instance
}

// 公共的属性映射表
const publicPropertyMap = {
    $attrs: (i) => i.attrs
}

const publicInstanceProxy = {
    get(target, key) {
        const { data, props, setupState } = target
        if (data && hasOwn(data, key)) {
            return data[key]
        } else if (hasOwn(setupState, key)) {
            return setupState[key]
        } else if (props && hasOwn(props, key)) {
            return props[key]
        }
        // this.$attrs
        let getter = publicPropertyMap[key] //this.$attrs
        if (getter) {
            return getter(target)
        }
    },
    set(target, key, value) {
        const { data, props, setupState } = target
        if (data && hasOwn(data, key)) {
          data[key] = value
          // 用户操作的属性是代理对象，这里面被屏蔽了
          // 但是我们可以通过instance.props 拿到真实的props
        } else if (hasOwn(setupState, key)) {
          setupState[key] = value
        } else if (props && hasOwn(props, key)) {
          console.warn('attempting to mutate prop ' + (key as string))
          return false
        }
        return true
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
