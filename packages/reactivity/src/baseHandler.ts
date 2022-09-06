import { isObject } from "@vue/shared";
import { reactive } from './reactive';
import { track, trigger } from "./effect";
// 用来是不是响应式的
export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive'
}

export const mutableHandlers = {
    get(target, key, receiver) {
        if(key === ReactiveFlags.IS_REACTIVE) {
            return true;
        }
        track(target, 'get', key)
        const res = Reflect.get(target, key, receiver);

        // 如果是对象的话继续响应式处理
        if(isObject(res)) {
            return reactive(res); // 深度代理实现
        }
        return res;
    },
    set(target, key, value, receiver) {
        const oldValue = target[key];
        let result = Reflect.set(target, key, value, receiver);
        if(value !== oldValue) {
            trigger(target, 'set', key, value, oldValue)
        }
        return result;
    }
}