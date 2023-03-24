
import { watch } from "@vue/reactivity";
import { ShapeFlags } from "@vue/shared";
import { getCurrentInstance } from "../component"; // 获取`当前执行vue组件实例`;
import { onMounted, onUpdated } from "../apiLifeCycle";
import { isVnode } from "../vnode"


// 清除KeepAlive的标识;
function resetShapeFlag(vnode) {
    let shapeFlag = vnode.shapeFlag;
    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
    }
    if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
    }
    vnode.shapeFlag = shapeFlag
}


export const KeepAliveImpl = {
    __isKeepAlive: true,
    props: {
        includes: {}, // 要缓存的有哪些; //写法有: 字符串 'a,b,c'; 数组: ['a','b','c']; 正则: reg;//目前主要只考虑字符串格式的,其它格式暂时不思考;
        exclude: {}, // 那些不要缓存; //写法有: 字符串 'a,b,c'; 数组: ['a','b','c']; 正则: reg;//目前主要只考虑字符串格式的,其它格式暂时不思考;
        max: {} // 最大缓存;
    },
    setup(props, { slots }) {
        const keys = new Set(); // 缓存的 key
        const cache = new Map(); // 那个key 对应的哪个虚拟节点;

        const instance = getCurrentInstance(); // 获取到当前 KeepAlive 组件实例
        const { createElement, move } = instance.ctx.render;

        const storageContainer = createElement('div'); // 稍后要把渲染好的组件移入进行; (这个是隐藏的容器,用来隐藏要隐藏的 dom)

        // 放到隐藏容器
        instance.ctx.deactivate = function(vnode) {
            // KeepAlive 下组件失活时执行的 move 逻辑
            move(vnode, storageContainer); // 移入到隐藏容器中
            // 调用 deactivate() 钩子;//应该调用当前 vnode 的 deactivate() 生命周期,让 deactivate() 里的定义的方法执行;
        }
        // 激活
        instance.ctx.activate = function(vnode, container, anchor) {
            // KeepAlive 下组件激活时执行的 move 逻辑
            move(vnode, container, anchor)//移回到容器中;

            // 调用activate()钩子;//应该调用当前vnode的activate()生命周期,让activate()里的定义的方法执行;
        }

        let pendingCacheKey = null;
        // 要怎么操作dom元素;

        function cacheSubTree() {
            if(pendingCacheKey) {
                cache.set(pendingCacheKey, instance.subTree); // 挂载完毕后缓存当前实例对应的 subTree
                // 这个是组件在onMounted()中挂载到页面时的虚拟节点;
                // 可以认为是组件中的render()最近一次运行用h()函数生成的 vnode 在经过 onBeforeMount 等生命周期后的 vnode 实例,也是页面中真实渲染的 vnode;
                // console.log('instance.subTree--->', instance.subTree)

                /* setTimeout(() => {
                    console.log('cache--->', cache)
                }, 3000); */
            }
        }

        onMounted(cacheSubTree); // 实际上 KeepAlive 只会走一次 onMounted,之后 KeepAlive 的插槽变化了,走的是 onUpdated;
        onUpdated(cacheSubTree);

        const { include, exclude, max } = props; // watch include 与 exclude 的关系;
        /* //还应该监听一下include与 exclude;
            watch(() => [props.include, props.exclude],
            ([include, exclude]) => {
                //处理监听;
            }
        ) */

        let current = null;
        function pruneCacheEntry(key) {
            resetShapeFlag(current);
            cache.delete(key);
            keys.delete(key)
        }

        // 本身keep-alive无意义;
        return () => { // keep-alive 本身没有功能,渲染的是插槽;
            // keep-alive 默认会去取 slots 的 default 属性返回的虚拟节点的第一个;
            const vnode = slots.default(); // 原则上这里应该是取的第一个,但为了方便,传入时一般只传入一个,并且不用数组包起来;
            // console.log('vnode--->', vnode) // 这个是组件返回的插槽,类型是一个用h()函数生成vnode,里面的数据基本上都是原始的;

            // 看一下vnode是不是组件,只有组件才能缓存;
            // 必须是虚拟节点而且是带状态的组件;
            // 也就是说如果不是虚拟节点或者该虚拟节点的类型是函数式组件而不是状态组件(即类组件)就直接返回,而不做缓存;
            if (!isVnode(vnode) || !(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT)) {
                return vnode
            }

            const comp = vnode.type; // 代码到这,一般表示这个就是个组件;
            const key = (vnode.key === null || vnode.key === undefined) ? comp : vnode.key

            const name = comp.name; // 组件的名字,可以根据组件的名字来决定是否需要缓存;
            // 没有命中情况
            if (name && (include && !include.split(',').includes(name)) || (exclude && exclude.split(',').includes(name))) {
                // 直接渲染子组件
                return vnode
            }
        
            const cacheVnode = cache.get(key); // 看有没有缓存过;
            
            // 命中缓存
            if (cacheVnode) {
                // 继承组件实例
                vnode.component = cacheVnode.component; // 告诉复用缓存的component;
                // 在 vnode 上更新 shapeFlag，标记为 COMPONENT_KEPT_ALIVE 属性，防止渲染器重新挂载
                vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE; // 表示初始化的时候,不要走创建了;
        
                keys.delete(key); // 把之前的缓存删掉,重新添加,以便让当前组件为最新最近使用的;
                keys.add(key)
            } else {
                // 没有命中去缓存
                keys.add(key) // 缓存key;
                pendingCacheKey = key
                //cache.set(key, vnode) //这个缓存的是整个插槽的所有状态,但理论上只应缓存其中的某个状态;

                if (max && keys.size > max) {
                    // 迭代器 {next()=>{value:done}}
                    pruneCacheEntry(keys.values().next().value)
                }
            }
            vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE; // 标识这个组件是keep-alive,稍后的卸载流程中是假的卸载;
            current = vnode;
            return vnode; // 组件 -> 组件渲染的内容;
        }
    }
};

export const isKeepAlive = (vnode) => vnode.type.__isKeepAlive
