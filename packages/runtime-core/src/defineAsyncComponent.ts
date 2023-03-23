import { ref } from "@vue/reactivity"
import { h } from "./h"
import { Fragment } from "./vnode"

type AsyncComponentOption = {
    loader: Function;//异步组件;
  
    timeout?: number;//超时,这个时间没加载好,就显示超时组件;
    errorComponent?: object;//超时组件;
  
    delay?: number;//延时,这个时间还没加载好,就loading;
    loadingComponent?: object;//loading组件;
  
    onError?: (err: object, retry: Function, fail: Function) => void;//错误处理;
}

export function defineAsyncComponent(options: AsyncComponentOption) {
    if(typeof options === 'function') {
        options = { loader: options }
    }
    return {
        setup() {
            const loaded = ref(false);
            const error = ref(false);
            const loading = ref(false);
            const { loader, timeout, errorComponent, delay, loadingComponent, onError } = options;

            if(delay) {
                setTimeout(() => {
                    loading.value = true; // 应该显示loading
                }, delay)
            }

            let Comp = null;

            function load() {
                return loader().catch(err => {
                    if(onError) {
                        // 这里实现了一个 Promise 链的递归
                        return new Promise((resolve, reject) => {
                            const retry = () => resolve(load())
                            const fail = () => reject(err)
                            onError(err, retry, fail)
                        })
                    }
                })
            }

            load().then(component => {
                Comp = component;
                loaded.value = true;
            }).catch(err => error.value = err).finally(() => {
                loaded.value = false;
            })

            setTimeout(() => {
                error.value = true
            }, timeout);

            return () => {
                if(loaded.value) {
                    return h(Comp); // 正确组件的渲染
                } else if(error.value && errorComponent) {
                    return h(errorComponent) // 错误组件渲染;
                } else if (loading.value && loadingComponent) {
                    return h(loadingComponent) // loading组件渲染;
                }
                return  h(Fragment, [])//无意义渲染;
            }
        }
    }
}

