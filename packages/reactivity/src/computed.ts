import { isFunction } from '@vue/shared';
import { ReactiveEffect, trackEffect, triggerEffect } from './effect';

class ComputedRefImpl {
    public effect;
    public _dirty = true; // 默认应该取值的时候计算, 脏值
    public __v_isReadonly = true;
    public __v_isRef = true
    public _value;
    public dep = new Set();
    constructor(getter, public setter) {
        // 将用户的 getter 放到 effect 中
        // 里面的 firstName 和 lastName 就会被这个 effect 收集起来
        this.effect = new ReactiveEffect(getter, () => {
            // getter 依赖的属性变化会依赖此调度函数
            if(!this._dirty) {
                this._dirty = true;
                // 实现一个触发更新
                triggerEffect(this.dep)
            }
        })
    }

    // 类中的属性访问器, 底层就是 Object.defineProperty
    get value() {
        // 做依赖收集
        trackEffect(this.dep)
        if(this._dirty) { // 说明这个值是脏值
            this._dirty = false;
            this._value = this.effect.run();
        }
        return this._value;
    }
    set value(newValue) {
        this.setter(newValue)
    }
}

export const computed = (getterOrOptions) => {
    let onlyGetter = isFunction(getterOrOptions);
    let getter, setter;
    if(onlyGetter) { // 是函数
        getter = getterOrOptions;
        setter = () => {console.warn('no set')}
    } else { // 是对象
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }

    return new ComputedRefImpl(getter, setter)
}