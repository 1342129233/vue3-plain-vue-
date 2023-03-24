// type,即节点类型;props,属性;children,子节点;

import { isArray, isObject, isString, ShapeFlags } from "@vue/shared";
export const Text = Symbol('Text');
export const Fragment = Symbol('Fragment');

export function isVnode(value) {
    return !!(value && value.__v_isVnode);
}

// 是不是相同的节点
// 判断两个虚拟节点是否是相同节点, : 1.便签名相同 2. key 是一样的
export function isSameVnode(n1, n2) {
  	return (n1.type === n2.type) && (n1.key === n2.key)
}

export function createVnode(type, props, children = null, patchFlag = 0) {
    
    // 是string 说明要渲染元素
    let shapeFlag = isString(type)
      ? ShapeFlags.ELEMENT
      : isObject(type) // 是对象说明是组件
      ? ShapeFlags.STATEFUL_COMPONENT
      : 0
  
    const vnode = {
      type,
      props,
      children,
      el: null, 
      key: props?.key,
      __v_isVnode: true,
      shapeFlag // 定义节点的类型
    }
  
    if (children) {
      let type = 0
      if (isArray(children)) {
        type = ShapeFlags.ARRAY_CHILDREN // 标识儿子是数组
      } else if (isObject(children)) {
        type = ShapeFlags.SLOTS_CHILDREN // 如果children 是对象则说明是带有插槽的
      } else {
        children = String(children)
        type = ShapeFlags.TEXT_CHILDREN
      }
      vnode.shapeFlag |= type // 计算得出这个元素的类型
    }
    return vnode
}

// 创建虚拟节点,与createVnode一样
// 把 createVnode 重命名为1 createElementVnode, 并导出 createElementVNode
export { createVnode as createElementVNode }

// 用来收集多个动态节点的数组
let currentBlock = null;

// 用一个数组来收集多个动态节点;
export function openBlock() {
	// 类似于: 生命周期,用 instance 收集 -> 多个fn
	currentBlock = []
}

export function createElementBlock(type, props, children, patchFlag) {
	return setupBlock(createVnode(type, props, children, patchFlag))
}

export function createTextVNode(value: any, patchFlag = 0) {
	return createVnode(Text, null, String(value), patchFlag)
}

/* export function createTextVNode(text: ' ', flag = 0) { // 创建文本虚拟节点
  return createVnode(Text, null, text, flag)
} */

function setupBlock(vnode) {
	vnode.dynamicChildren = currentBlock
	currentBlock = null
	return vnode;
}

/* //创建虚拟节点,实际上就是createVnode;
export function createElementVNode() {
} */
export function toDisplayString(value: any) {
	//debugger
	return isString(value) ? value : value === undefined || value === null ? '' : isObject(value) ? JSON.stringify(value) : String(value)
}
