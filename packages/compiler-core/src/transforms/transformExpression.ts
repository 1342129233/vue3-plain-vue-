import { NodeTypes } from "../ast"
import { ParseNode } from "../parse"
import { TransformContext } from "../transform"

//用于转化表达式的;
//替换并且增加方法,即可;
export function transformExpression(node: ParseNode, context: TransformContext) {//{{aaa}} -> _ctx.aaa;
  //可以判断入参是不是表达式;
  //console.log('transformExpression--->', node, context)

  if (node.type === NodeTypes.INTERPOLATION) {
    const content = (node.content as ParseNode).content as string
    (node.content as ParseNode).content = `_ctx.${content}`
  }
}