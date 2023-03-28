import { PatchFlags } from "@vue/shared"
import { createCallExpression, NodeTypes } from "../ast"
import { ParseNode } from "../parse"
import { TransformContext } from "../transform"


//查看一个节点是否是文本;
export function isText(node: any) {
  return node?.type === NodeTypes.INTERPOLATION || node?.type === NodeTypes.TEXT
}

export type TextCodegenNode = {
  callee: any;
  type: NodeTypes;
  arguments: (string | ParseNode | PatchFlags)[];
}
export type TextCodegenChildren = null | {
  type: NodeTypes.COMPOUND_EXPRESSION;
  children: (ParseNode | string)[];
}

//用于转化文本的;
export function transformText(node: ParseNode, context: TransformContext) {
  //可以判断入参是不是文本;
  //console.log('transformText--->', node, context)

  //当期望 将多个子节点拼接在一起;
  //if(node.type===2){}//不行;
  //需要遇到元素的时候,才能处理多个子节点; //比如: {{ aaa }} + aaa;

  // console.log(`进入2`)
  if (node.type === NodeTypes.ELEMENT || node.type === NodeTypes.ROOT) {
    //退出函数;
    return () => {
      // console.log(`退出2`)
      //{{aaa}} abc -> 组合的表达式 COMPOUND_EXPRESSION;
      //console.log('node.children--->', node.children)
      //5:表达式 + 2:文本 -> COMPOUND_EXPRESSION 最后只需要创建的时候创建一个节点就可以了;
      //需要查找连续的2和5,将他们拼接在一起;
      let currentContainer: TextCodegenChildren = null;//临时用于拼接成`组合的表达式 COMPOUND_EXPRESSION`的;
      const children = node.children//子节点,可能会变动;不过这一层必定为ParseNode;
      let hasText = false//是否有文本?
      for (let i = 0; i < children.length; i++) {
        const child = children[i];//拿到第一个孩子;

        //hasText = true
        if (isText(child)) {

          hasText = true

          //看下一个节点是不是文本;
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                }
              }
              //直接将下一个节点和第一个节点拼接在一起;
              currentContainer.children.push(`+`, next)
              children.splice(j, 1);//删除拼接的节点;
              j--;
              //createElementVnode(div,toDisplayString(_ctx.aaa) + '123');//创建一个NodeTypes.COMPOUND_EXPRESSION时;
              //createElementVnode(div,[toDisplayString(_ctx.aaa) + '123',createElementVnode(),toDisplayString(_ctx.aaa) + '123']);//compile(`<div>{{aaa}}   123  <span></span>  123 {{aa}}  </div>`)时;

            } else {
              currentContainer = null
              break
            }
          }
        }
      }

      //如果只有一个节点,则直接不处理?
      if (!hasText || children.length === 1) {//直接意思为: `没有文本 或 长度为1`,直接退出;
        return
      }

      //debugger
      //patchFlag 元素里有一个文本 {{aa}} 标识位应该是一个文本;


      //有文本,并且长度不为1,才执行下面的;
      //有文本,并且是多个子元素才要处理;


      //需要给多个儿子中的创建文本节点添加patchFlag;
      for (let i = 0; i < children.length; i++) {
        const child = children[i]

        const callArgs: (string | ParseNode | PatchFlags)[] = []
        //createTextVnode('123');
        if (isText(child) || (child as ParseNode).type === NodeTypes.COMPOUND_EXPRESSION) {
          //都是文本;
          callArgs.push(child)
          if (node.type !== NodeTypes.TEXT) {
            //动态节点;
            callArgs.push(PatchFlags.TEXT)//靶向更新;
          }

          children[i] = {//添加一个createTextVnode这个方法;
            type: NodeTypes.TEXT_CALL,//通过createTextVnode来实现;
            content: child,
            codegenNode: createCallExpression(context, callArgs)
          }
        }

      }
    }
  }
}
