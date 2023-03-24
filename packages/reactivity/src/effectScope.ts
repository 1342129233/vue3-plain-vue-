import { ReactiveEffect } from './effect';

// EffectScope 实例,可以存储 EffectScope 实例
// EffectScope 实例 可以存储 EffectScope实例.run()内部运行的 ReactiveEffect 实例;

// `父EffectScope实例` -> `父EffectScope实例.run()内部运行的ReactiveEffect实例` 和 `子EffectScope实例` -> `子EffectScope实例.run()内部运行的ReactiveEffect实例`;
// `父EffectScope实例`.stop() -> `父ReactiveEffect实例`.stop() 和 `子EffectScope实例`.stop() -> `子ReactiveEffect实例`.stop();
// 父 effectScope.stop() 停止自己家的 effect 执行子 effectScope.stop() 同时停止自己的 effect;

// 以前 vue3.2 之前可以自己收集 子集做stop;// 即用一个数组把effect收集起来,遍历做effect的stop()或run();

export let activeEffectScope = null; //`当前 EffectScope 实例`;

// EffectScope 类
class EffectScope {
    active = true; // EffectScope 实例是否处于激活状态;
    parent = null; // EffectScope 实例的父实例;
    effects = []; // EffectScope 实例记录的 effect;
    scopes = []; // effectScope 还有可能要收集子集的 effectScope;
    constructor(detached) {
        // 只有不独立的才要收集
        if(!detached && activeEffectScope){
            activeEffectScope.scopes.push(this)
        }
    }

    run(fn) {
        if(this.active) {
            try {
                this.parent = activeEffectScope
                activeEffectScope = this;
                return fn()
            } finally {
                activeEffectScope = this.parent
            }
        }
    }
    stop() {
        if (this.active) {
            for (let i = 0; i < this.effects.length; i++) {
              this.effects[i].stop()
            }
      
            for (let i = 0; i < this.scopes.length; i++) {
              this.scopes[i].stop()
            }
      
            this.active = false
        }
    }
}

// 记录`当前 ReactiveEffect 实例`到`当前 EffectScope 实例`里;
export function recordEffectScope(effect: ReactiveEffect) {
    if (activeEffectScope && activeEffectScope.active) {
        activeEffectScope.effects.push(effect)
    }
}

// 返回一个 EffectScope0 实例,用于收集该实例的 run() 方法里执行过的 effect;
export function effectScope(detached: boolean = false) {
    return new EffectScope(detached)
}
