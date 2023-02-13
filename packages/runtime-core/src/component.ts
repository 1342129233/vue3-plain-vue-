import { reactive, proxyRefs } from "@vue/reactivity";
import { initProps } from "./componentProps";
import { ShapeFlags, hasOwn, isFunction, isObject } from "@vue/shared";

export let currentInstance = null
export const setCurrentInstance = (instance) => (currentInstance = instance)
export const getCurrentInstance = () => currentInstance

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
    $attrs: (i) => i.attrs,
    $slots: (i) => i.slots
}

const publicInstanceProxy = {
    get(target, key) {
        const { data, props, setupState } = target;
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
// slots
function initSlots(instance, children) {
    if(instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        instance.slots = children // 保留children
    }
}

// 2. 给实例上赋值
export function setupComponent(instance) {
    let { props, type, children } = instance.vnode

    initProps(instance, props)
    initSlots(instance, children) // 初始化插槽
    instance.proxy = new Proxy(instance, publicInstanceProxy)
    let data = type.data
    if(data) {
        if(!isFunction(data)) return console.warn('data option must be a function');
        instance.data = reactive(data.call(instance.proxy))
    }
    let setup = type.setup;
    if(setup) {
        // setup
        const setupContext = {
            emit: (event, ...args) => {
                const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
                // 找到虚拟节点的属性有存放 props 
                const handler = instance.vnode.props(eventName);
                handler && handler(...args)
            },
            slots: instance.slots
        };
        setCurrentInstance(instance)
        const setupResult = setup(instance.props, setupContext);
        setCurrentInstance(null)
        if(isFunction(setupResult)) {
            instance.render = setupResult
        } else if(isObject(setupResult)) {
            // 对内部的 ref 进行取消 .value
            instance.setupState = proxyRefs(setupResult)
        }
    }
    if(!instance.render) {
        instance.render = type.render
    }
}
