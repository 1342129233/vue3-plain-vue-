import { isObject } from "@vue/shared"
import { mutableHandlers, ReactiveFlags } from './baseHandler';


const reactiveMap = new WeakMap(); // key 只能是对象

/**
 * 1. 实现同一个对象,代理多次, 返回用一个代理
 * 2. 代理对象被再次代理 可以直接返回
 * @param target 
 * @returns 
 */

export function isReactive(value) {
    return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

// 将数据转化成响应式
export function reactive(target) {

    if(!isObject(target)) {
        return
    }
    
    if(target[ReactiveFlags.IS_REACTIVE]) {
        return target;
    }

    let exisitingProxy = reactiveMap.get(target);
    
    if(exisitingProxy) {
        return exisitingProxy;
    }

    const proxy = new Proxy(target, mutableHandlers)
    reactiveMap.set(target, proxy);
    return proxy
}


// 解除依赖
export function toRaw<T>(observed: T): T {
    return (
      (observed && toRaw((observed)[ReactiveFlags.RAW])) || observed
    )
}



