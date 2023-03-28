import { createVnodeCall, NodeTypes } from "./ast";
import { ParseNode } from "./parse";
import { CREATE_ELEMENT_BLOCK, CREATE_ELEMENT_VNODE, FRAGMENT, OPEN_BLOCK, TO_DISPLAY_STRING } from "./runtimeHelpers";
import { ElementCodegenNode, transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

export type TransformContext = {
  currentnode: ParseNode;//当前正在转化的是谁;
  parent: any;//当前转化的父节点是谁;
  helpers: Map<symbol, number>;//记录:使用了多少次那些如`createTextVnode()`之类的方法;//用于优化如: 超过20个相同节点会被字符串化;
  helper(name: symbol): symbol;
  removeHelper(name: symbol): any;
  nodeTransforms: ((node: ParseNode, context: TransformContext) => void | Function)[];
}
function createTransformContext(root: ParseNode) {
  const context: TransformContext = {
    currentnode: root,
    parent: null,
    helpers: new Map(),

    //根据使用过的方法进行优化;
    helper(name) {
      const count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1)
      return name
    },

    removeHelper(name) {
      const count = context.helpers.get(name)
      if (count) {
        const currentCount = count - 1;
        if (!currentCount) {
          context.helpers.delete(name)
        } else {
          context.helpers.set(name, currentCount)
        }
      }
    },

    nodeTransforms: [
      transformElement,//转化元素 返回exit-->转化文本 返回exit -> 执行转化文本exit--> 执行转化元素exit;
      transformText,
      transformExpression,
    ]
  }
  return context
}

function traverse(node: ParseNode, context: TransformContext) {
  context.currentnode = node
  const transforms = context.nodeTransforms
  const exitsFns = []
  for (let i = 0; i < transforms.length; i++) {
    //在执行的时候,有可能这个子节点被删除了;
    const onExit = transforms[i](node, context)
    if (onExit) {
      exitsFns.push(onExit)
    }
    //如果当前节点被删掉了,那么就不考虑儿子了;
    if (!context.currentnode) {
      return
    }
  }



  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      //宏 常量;
      context.helper(TO_DISPLAY_STRING)
      break;
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      //如果有子节点,再遍历子节点;
      for (let i = 0; i < node.children.length; i++) {
        context.parent = node
        traverse(node.children[i] as ParseNode, context)
      }
  }

  context.currentnode = node;//当执行退出函数的时候,保存currentNode指向依旧是对的;
  let i = exitsFns.length
  while (i--) {//与transforms[i](node, context)相反,后进先执行;
    exitsFns[i]()
  }
}

//对根节点如果有两个子节点,则包一层;
function createRootCodegen(ast: ParseNode, context: TransformContext) {
  const { children } = ast
  if (children.length === 1) {
    const child = children[0]
    //如果是元素,还有可能就是一个文本;
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
      ast.codegenNode = child.codegenNode

      //不再调用createElementVnode;//调用的是openBlock createElementBlock;
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(OPEN_BLOCK);
      context.helper(CREATE_ELEMENT_BLOCK);

      ; (ast.codegenNode as ElementCodegenNode).isBlock = true;//只有一个元素,那么当前元素是一个block节点,并且使用的是createElementBlock;


    } else {
      ast.codegenNode = child
    }
  } else {
    if (children.length === 0) {
      //为空时,比如空字符串?
      return
    }

    ast.codegenNode = createVnodeCall(context, context.helper(FRAGMENT), null, children)
    context.helper(OPEN_BLOCK);
    context.helper(CREATE_ELEMENT_BLOCK);
    ast.codegenNode.isBlock = true;
  }
}
export function transform(ast: ParseNode) {
  //对树进行遍历操作;
  const context = createTransformContext(ast)
  traverse(ast, context)

  createRootCodegen(ast, context)
  ast.helpers = [...context.helpers.keys()]
  // console.log('ast.helpers--->', ast.helpers)

  //根据此ast生成代码 靶向更新;

}