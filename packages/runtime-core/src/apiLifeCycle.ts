import { currentInstance, setCurrentInstance } from './component'

// 定义一些生命周期相关的枚举
export enum LifecycleHooks {
    BEFORE_MOUNT = 'bm', // 挂载前
    MOUNTED = 'm', // 挂载后
    BEFORE_UPDATE = 'bu', // 更新前
    UPDATED = 'u' // 更新后
}

function createHook(type) {
    // 返回出去的函数是一个闭包
    // 闭包里的必定有当时的变量 target,而变量 target 则指向函数创建时的 currentInstance 变量,而 currentInstance 变量则指向一个 vue 组件实例的引用地址;
    // 故而 target 一直指向 createHook() 被调用时 vue 组件实例;
    // 虽然 currentInstance 一直在变 null 或另一个组件,但 target 则只是 currentInstance 在返回出去的 HookFunction 第一次被调用时所引用的`当前执行 vue 组件实例`;
    return (hook, target = currentInstance) => {
        // hook 需要绑定到对应的实例上。我们之前写的依赖收集
        // 之前写的依赖收集,仿它的逻辑,把当前实例放到全局环境上;
        // 要确保是在vue组件实例的setup()中才执行;
        if(target) {
            // 关联此 currentInstance 和 hook
            // currentInstance['bm'] = [fn, fn]
            const hooks = target[type] || (target[type] = [])
            // hooks.push(hook) // 稍后执行 hook 的时候,这个 instance 指代的是谁呢?// 即 hook 中通过 getCurrentInstance() 得到的当前实例的 instance 指代是谁?
            // 用于在调用钩子函数前,把`当前执行 vue 组件实例`设置为 hook 被创建时的 vue 组件实例;
            const wrappedHook = () => {
                setCurrentInstance(target);
                hook(); // 将当前实例保存到 currentInstance 上
                setCurrentInstance(null)
            }
            hooks.push(wrappedHook) // 稍后执行 hook 的时候, 这个 instance 指带的是谁呢?
        }
    }
}

// 工厂模式
// 生命周期钩子-onBeforeMount-组件实例挂载前;
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)

// 生命周期钩子-onMounted-组件实例挂载后;
export const onMounted = createHook(LifecycleHooks.MOUNTED)

// 生命周期钩子-onBeforeUpdate-组件实例更新前;
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)

// 生命周期钩子-onUpdated-组件实例更新后;
export const onUpdated = createHook(LifecycleHooks.UPDATED)

// JavaScript是单线程的,所以h()必定是依次执行的,故而h()中的setup()也是依次单向执行的;
// 故而不会让组件A中的setup()执行过程中还执行组件B的h()中的setup();
