
import { ReactiveEffect } from "@vue/reactivity";
import { isString, ShapeFlags, isNumber, invokeArrayFns, isArray, PatchFlags } from "@vue/shared";
import { getSequence } from './sequence';
import { createVnode, Text, isSameVnode, Fragment } from './vnode';
import { queueJon } from './scheduler';
import { updateProps, hasPropsChanged } from './componentProps';
import { createComponentInstance, setupComponent, renderComponent } from './component';
import { isKeepAlive } from "./components/KeepAlive";

export function createRenderer(renderOptions) {
    let {
        // 插入节点
        insert: hostInsert,
        // remove 删除节点
        remove: hostRemove,
        // 修改元素中的文本;当传入的是元素时;
        setElementText: hostSetElementText,
        // 设置文本节点;当传入的是文本节点时
        setText: hostSetText,
        // 查询元素;
        querySelector: hostQuerySelector,
        // 查询父节点;
        parentNode: hostParentNode,
        // 查询兄弟节点;
        nextSibling: hostNextSibling,
        // 创建元素节点
        createElement: hostCreateElement,
        // 创建文本节点
        createText: hostCreateText,
        patchProp: hostPatchProp
    } = renderOptions

    // 把数字或字符串转成 VNode, 影响到原子节点数组;
    const normalize = (children, i) => {
        // 检测如果是字符串的话，就把字符串转换成文本节点; 是字符串或数字时;
        if (isString(children[i]) || isNumber(children[i])) {
          let vnode = createVnode(Text, null, children[i])
          children[i] = vnode
        }

        // 为虚拟节点时;
        return children[i]
    }
    /**
     * 挂载子节点
     * @param children
     * @param container
    */
    // 创建子元素递归
    // 挂载子节点列表到容器上;
    // 根据 虚拟节点列表 children 循环对比新旧虚拟节点,并创建出`虚拟节点对应真实DOM`,把`虚拟节点对应真实DOM`挂载到虚拟节点上,同时把`虚拟节点对应真实DOM`挂载到容器上;
    const mountChildren = (children, container, parentComponent = null) => {
        for(let i = 0; i < children.length; i++) {
            let child = normalize(children, i); // 处理后要进行替换, 否则 children 中存放的已经是字符串
            patch(null, child, container, null, parentComponent)
        }
    }

    /**
     * 把虚拟节点递归转换成真实dom
     * @param vnode 虚拟节点
     * @param container 容器
     * // 创建出`虚拟节点对应真实DOM`,把`虚拟节点对应真实DOM`挂载到虚拟节点上,同时把`虚拟节点对应真实DOM`挂载到容器上;
     * 1. 先创建`虚拟节点type对应DOM元素`,同时将`虚拟节点type对应DOM元素`挂载到`虚拟节点`上;
     * 2. 再用`虚拟节点props`在`虚拟节点type对应DOM元素`上创建`DOM元素各项属性`;
     * 3. 3.再用`虚拟节点children`在`虚拟节点type对应DOM元素`上创建`DOM元素子元素`;
     */
    const mountElement = (vnode, container, anchor = null, parentComponent) => {
        let { type, props, children, shapeFlag } = vnode
        // 根据 type 创建元素，并且把真实dom挂载到这个虚拟节点上, 后续用于复用节点和更新节点;
        let el = (vnode.el = hostCreateElement(type))

        // 如果有 props 就循环添加  props 包括 style class event attrs
        if (props) {
            for (let key in props) {
                hostPatchProp(el, key, null, props[key])
            }
        }
        // 是否子节点; // 处理父元素的子节点;
        // 如果是文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children)
        }
        // 如果是数组
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el, parentComponent)
        }
        // 把真实节点插入到容器中
        hostInsert(el, container, anchor)
    }

    const processText = (n1, n2, container) => {
        if(n1 === null) {
            // 创建出n2对应的真实dom，并且把真实dom挂载到这个虚拟节点上，并且把真实dom插入到容器中
            n2.el = hostCreateText(n2.children);
            hostInsert(n2.el, container)
        } else {
            // 文本的内容变化了,可以复用老的节点(上的DOM元素);
            const el = (n2.el = n1.el); // 复用DOM元素,减少性能损失;// 这里的DOM元素必定为文本节点;
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
            if (newProps[key] == null || newProps[key] == undefined) {
                hostPatchProp(el, key, oldProps[key], undefined)
            }
        }
    }
    // 删除循环里的每一项 卸载儿子
    const unmountChildren = (children, parentComponent) => {
        for(let i = 0; i < children.length; i++) {
            unmount(children[i], parentComponent)
        }
    };
    // 比较两个儿子的差异
    const patchKeyedChildren = (c1, c2, el, parentComponent) => {
        // debugger;
        let i = 0; // 表示新旧虚拟节点从前向后循环时最后一个相等的角标;
        let e1 = c1.length - 1; // 老的组件长度 2 // 表示旧虚拟节点从前向后循环时最后一个相等的角标;
        let e2 = c2.length - 1; // 新的组件长度 3 // 表示新虚拟节点从前向后循环时最后一个相等的角标;

        // 特殊处理......
        // 从头部比较
        // 用于减少进行diff算法比较的范围;
        // 先分别比较新虚拟节点与旧虚拟节点的前面及后面的同等节点;留下中间不同的以便乱序比较;
        // 原因是因为一个数组变动前后,前面和后面会有一大块的内容不改变;
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
                    unmount(c1[i], parentComponent);
                    i++;
                }
            }
        }

        // i 比 e2 大说明有要卸载的
        // i 比 e1 之间的就是要卸载的

        // 优化
        // 思路:
        // 用新虚拟节点乱序部份的key及新虚拟节点角标做一个映射表;
        // 用循环旧虚拟节点乱序部份的key从映射表中拿到对应新虚拟节点;如果没找到,说明该旧虚拟节点要被删除;如果找到,用一个数组记录下新虚拟节点乱序部份角标及`旧虚拟节点角标+1`的映射关系,并比对新旧虚拟节点关系;
        // 对新虚拟节点乱序部份循环了一遍,根据新虚拟节点乱序部份角标及`旧虚拟节点角标+1`的映射关系来倒叙进行插入或创建;
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
                unmount(oldChild, parentComponent); // 多余的删除
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
                    // 目前无论如何做了一遍倒叙插入, 其实可以不用的, 可以根据刚才的数组来减少插入次数
                    hostInsert(current.el, el, anchor); // 复用节点 
                } {
                    j--;
                }
            }
        }
    }
    // 更新子元素
    const patchChildren = (n1, n2, el, parentComponent = null) => {
        // 比较两个虚拟节点的儿子的差异，el 就是当前的父节点
        const c1 = n1 && n1.children; // 旧虚拟节点的子节点列表;
        const c2 = n1 && n2.children; // 新虚拟节点的子节点列表;

        const prevShapeFlag = n1.shapeFlag; // 之前的虚拟节点的类型;
        const shapeFlag = n2.shapeFlag; // 之后的虚拟节点的类型;

        // 1. 新的是文本,
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 判断新虚拟节点为文本;
            // 老的是数组
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 删除所有子元素
                unmountChildren(c1, parentComponent) // 文本 数组 （删除旧节点列表，设置文本内容）;
            }
            // 老的是文本/老的是空的
            if(c1 !== c2) {
                hostSetElementText(el, c2); // 文本 文本 (设置文本内容）;包括了文本和空;
            }
        } else {
            // 现在为数组或空的
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 判断老虚拟节点为数组;
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组 数组 (判断新虚拟节点为数组)
                    // diff 算法
                    patchKeyedChildren(c1, c2, el, parentComponent); // 全量对比
                } else {
                    // 现在不是数组（文本/空）
                    unmountChildren(c1, parentComponent) // 空 数组
                }
            } else {
                // 两种情况;
                // 空	文本	（清空文本）;
                // 数组	文本	（清空文本，进行挂载）;
                // 这里的思路是如果老节点为文本,那么不管当前新节点为数组还是空,都直接清空当前文本;
                // 如果当前新节点为数组,那么就挂载新节点的子节点;
                if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN) { //判断老虚拟节点为文本;
                    hostSetElementText(el, '')
                }
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { //判断新虚拟节点为数组;
                    mountChildren(c2, el, parentComponent)
                }
            }
        }

        // 文本 空的 null 数组
        // 比较差异
    }

    // 靶向更新;
    const patchBlockChildren = (n1, n2, parentComponent) => {
        for (let i = 0; i < n2.dynamicChildren.length; i++) {
            //之前是树的递归比较,现在是数组的比较;
            patchElement(n1.dynamicChildren[i], n2.dynamicChildren[i], parentComponent)
        }
    }

    // 更新元素: 先复用节点 再比较属性 再比较儿子
    const patchElement = (n1, n2, parentComponent) => {
        let el = n2.el = n1.el;

        let oldProps = n1.props || {};
        let newProps = n2.props || {};

        // // 去比较
        // patchProps(oldProps, newProps, el);
        // // n2 = normalize(n2) // n1 n2 的children 不一样需要处理 bug
        // // 比较儿子
        // patchChildren(n1, n2, el, parentComponent)
        
        //比较属性; 包含keep-alive

        const { patchFlag } = n2
        // console.log('oldProps?.class--->', oldProps?.class, 'newProps?.class--->', newProps?.class,)
        // console.log('patchFlag--->', patchFlag)
        if (patchFlag & PatchFlags.CLASS) {
            if (oldProps?.class !== newProps?.class) {
                //debugger
                hostPatchProp(el, 'class', null, newProps.class)
            }
        // 像style .. 与事件等,都可以仿照这个来进行靶向更新;
        } else {
            // 比较所有属性;
            patchProps(oldProps, newProps, el)
        }

        // 比较子节点;
        // debugger
        // n2 = normalize(n2)//这里n2的子节点可能还是个数组,数组中可能并不是VNode,要把子节点转成VNode;
        if (isArray(n2.children)) {
            for (let index = 0; index < n2.children?.length; index++) {
                //debugger
                n2.children[index] = normalize(n2.children, index)//处理后要进行替换,否则children中存放的依旧是字符串;
            }
        }

        // 这里的patchChildren()是一个全量的diff算法;
        // 不过有些节点是非动态节点,实际更新时,一般只要比较动态节点就好了;
        // 查看新虚拟节点是否有动态节点;
        // 有动态节点数组,直接比对动态节点数组--数组的比较;
        // 没动态节点数组,就和之前一样比对子节点列表--树的递归比较;
        if (n2.dynamicChildren) {
            // debugger
            //元素之间的优化--靶向更新,只比较动态节点了;
            console.log("n2.dynamicChildren--->", n2.dynamicChildren);
            patchBlockChildren(n1, n2, parentComponent)
        } else {
            //h1还在这呢;
            patchChildren(n1, n2, el, parentComponent)
        }
    };

    // 处理是创建还是更新
    const processElement = (n1, n2, container, anchor = null, parentComponent) => {
        // 旧节点n1为null,就创建新节点并插入到容器上;
        if(n1 === null) {
            mountElement(n2, container, anchor, parentComponent)
        } else {
            patchElement(n1, n2, parentComponent)
        }
    }

    const processFragment = (n1, n2, container, parentComponent) => {
        if(n1 === null || n1 === undefined) {
            if(!isArray(n2.children)) {
                console.log("Fragment的子节点不是数组,直接退出挂载");
                return;
            }
            mountChildren(n2.children, container, parentComponent) // //走的是新增,直接把子节点挂载到容器中;
        } else {
            // 走的是对比,对比新旧虚拟节点的子节点列表
            // 这里 n2 的子节点可能还是个数组,数组中可能并不是 VNode,要把子节点转成VNode;
            if (isArray(n2.children)) {
                for (let index = 0; index < n2.children?.length; index++) {
                    // 处理后要进行替换,否则children中存放的依旧是字符串;
                    n2.children[index] = normalize(n2.children, index)
                }
            }
            patchChildren(n1, n2, container, parentComponent); // 走的是 diff 
        }
    }

    const mountComponent = (vnode, container, anchor, parentComponent) => {
        // 1) 要创造一个组件的实例
        let instance = (vnode.component = createComponentInstance(vnode, parentComponent));
        // 对 KeepAlive 处理 (Keeplive 组件 mount 时挂载 renderer 到 ctx 上)
        if (isKeepAlive(vnode)) {
            (instance.ctx as any).renderer = {
                createElement: hostCreateElement,//创建元素用这个方法;
                move(vnode, container) {//move的vnode肯定是组件;
                    hostInsert(vnode.component.subTree.el, container)
                }
            }
        }
        // 2) 给实例上赋值
        setupComponent(instance);
        // 3) 创建一个 effect
        setupRenderEffect(instance, container, anchor)
    }

    const updateComponentPreRender = (instance, next) => {
        instance.next = null; // 清空 next
        instance.vnode = next; // 实例上最新的虚拟节点
        // 之前的props, 之后的 props
        updateProps(instance.props, next.props)

        // instance.slots = next.children as object //更新插槽;//应该还要做比对的,但目前简单点,直接用新的代替老的;
        // 这样写不行,组件中setup()中解析后,依旧会是老对象;
        // 也就是说,这里直接改了整个引用,产生了新引用及旧引用,但setup()如果用花括号语法解析,那么setup()中引用的永远是旧引用;实际上需要的是更新旧引用的值就好了;
        Object.assign(instance.slots, next.children as object)//更新插槽;
    }

    const setupRenderEffect = (instance, container, anchor) => {
        const { render } = instance;
        const componenUpdateFn = () => { // 区分是初始化还是更新
            if(!instance.isMounted) { // 初始化
                let { bm, m } = instance;
                if(bm) {
                    invokeArrayFns(bm);
                }

                // const subTree: VNode = render.call(instance.proxy, instance.proxy);//得到一个虚拟节点;//作为this,后续this会改;
                const subTree = renderComponent(instance);//得到一个虚拟节点;//作为this,后续this会改;
                // subTree 创建成真实节点
                patch(null, subTree, container, anchor, instance); // 创建了subTree 的真实节点

                instance.subTree = subTree // 将虚拟节点挂载到实例上;
                instance.isMounted = true

                // instance.vnode.el = subTree.el//把虚拟节点上绑定的el,存到vnode的el上;
                // 生命周期钩子-onMounted-组件实例挂载后;
                // 得先等subTree好之后才调用;
                // 一定要保证subTree已经有了,再去调用mounted;
                if(m) {
                    invokeArrayFns(m);
                }

            } else{ // 组件内部更新
                let { next, bu, u } = instance;
                if(next) {
                    // 更新前, 我也需要拿到最新的属性来进行更新
                    updateComponentPreRender(instance, next)
                }
                // 组件内部更新 (bu ,u )生命周期
                // 数据变化了之后，会重新生成 subTree 虚拟DOM ，再重新走patch方法。
                if (bu) {
                    invokeArrayFns(bu)
                }
                //const subTree: VNode = render.call(instance.proxy, instance.proxy);//得到一个新的节点;
                const subTree = renderComponent(instance); //得到一个虚拟节点;//作为this,后续this会改;
                patch(instance.subTree, subTree, container, anchor, instance); // 更新
                instance.subTree = subTree; // 将新节点保存到实例上,变成下次更新时的老节点;
                if(u) {
                    invokeArrayFns(u);
                }
            }
        }

        // 组件异步更新
        // 创建一个 effect ，将render()函数作为副作用函数，
        // 把任务更新推入到异步任务中去,实现组件的异步更新
        const effect = new ReactiveEffect(componenUpdateFn, () => queueJon(instance.update))

        //我们将强制更新的逻辑保存到了组件的实例上，后续可以使用
        let update = instance.update = effect.run.bind(effect); // 调用 effect 可以让组件强制重新渲染
        update();
    }

    // 比对新旧组件对应的虚拟节点,看是否要更新;
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

    // 更新组件;
    const updateComponent = (n1, n2) => {
        // instance.props 是响应式的, 而且可以更改, 属性的更新会导致页面重新渲染
        const instance = (n2.component = n1.component); // 对于元素而言, 复用的是 dom 节点,对于组件来说复用的是实例
        // 属性更新;
        // updateProps(instance, prevProps, nextProps)
        // 后续插槽发生了变化 逻辑和updateProps()肯定是不一样;

        // 没必要分别比对props及插槽,只要一个方法确定是否要更新,之后直接调用vue组件实例的更新方法就可以了;
        // 需要更新就强制调用组件的update()方法;
        if(shouldUpdateComponent(n1, n2)) {
            instance.next = n2; // 将新的虚拟节点放到 next 属性上
            instance.update(); // 统一调用update()方法来进行更新;
        }
    }

    // 处理组件
    const processComponent = (n1, n2, container, anchor = null, parentComponent) => { // 统一处理组件，判断是普通的还是函数式的
        if(n1 === null) {
            // COMPONENT_KEPT_ALIVE 标志,组件挂载的时候告诉渲染器这个不需要 mount 而是需要特殊处理
            if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) { // keep-alive组件时:假设my1->my2->my1;
                // keep-alive组件的挂载;
                parentComponent.ctx.activate(n2, container, anchor)
            } else {
                // 组件的挂载;
                mountComponent(n2, container, anchor, parentComponent)
            }
        } else {
            // 组件更新靠的是 props
            updateComponent(n1, n2)
        }
    }

    // 核心方法
    // 对比新旧虚拟节点,并创建出`虚拟节点对应真实DOM`,把`虚拟节点对应真实DOM`挂载到虚拟节点上,同时把`虚拟节点对应真实DOM`挂载到容器上;
    const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
        // 老节点和新节点一样，这个时候不需要更新
        if (n1 === n2) {
            return
        }

        // 判断两个元素是不是相同，不相同，卸载再添加
        if(n1 && !isSameVnode(n1, n2)) {
            // 删除老的
            unmount(container, parentComponent)
            //旧节点置为null,再走后续的新增流程;
            n1 = null
        }

        // 虚拟节点类型为元素时比对: 元素类型,元素属性,元素子节点;
        // 虚拟节点类型为文本时比对: 文本内部(其实就是元素子节点);
        // 虚拟节点类型为组件时比对: 组件属性,插槽;
        const { type, shapeFlag } = n2;
        // 初次渲染
        // 后续还有组件的初次渲染,目前是元素的初次渲染
        switch(type) {
            case Text: // 文本的标签;
                processText(n1, n2, container);
                break;
            case Fragment: // 无用的标签;
                processFragment(n1, n2, container, parentComponent);
                break;
            default: // 元素的标签
                if(shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, anchor, parentComponent);
                } else if (shapeFlag & ShapeFlags.COMPONENT) { // 判断是不是组件(带状态组件/函数组件)
                    processComponent(n1, n2, container, anchor, parentComponent)
                } else if (shapeFlag & ShapeFlags.TELEPORT) {
                    type.process(n1, n2, container, anchor, {
                        mountChildren,
                        patchChildren,
                        move(vnode, container, anchor) {
                            hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor)
                        }
                        // ...其他方法;
                    })
                }
                break;
        }
    }
    // 可以卸载元素 文本 属性
    const unmount = (vnode, parentComponent) => {
        if (vnode.type === Fragment) { // Fragment 删除的时候,要清空儿子,不是删除真实dom;
            return unmountChildren(vnode.children, parentComponent);
        } else if(vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
            // 直接把虚拟节点传递给keep-alive组件中删除的方法;
            // 进入这个 if 分支里,parentComponent必定为 keep-alive 组件; vnode为插槽;
            // 在 KeepAlive 组件渲染时会对子组件增加 COMPONENT_SHOULD_KEEP_ALIVE 标志
            // 然后在子组件卸载时并不会真实的卸载而是调用 KeepAlive 的 deactivate 方法
            return parentComponent.ctx.deactivate(vnode);
        } else if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
            // 如果是 vnode 的话,就移除组件的真实节点;
            // console.log('真实的卸载: vnode--->', vnode)
            return unmount(vnode.component.subTree, null);
        }
        // 卸载元素
        hostRemove(vnode.el) // 删除掉虚拟节点对应的 DOM 元素; // el.removeChild();
    }

    /**
     *
     * @param vnode 虚拟节点
     * @param container 容器
     * 用新传入的虚拟节点,并把虚拟节点挂载到容器上
     */
    const render = (vnode, container) => {
        if (vnode == null || vnode === undefined) {
            // 卸载的逻辑
            // 判断一下容器中是否有虚拟节点
            if (container._vnode) {
                unmount(container._vnode, null)
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
