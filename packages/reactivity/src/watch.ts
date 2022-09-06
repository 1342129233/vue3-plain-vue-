import { isFunction, isObject } from '@vue/shared';
import { ReactiveEffect } from './effect';
import { isReactive } from './reactive';

// value 考虑循环引用的问题
function traversal(value, set = new Set()) {
    // 递归要有终结条件,不是对象就不在递归
    if(!isObject(value)) return value;
    if(set.has(value)) {
        return value;
    }
    set.add(value);
    // 循环便利
    for(let key in value) {
        traversal(value[key], set);
    }
    return value;
}

// source 是用户传入的对象
// cb 是用户的回调
export function watch(source, cb) {
    let getter;
    if(isReactive(source)) {
        // 对用户传入的数据进行循环(递归循环)
        // 递归循环就会访问对象上的每一个属性，访问属性的时候收集 effect
        getter = () => traversal(source)
    } else if(isFunction(source)){
        getter = source;
    } else {
        return; // 可以写入报错信息 
    }

    let cleanup
    const onCleanup = (fn) => {
        cleanup = fn; // 好存用户的函数
    }

    let oldValue;
    const job = () => {
        if(cleanup) {
            cleanup(); // 下一次 watch 的触发上一次的 watch 清理
        }
        const newValue = effect.run();
        cb(newValue, oldValue, onCleanup)
        oldValue = newValue;
    }
    // 在 effect 中访问属性就会依赖收集
    const effect = new ReactiveEffect(getter, job); // 监控自己的构造函数,变化后重新执行job
    oldValue = effect.run();
}