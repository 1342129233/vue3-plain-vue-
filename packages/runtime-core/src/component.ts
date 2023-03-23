import { reactive, proxyRefs } from "@vue/reactivity";
import { initProps } from "./componentProps";
import { ShapeFlags, hasOwn, isFunction, isObject } from "@vue/shared";
// import { RenderVNode, VueInstance } from "./renderer";

export let currentInstance = null
export const setCurrentInstance = (instance) => (currentInstance = instance)
export const getCurrentInstance = () => currentInstance

// 1. 要创造一个组件的实例
export function createComponentInstance(vnode, parent) {
    const instance = {
        // 组件的实例
        ctx: {},
        provides: parent ? parent.provides : Object.create(null), // 所有的组件用的都是父亲的p rovides
        parent,
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
        next: null,
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
        // 取值顺序由下方的if()顺序来;
        if (data && hasOwn(data, key)) {
            // 取data()上的值的流程;
            return data[key]
        } else if (hasOwn(setupState, key)) {
            // 取setup()返回出来对象的值的流程;
            return setupState[key]
        } else if (props && hasOwn(props, key)) {
            // 取props上的值的流程;
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
        instance.slots = children // 保留children,当成插槽的render()函数用来生成虚拟节点;
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
        if(!isFunction(data)) {
            return console.warn('vue3中组件的data只能是函数,不能再像vue2中可以是对象了');
        }
        // instance 实例的上 data 就是一个新增的响应式数据,它会收集 instance.render() 中依赖的 effect;
        instance.data = reactive(data.call(instance.proxy))
    }

    // setup 选项
    let setup = type.setup;
    if(setup) {
        // setup 上下文
        const setupContext = {
            // 事件的实现原理
            // 典型的发布订阅模式
            // 父组件上用 `@事件名` 来将订阅放到 instance.vnode.props;子组件内部则用 emit() 将事件名对应的事件发布;
            // 组件实例上的虚拟节点的 props 属性即 instance.vnode.props, 则是一个中转;
            emit: (event, ...args) => {
                // vue里面,@绑定的事件,会变成`onX`,即`前面加on,同时事件名首字母大写`;
                // 把用户通过emit()传入的事件名处理成真正的props名;
                const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
                // 找到虚拟节点的属性有存放 props, 找到虚拟节点的属性在存放props,取出在h()函数中绑定的事件;
                const handler = instance.vnode.props(eventName);
                handler && handler(...args)
            },
            attrs: instance.attrs,
            slots: instance.slots
        };
        setCurrentInstance(instance)
        // 调用 setup() 时必定知道当前实例是谁
        // 而钩子函数需要用到当前实例
        const setupResult = setup(instance.props, setupContext);
        setCurrentInstance(null)

        if(isFunction(setupResult)) {
            instance.render = setupResult
        } else if(isObject(setupResult)) {
            // 对内部的 ref 进行取消 .value
            instance.setupState = proxyRefs(setupResult)
        }
    }

    // 依旧没新建 render, 便直接取实例虚拟节点上的 render()
    if(!instance.render) {
        instance.render = type.render
    }
}

export function renderComponent(instance) {
    const { vnode, render, props } = instance;
    if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        return render.call(instance.proxy, instance.proxy); // 得到一个虚拟节点;//作为this,后续this会改;
    } else {
        return vnode.type(props);
    }
}
