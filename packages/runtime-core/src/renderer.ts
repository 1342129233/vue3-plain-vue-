
import { reactive, ReactiveEffect } from "@vue/reactivity";
import { isArray, isString, ShapeFlags, isNumber, hasOwn } from "@vue/shared";
import { getSequence } from './sequence';
import { createVnode, Text, isSameVnode, Fragment } from './vnode';
import { queueJon } from './scheduler';
import { initProps, updateProps, hasPropsChanged } from './componentProps';
import { createComponentInstance, setupComponent } from './component';

export function createRenderer(renderOptions) {
    let {
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText,
        setText: hostSetText,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        createElement: hostCreateElement,
        createText: hostCreateText,
        patchProp: hostPatchProp
      } = renderOptions

    const normalize = (children, i) => {
        // 检测如果是字符串的话，就把字符串转换成文本节点
        if (isString(children[i]) || isNumber(children[i])) {
          let vnode = createVnode(Text, null, children[i])
          children[i] = vnode
        }
        return children[i]
      }
    // 创建子元素递归
    const mountChildren = (children, container) => {
        for(let i = 0; i < children.length; i++) {
            let child = normalize(children, i); // 处理后要进行替换, 否则 children 中存放的已经是字符串
            patch(null, child, container)
        }
    }

    /**
     * 把虚拟节点递归转换成真实dom
     * @param vnode 虚拟节点
     * @param container 容器
     */
    const mountElement = (vnode, container, anchor) => {
        let { type, props, children, shapeFlag } = vnode
        // 根据 type 创建元素，并且把真实dom挂载到这个虚拟节点上
        let el = (vnode.el = hostCreateElement(type))

        // 如果有 props 就循环添加  props 包括 style class event attrs
        if (props) {
        for (let key in props) {
            hostPatchProp(el, key, null, props[key])
        }
        }
        // 如果是文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children)
        }
        // 如果是数组
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el)
        }
        // 把真实节点插入到容器中
        hostInsert(el, container, anchor)
    }

    const processText = (n1, n2, container) => {
        if(n1 === null) {
            // 创建出n2对应的真实dom，并且把真实dom挂载到这个虚拟节点上，并且把真实dom插入到容器中
            hostInsert((n2.el = hostCreateText(n2.children)), container)
        } else {
            // 文本的内容变化了,可以服用老的节点
            const el = n2.el = n1.el;
            if(n1.children !== n2.children) {
                hostSetText(el, n2.children); // 文本的更新 
            }
        }
    }

    const patchProps = (oldProps, newProps, el) => {
        // 新的里面有直接用新的覆盖掉即可
        for (let key in newProps) {
            hostPatchProp(el, key, oldProps[key], newProps[key])
        }
        // 如果老的里面有新的里面没有，则是删除
        for (let key in oldProps) {
            if (newProps[key] == null) {
                hostPatchProp(el, key, oldProps[key], undefined)
            }
        }
    }
    // 删除循环里的每一项
    const unmountChildren = (children) => {
        for(let i = 0; i < children.length; i++) {
            unmount(children[i])
        }
    };
    // 比较两个儿子的差异
    const patchKeyedChildren = (c1, c2, el) => {
        // debugger;
        let i = 0;
        let e1 = c1.length - 1; // 老的组件长度 2
        let e2 = c2.length - 1; // 新的组件长度 3

        // 特殊处理......
        // 从头部比较
        while(i <= e1 && i <= e2) { // 有任何一方停止循环则直接跳出
            const n1 = c1[i]
            const n2 = c2[i]
            if(isSameVnode(n1, n2)) { // 比较两个节点的属性和子节点 // 节点一样是 true
                patch(n1, n2, el); // 创建新节点
            } else {
                break;
            }
            i++;
        }

        // 从尾部比较
        while(i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if(isSameVnode(n1, n2)) {
                patch(n1, n2, el);
            } else {
                break;
            }
            e1--;
            e2--;
        }

        // i 要比 e1 大说明有新增的
        // i < e2 之间的是新增的部分

        // 有一方全部比较完毕了,要么删除,要么添加
        // 添加
        if(i > e1) {
            if(i <= e2) {
                while(i <= e2) {
                    const nextPos = e2 + 1;
                    // 根据一个人的索引来看参照物
                    const anchor = nextPos < c2.lengtht ? c2[nextPos].el : null;
                    patch(null, c2[i], el, anchor); // 创建新节点 扔到容器中
                    i++;
                }
            }
        } else if(i > e2) {
            // i 比 e2 大说明有要卸载的
            // i 到 e1 之前就是要卸载的
            if(i < e1) {
                while(i < e1) {
                    unmount(c1[i]);
                    i++;
                }
            }
        }

        // i 比 e2 大说明有要卸载的
        // i 比 e1 之间的就是要卸载的

        // 优化
        // 乱序对比
        let s1 = i;
        let s2 = i;
        const keyToNewIndexMap = new Map(); // key -> newIndex
        for(let i = s2; i <= e2; i++) {
            keyToNewIndexMap.set(c2[i].key, i)
        }

        // 循环老的元素 看一下新的里面有没有, 如果有说明要比较差异,没有要添加到列表中,老的有新的没有要删除
        const toBePatched = e2 - s2 + 1; // 新的总个数
        const newIndexToOldIndexMap = new Array(toBePatched).fill(0); // 记录是否比对过的映射表
        // 新老属性的比对没有移动位置
        for(let i = s1; i < e1; i++) {
            const oldChild = c1[i]; // 老的孩子
            const newIndex = keyToNewIndexMap.get(oldChild.key); // 用老的孩子去新的里面找
            if(newIndex === undefined) {
                unmount(oldChild); // 多余的删除
            } else {
                // 新的位置对应的老的位置, 如果数组里放的值 > 0 说明已经 patch 过了
                newIndexToOldIndexMap[newIndex - s2] = i + 1; // 用来标记当前所 patch 过的结果
                patch(oldChild, c2[newIndex], el); // 比较两个节点
            }
        }

        // 获取最长递增子序列
        let increment = getSequence(newIndexToOldIndexMap)

        // 需要移动位置(倒叙插入)
        let j = increment.length - 1;
        for(let i = toBePatched - 1; i >= 0; i--) {
            let index = i + s2;
            let current = c2[index]; // 乱叙的最后一个
            // 找参照物
            let anchor = index + 1 < c2.length ? c2[index + 1].el : null;
            if(newIndexToOldIndexMap[i] === 0) { // 0 表示创建  5 3 4 0
                patch(null, current, el, anchor)
            } else { // 不是0 说明是已经对比过属性和儿子的了
                if(i !== increment[j]) {
                    hostInsert(current.el, el, anchor); // 复用节点 
                } {
                    j--;
                }
            }
        }
    }
    // 更新子元素
    const patchChildren = (n1, n2, el) => {
        // 比较两个虚拟节点的儿子的差异，el 就是当前的父节点
        const c1 = n1 && n1.children;
        const c2 = n1 && n2.children;

        const prevShapeFlag = n1.shapeFlag; // 之前的
        const shapeFlag = n2.shapeFlag; // 新的

        // 1. 新的是文本,
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 老的是数组
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 删除所有子元素
                unmountChildren(c1) // 文本 数组
            }
            // 老的是文本/老的是空的
            if(c1 !== c2) {
                hostSetElementText(el, c2); // 文本 文本
            }
        } else {
            // 现在为数组或空的
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组 数组
                    // diff 算法
                    patchKeyedChildren(c1, c2, el); // 全量对比
                } else {
                    // 现在不是数组（文本/空）
                    unmountChildren(c1) // 空 数组
                }
            } else {
                if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN) { // 数组 文本
                    hostSetElementText(el, '')
                }
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组 文本
                    mountChildren(el, '')
                }
            }
        }

        // 文本 空的 null 数组
        // 比较差异
    }

    // 更新元素: 先复用节点 再比较属性 再比较儿子
    const patchElement = (n1, n2, container) => {
        let el = n2.el = n1.el;

        let oldProps = n1.props || {};
        let newProps = n2.props || {};

        // 去比较
        patchProps(oldProps, newProps, el);

        // 比较儿子
        patchChildren(n1, n2, el)
    };

    // 处理是创建还是更新
    const processElement = (n1, n2, container, anchor) => {
        if(n1 === null) { 
            mountElement(n2, container, anchor)
        } else {
            patchElement(n1, n2, container)
        }
    }

    const processFragment = (n1, n2, container, anchor) => {
        if(n1 == null) {
            mountChildren(n2.children, container)
        } else {
            patchChildren(n1, n2, container); // 走的是 diff 
        }
    }

    const mountComponent = (vnode, container, anchor) => {
        // 1) 要创造一个组件的实例
        let instance = (vnode.component = createComponentInstance(vnode));
        // 2) 给实例上赋值
        setupComponent(instance);
        // 3) 创建一个 effect
        setupRenderEffect(instance, container, anchor)
    }

    const updateComponentPreRender = (instance, next) => {
        instance.next = null;
        instance.vnode = next; // 实例上最新的虚拟节点
        // 之前的props, 之后的 props
        updateProps(instance.props, next.props)
    }

    const setupRenderEffect = (instance, container, anchor) => {
        const { render } = instance;
        const componenUpdateFn = () => { // 区分是初始化还是更新
            if(!instance.isMounted) { // 初始化
                const subTree = render.call(instance.proxy); // 作为 this 后续 this 会改
                // subTree 创建成真实节点
                patch(null, subTree, container, anchor); // 创建了subTree 的真实节点
                instance.subTree = subTree;
                instance.isMounted = true;
            } else{ // 组件内部更新
                let { next } = instance;
                if(next) {
                    // 更新前, 我也需要拿到最新的属性来进行更新
                    updateComponentPreRender(instance, next)
                }

                const subTree = render.call(instance.proxy);
                patch(instance.subTree, subTree, container, anchor); // 更新
                instance.subTree = subTree;
            }
        }

        // 组件异步更新
        const effect = new ReactiveEffect(componenUpdateFn, () => queueJon(instance.update))

        //我们将强制更新的逻辑保存到了组件的实例上，后续可以使用
        let update = instance.update = effect.run.bind(effect); // 调用 effect 可以让组件强制重新渲染
        update();
    }

    // 要不要更新
    const shouldUpdateComponent = (n1, n2) => {
        // children 插槽
        const { props: prevProps, children: prevChildren } = n1;
        const { props: nextProps, children: nextChildren } = n2;
        if(prevProps === nextProps) return false;
        if(prevChildren || nextChildren) {
            return true;
        }
        return hasPropsChanged(prevProps, nextProps);
    }

    const updateComponent = (n1, n2) => {
        // instance.props 是响应式的, 而且可以更改, 属性的更新会导致页面重新渲染
        const instance = (n2.component = n1.component); // 对于元素而言, 复用的是 dom 节点,对于组件来说复用的是实例
        // const { props: prevProps } = n1;
        // const { props: nextProps } = n2;
        // updateProps(instance, prevProps, nextProps); // 属性更新
        // 统一处理
        // 需要更新就强制调用 update 方法
        if(shouldUpdateComponent(n1, n2)) {
            instance.next = n2; // 将新的虚拟节点放到 next 属性上
            instance.update();
        }
    }

    // 处理组件
    const processComponent = (n1, n2, container, anchor) => { // 统一处理组件，判断是普通的还是函数式的
        if(n1 === null) {
            // 创建组件
            mountComponent(n2, container, anchor)
        } else {
            // 组件更新靠的是 props
            updateComponent(n1, n2)
        }
    }

    // 核心方法
    const patch = (n1, n2, container, anchor = null) => {
        // 老节点和新节点一样，这个时候不需要更新
        if (n1 === n2) {
            return
        }

        // 判断两个元素是不是相同，不相同，卸载再添加
        if(n1 && !isSameVnode(n1, n2)) {
            // 删除老的
            unmount(container._vnode)
            n1 = null
        }
        const { type, shapeFlag } = n2;
        // 初次渲染
        // 后续还有组件的初次渲染,目前是元素的初次渲染
        switch(type) {
            case Text: 
                processText(n1, n2, container);
                break;
            case Fragment: 
                processFragment(n1, n2, container, anchor);
                break;
            default: 
                // 元素
                if(shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, anchor);
                } else if (shapeFlag & ShapeFlags.COMPONENT) { // 判断是不是组件
                    processComponent(n1, n2, container, anchor)
                }
        }
    }
    // 可以卸载元素 文本 属性
    const unmount = (vnode) => {
        // 卸载元素
        hostRemove(vnode)
    }

    /**
     *
     * @param vnode 虚拟节点
     * @param container 容器
     */
    const render = (vnode, container) => {
        if (vnode == null) {
        // 卸载的逻辑
        // 判断一下容器中是否有虚拟节点
        if (container._vnode) {
            unmount(container._vnode)
        }
        } else {
        // 第一次的时候 vnode 是 null
        // 第二次的时候就会从 容器上去取 vnode 进行走更新的逻辑
        patch(container._vnode || null, vnode, container)
        }
        // 在容器上保存一份 vnode
        container._vnode = vnode
    }
    return {
        render
    }
}


// 注意事项：
// 文本的处理需要自己添加类型，不能通过document.createElement来创建
// 如果传入的vnode 是 null的话，则是卸载逻辑，需要删除DOM节点

// 更新的情况分析：
// 1.如果前后完全没有关系 div -> p ，那么久删除老的 添加新的节点
// 2.老的和新的一样，如果属性不一样，就比对属性，然后更新属性
// 3.如果属性都一样，就比较儿子

// 新儿子 老儿子 操作方式
// 文本   数组  删除老儿子，设置文本内容
// 文本   文本  更新文本
// 文本   空    更新文本
// 数组   数组  diff算法
// 数组   文本  清空文本挂载
// 数组   空    进行挂载
// 空     数组  删除所有儿子
// 空     文本  清空文本
// 空     空    无需处理
