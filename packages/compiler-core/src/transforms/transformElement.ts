
import { createObjectExpression, createVnodeCall, NodeTypes } from "../ast"
import { ParseNode } from "../parse"
import { TransformContext } from "../transform"


export type PropertyObject = {
  key: string;
  value: string;
}
export type PropsExpression = {
  type: NodeTypes;
  properties: PropertyObject[];
}


export type ElementCodegenNode = {
  type: NodeTypes;
  tag: string | symbol;
  props: PropsExpression;
  children: ChildrenNode;
  isBlock?: boolean;//是否是block节点;
}

export type ChildrenNode = null | ParseNode | (string | ParseNode)[]
//用于转化元素的;
export function transformElement(node: ParseNode, context: TransformContext) {//类似于: patchClass与patchStyle;
  //可以判断入参量是不是元素;
  //console.log('transformElement--->', node, context)

  //期望 给所有儿子处理完后,给元素重新添加children属性;

  // console.log(`进入1`)
  if (node.type === NodeTypes.ELEMENT) {
    //退出函数;
    return () => {
      // console.log(`退出1`)

      //createElementVnode('div',{},孩子);

      const vnodeTag = `"${node.tag}"`

      //debugger

      const properties: PropertyObject[] = []
      const props = node.props
      for (let i = 0; i < props.length; i++) {
        const theProperty: PropertyObject = {
          key: props[i].name,
          value: props[i].value.content
        }
        properties.push(theProperty)
      }
      // console.log('props--->', props)
      // console.log('properties--->', properties)

      //debugger

      //创建一个属性的表达式;
      const propsExpression = properties.length > 0 ? createObjectExpression(properties) : null

      //需要考虑孩子的情况 直接是一个节点;
      // debugger
      if (node.children.length === 1) {
        const child = node.children[0]
      }

      let childrenNode: ChildrenNode = null
      if (node.children.length === 1) {
        childrenNode = node.children[0] as ParseNode
      } else if (node.children.length > 1) {
        childrenNode = node.children
      }

      //createElementVnode
      node.codegenNode = createVnodeCall(context, vnodeTag, propsExpression, childrenNode)

    }
  }
}