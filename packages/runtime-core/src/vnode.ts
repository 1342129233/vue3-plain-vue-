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

export function createVnode(type, props, children = null) {
    
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
