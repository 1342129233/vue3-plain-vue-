
import { isArray, isString, ShapeFlags, isNumber } from "@vue/shared";
import { createVnode, Text, isSameVnode } from './vnode';

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
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 2;

        // 特殊处理......

        while(i <= e1 && i <= e2) { // 有任何一方停止循环则直接跳出
            const n1 = c1[i]
            const n2 = c2[i]
            if(isSameVnode(n1, n2)) { // 比较
                patch(n1, n2, el); // 比较两个节点的属性和子节点
            } else {
                break;
            }
            i++;
        }

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
        if(i > e1) {
            if(i <= e2) {
                while(i <= e2) {
                    const nextPos = e2 + 1;
                    // 根据一个人的索引来看参照物
                    const anchor = nextPos < c2.lengtht ? c2[nextPos].el : null;
                    patch(null, c2[i], el); // 创建新节点 扔到容器中
                    i++;
                }
            } else if(i > e2) {
                if(i < e1) {
                    while(i < e1) {
                        unmount(c1[i]);
                        i++;
                    }
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
            default: 
                // 元素
                if(shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, anchor);
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
