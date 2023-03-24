// 实现 dom 节点 的 增加 删除 修改 查询
export const nodeOps = {
  // 插入节点
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor) // 如果没有参考的元素，就相当于 appendChild
  },
  // 移除节点
  remove(child) {
    let parentNode = child.parentNode
    if (parentNode) {
      parentNode.removeChild(child)
    }
  },
  // 设置元素文本
  setElementText(el, text) {
    el.textContent = text
  },
  // 设置文本节点内容
  setText(node, text) {
    node.nodeValue = text
  },
  // 查询元素
  querySelector(selector) {
    document.querySelector(selector)
  },
  // 返回元素的父节点
  parentNode(node) {
    return node.parentNode
  },
  // 返回元素的下一个兄弟节点
  nextSibling(node) {
    return node.nextSibling
  },
  // 创建元素
  createElement(tagName) {
    return document.createElement(tagName)
  },
  //创建文本节点
  createText(text) {
    return document.createTextNode(text)
  }
}

/* //要写的方法;
const fang = {
  insert: hostInsert,//插入节点;
  remove: hostRemove,//删除节点;
  patchProp: hostPatchProp,//属性操作,要单独去写;//patch实际上就是补丁或比对的意思;//因为这个方法即要能创建,又要能修改,还要能移除;
  createElement: hostCreateElement,//创建元素;
  createText: hostCreateText,//创建文本;
  createComment: hostCreateComment,//创建注释;
  setText: hostSetText,//设置文本节点文本;
  setElementText: hostSetElementText,//设置元素节点文本;
  parentNode: hostParentNode,//获取父节点;
  nextSibling: hostNextSibling,//获取兄弟节点;
  setScopeId: hostSetScopeId = NOOP,//`NOOP`就是空函数的意思;
  cloneNode: hostCloneNode,//把节点拷贝;
  insertStaticContent: hostInsertStaticContent,//插入静态内容;
} */
