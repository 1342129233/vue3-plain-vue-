import { isArray } from '@vue/shared'
export let activeEffect;


function cleanupEffect(effect) {
    const { deps } = effect; // deps 里面装的是 key 对应的 effect
    for (let i = 0; i < deps.length; i++) {
        deps[i].delete(effect); // 解除依赖收集,重新依赖收集
    }
    effect.deps.length = 0;
}

export class ReactiveEffect {
    public parent = null;
    public deps = [];
    public active = true;
    constructor(public fn, public scheduler?) {}
    run() {
        if(!this.active) {
            this.fn();
        }

        try {
            this.parent = activeEffect;
            activeEffect = this;
            // 这里我们需要在执行用户函数之前收集的内容清空
            cleanupEffect(this)
            return this.fn(); // 当稍后调用去值操作的时候就可以获取到这个全局的 activeEffect 了
        } finally {
            resetTracking();// 数组处理
            activeEffect = this.parent;
        }
    }
    stop() {
        if(this.active) {
            this.active = false;
            cleanupEffect(this); // 清空 effect 收集
        }
    }
}

export function effect(fn, options:any = {}) {

    const _effect = new ReactiveEffect(fn, options.scheduler);
    _effect.run();

    const runner = _effect.run.bind(_effect); // 绑定 this 执行

    runner.effect = _effect; // 将 effect 挂载到 runner 函数上

    return runner;
}


const targetMap = new WeakMap();
export function track(target, get, key) {
    key = String(key);
    if(!activeEffect) return;
    let depsMap = targetMap.get(target);
    if(!depsMap) {
        targetMap.set(target, depsMap = new Map());
    }
    
    let dep = depsMap.get(key);
    if(!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    trackEffect(dep)
}

export function trackEffect(dep) {
    if(activeEffect) {
        const shouIdTrack = !dep.has(activeEffect)
        if(shouIdTrack) {
            dep.add(activeEffect);
            activeEffect.deps.push(dep);
        }
    }
}

export function trigger(target, set, key, value, oldValue) {
    const depsMap = targetMap.get(target);
    if(!depsMap) return;
    // 数组的 key 是数字需要转一下
    // let effects = isArray(target) ? depsMap.get(String(key)) : depsMap.get(key); // 找到对应的 effect 
    let effects = depsMap.get(key);

    // 永远在执行之前拷贝一份来执行, 不要关联引用
    if(effects) {
        triggerEffect(effects)
    }
}

export function triggerEffect(effects) {
    effects = new Set(effects);
    
    effects && effects.forEach(effect => {
        if(effect !== activeEffect) {
            if( effect.scheduler) {
                effect.scheduler(); // 如果用户传入调度函数用用户自己的
            }else {
                effect.run();
            }
        }
    });
}

// 数组
let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}

export function enableTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = true
}

export function resetTracking() {
    const last = trackStack.pop()
    shouldTrack = last === undefined ? true : last
}
