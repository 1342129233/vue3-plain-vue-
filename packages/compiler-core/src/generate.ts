import { NodeTypes } from "./ast";
import { CodegenNode, ParseNode } from "./parse";
import { helperMap, TO_DISPLAY_STRING } from "./runtimeHelpers";


export type CodegenContext = {
  code: string;
  helper(name: symbol): string;
  push(code: string): void;
  indentLevel: number;
  indent(): void;
  deindent(whithoutNewLine?: boolean): void;
  newline(): void;
}
function createCodegenContext(ast: ParseNode) {
  const context: CodegenContext = {
    code: '',//最后的生成结果;
    helper(name: symbol) {
      return `${helperMap[name]}`
    },
    push(code: string) {
      context.code = context.code + code
    },
    indentLevel: 0,//缩进层级;
    indent() {//向后缩进;
      ++context.indentLevel
      context.newline()
    },
    deindent(whithoutNewLine = false) {//向前缩进;
      if (whithoutNewLine) {
        --context.indentLevel
      } else {
        --context.indentLevel
        context.newline()
      }
    },
    newline() {
      newline(context.indentLevel)
    },
  }
  function newline(n: number) {
    context.push('\n' + '  '.repeat(n))

  }

  return context
}

//生成函数序言;//即要导入的东西;
function genFunctionPreable(ast: ParseNode, context: CodegenContext) {
  // console.log('ast.helpers--->', ast.helpers)
  // console.log('ast.helpers.keys().length--->', ast.helpers.keys().length)
  // console.log('ast.helpers.keys()--->', ast.helpers.keys())//[].keys()返回的是一个迭代器,没长度;
  // console.log('ast.helpers.length--->', ast.helpers.length)
  if (ast.helpers.length > 0) {

    context.push(`import { ${ast.helpers.map(h => `${context.helper(h)} as _${context.helper(h)}`).join(',')} } from "vue" `)
    context.newline();
  }
  context.push(`export `)
}

//处理文本;
function genText(node: CodegenNode, context: CodegenContext) {
  context.push(JSON.stringify((node as ParseNode).content))
}

//处理复合表达式;
function genInterpolation(node: CodegenNode, context: CodegenContext) {
  context.push(`${helperMap[TO_DISPLAY_STRING]}(`)//{{}} {{xxx}}
  // debugger

  genNode((node as ParseNode).content as ParseNode, context)
  context.push(`)`)
}

//处理简单表达式;
function genExpression(node: CodegenNode, context: CodegenContext) {
  context.push((node as ParseNode).content as string)
}

function genNode(node: CodegenNode, context: CodegenContext) {
  switch (node.type) {
    case NodeTypes.TEXT:
      // debugger
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
      //元素 -> 元素对象 -> 元素的儿子 递归;

      //fragment也要处理;

      //可看源码中的`/core//packages/compiler-core/src/codegen.ts`中的`function genNode`里;
      //vite 编译 .vue文件;实际上编译成了[vue模版生成vue模版函数](https://vue-next-template-explorer.netlify.app/)中的vue模版函数;
      //这里实际上也是把模版转成vue模板函数;
  }
}

export function generate(ast: ParseNode) {
  const context = createCodegenContext(ast)

  // context.push('var a = 1')
  // context.indent()
  // context.push('var b = 2')
  // // context.deindent()
  // // context.deindent(true)
  // context.deindent()
  // context.push('aaa')
  // // console.log('context.code--->', context.code)
  // console.log(context.code)

  const { push, indent, deindent } = context

  genFunctionPreable(ast, context)

  // console.log(context.code)

  const functionName = 'render';
  const args = ['_ctx', '_cache', '$props']
  push(`function ${functionName}(${args.join(',')}){`)
  indent()
  push(`return `)

  // console.log('ast.codegenNode--->', ast.codegenNode)
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    // debugger
    push(`null`)
  }

  // debugger

  deindent()
  push('}')
  console.log(context.code)
}