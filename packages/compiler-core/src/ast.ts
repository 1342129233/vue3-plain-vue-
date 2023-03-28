import { PatchFlags } from "@vue/shared";
import { ParseNode } from "./parse";
import { CREATE_ELEMENT_VNODE, CREATE_TEXT } from "./runtimeHelpers";
import { TransformContext } from "./transform";
import { ChildrenNode, ElementCodegenNode, PropertyObject, PropsExpression } from "./transforms/transformElement";
import { TextCodegenNode } from "./transforms/transformText";

//ast语法树相关type;
export const enum NodeTypes {
    ROOT, // 根节点 Fragment;
    ELEMENT, // 元素;
    TEXT, // 文本;
    COMMENT, // 注释;
    SIMPLE_EXPRESSION, // 简单表达式--如: :a="aaa"中的aaa;
    INTERPOLATION,  // 插值--模版表达式--如{{aaa}};
    ATTRIBUTE, // 属性;
    DIRECTIVE, // 指令;
    // containers
    COMPOUND_EXPRESSION, // 复合表达式--如:{{aa}}abc;
    IF,//v-if?
    IF_BRANCH, //if分支?
    FOR,//v-for?
    TEXT_CALL,//文本调用;
    //codegen;
    VNODE_CALL,//元素调用;
    JS_CALL_EXPRESSION,//js调用表达式;
    //还有很多,这里没写完;
    JS_OBJECT_EXPRESSION,
}


export function createCallExpression(context: TransformContext, args: (string | ParseNode | PatchFlags)[]): TextCodegenNode {
    const callee = context.helper(CREATE_TEXT)
    return {
      callee,
      type: NodeTypes.JS_CALL_EXPRESSION,
      arguments: args,
    }
  }
  
  export function createObjectExpression(properties: PropertyObject[]): PropsExpression {
    return {
      type: NodeTypes.JS_OBJECT_EXPRESSION,
      properties,
    }
  }
  
  export function createVnodeCall(context: TransformContext, vnodeTag: string | symbol, propsExpressio: PropsExpression, childrenNode: ChildrenNode): ElementCodegenNode {
    context.helper(CREATE_ELEMENT_VNODE)
    // console.log('context.helpers--->', context.helpers)
    return {
      type: NodeTypes.VNODE_CALL,
      tag: vnodeTag,
      props: propsExpressio,
      children: childrenNode
    }
  }
  
  //TEXT_CALL -> 文本的意思; JS_CALL_EXPRESSION 调用文本表达式;
  //VNODE_CALL -> 元素; JS_OBJECT_EXPRESSION属性;
