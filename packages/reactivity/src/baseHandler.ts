import { isArray, isObject, isString } from '@vue/shared'
import { reactive, toRaw } from './reactive';
import { track, trigger, pauseTracking, enableTracking } from "./effect";
import { isRef } from './ref';

export const enum TrackOpTypes {
    SET = 'set',
    HAS = 'has',
    ITERATE = 'iterate',
}

export const enum TriggerOpTypes {
    SET = 'set',
    ADD = 'add',
    DELETE = 'delete',
    CLEAR = 'clear',
}

// hasOwn 是不是自己本身所拥有的属性
const hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (val, key) => {
    return hasOwnProperty.call(val, key)
};

// isIntegerKey 判断是不是数字型的字符串key值
const isIntegerKey = (key) => {
    return isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key
}

// hasChanged 判断是不是有变化
const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

const arrayInstrumentations: Record<string, Function> = {}
// 用来是不是响应式的
export const enum ReactiveFlags {
    SKIP = '__v_skip',
    IS_REACTIVE = '__v_isReactive', // 是否绑定
    IS_READONLY = '__v_isReadonly', // 是否只读
    RAW = '__v_raw'
}
const shallow = false;
export const mutableHandlers = {
    get(target, key, receiver) {
        if(key === ReactiveFlags.IS_REACTIVE) {
            return true;
        }
        // 判断是不是数组开始
        const targetIsArray = isArray(target)
        // hasOwn(arrayInstrumentations, key) 是不是自身所拥有的属性 比如 includes push ...
        if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
            return Reflect.get(arrayInstrumentations, key, receiver)
        }
        // 判断是不是数组结束
        track(target, 'get', key)
        const res = Reflect.get(target, key, receiver);
        // 如果是对象的话继续响应式处理
        if(isObject(res)) {
            return reactive(res); // 深度代理实现
        }
        return res;
    },
    set(target, key, value, receiver) {
        console.log(target, key, value, receiver);
        if(['push', 'pop', 'shift', 'unshift', 'splice'].includes(key)) {
            key = arrayInstrumentations[key](receiver, value);
        }
        const oldValue = target[key];
        // 判定开始
        if (!shallow) {
            value = toRaw(value); // 解除绑定
            if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
              oldValue.value = value
              return true
            }
        } else {
            // in shallow mode, objects are set as-is regardless of reactive or not
        }
        // // 判定结束
        const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
        let result = Reflect.set(target, key, value, receiver);
        // if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger(target, TriggerOpTypes.ADD, key, value, oldValue)
            } else if (hasChanged(value, oldValue)) {
                trigger(target, 'set', key, value, oldValue)
            }
        // }
        // if(value !== oldValue) {
        //     trigger(target, 'set', key, value, oldValue)
        // }
        return result;
    }
};

// set 
;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    const method = Array.prototype[key] as any
    arrayInstrumentations[key] = function(this: unknown[], ...args: unknown[]) {
        pauseTracking(); // 调用此方法停止依赖收集
        const res = method.apply(this, args)
        enableTracking(); // 恢复依赖收集
        return res
    }
});

// get
;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    const method = Array.prototype[key] as any
    arrayInstrumentations[key] = function(this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this)
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, 'get', i + '')
      }
      // we run the method using the original args first (which may be reactive)
      const res = method.apply(arr, args)
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return method.apply(arr, args.map(toRaw))
      } else {
        return res
      }
    }
})
