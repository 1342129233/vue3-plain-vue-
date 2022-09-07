import { isArray, isObject } from "@vue/shared";
import { reactive } from "./reactive";
import { trackEffect, triggerEffect } from './effect';

// 是对象的话变成 reactive
function toReactive(value) {
    return isObject(value) ? reactive(value) : value;
}

class RefImpl {
    public dep = new Set();
    public _value;
    public _v_isRef = true;
    constructor(public rawValue) {
        this._value = toReactive(rawValue)
    }

    get value() {
        triggerEffect(this.dep)
        return this._value;
    }
    set value(newValue) {
        if(newValue !== this.rawValue) {
            this._value = toReactive(newValue);
            this.rawValue = newValue;
            trackEffect(this.dep)
        }
    }
}

export function ref(value) {
    return new RefImpl(value);
}

class ObjectRefImpl { // 只是将 .value 代理到原始类型上
    constructor(public object, public key) {}

    get value() {
        return this.object[this.key]
    }
    set value(newValue) {
        this.object[this.key] = newValue;
    }
}

export function toRef(object, key) {
    return new ObjectRefImpl(object, key)
}

export function toRefs(object) {
    const result = isArray(object) ? new Array(object.length) : {};
    for(let key in object) {
        result[key] = toRef(object, key)
    }
    return result;
}

export function proxyRefs(object) {
    return new Proxy(object, {
        get(target, key, recevier) {
            let r = Reflect.get(target, key, recevier)
            return r._v_isRef ? r.value : r;
        },
        set(target, key, value, recevier) {
            let oldValue = target[key]
            if(oldValue._v_isRef) {
                oldValue.value = value;
                return oldValue;
            } else {
                return Reflect.set(target, key, value, recevier);
            }
        }
    })
}
