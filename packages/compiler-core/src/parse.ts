//主要是把template中的代码编译成render()函数-render()函数中VNode的是用模版来写的,而不是h()函数生成的;

import { PatchFlags } from "@vue/shared";
import { NodeTypes } from "./ast";
import { ElementCodegenNode } from "./transforms/transformElement";
import { TextCodegenNode } from "./transforms/transformText";

/* type TemplateContext = {
  line: number;//第几行;
  column: number;//第几列;
  offset: number;//偏移量;
  source: string;//当前要被解析模版,此字段会被不停地进行解析,会slice()一直被截短;//内容为空,说明已经解析结束;
  originalSource: string;//原模版,此字段是原模版,不会被解析;
} */

type TemplateContext = {
  source: string;//当前要被解析模版,此字段会被不停地进行解析,会slice()一直被截短;//内容为空,说明已经解析结束;
  originalSource: string;//原模版,此字段是原模版,不会被解析;
} & CursorObject
//创建当前
function createParserContext(template: string): TemplateContext {
  const theContext: TemplateContext = {
    line: 1,
    column: 1,
    offset: 0,
    source: template,
    originalSource: template,
  };
  return theContext
}


function isEnd(context: TemplateContext) {
  const source = context.source

  //以闭合标签为开始时;
  if (context.source.startsWith(`</`)) {
    return true
  }

  return !source;//没有内容时;
}

//行列游标信息,用来报错之类的用到;
type CursorObject = {
  line: number;//第几行;
  column: number;//第几列;
  offset: number;//偏移量;
}

//得到当前上下文的游标信息,用于报错提示之类的;
//getCursor 获取位置的信息,根据当前的上下文;
function getCursor(context: TemplateContext): CursorObject {
  const { line, column, offset } = context
  return { line, column, offset }
}

//更新最新的行列及偏移量信息及源内容和更新后内容;
//advancePositionWithMutation 更新信息;
function advancePositionWithMutation(context: CursorObject | TemplateContext, source: string, endIndex: number) {
  let linesCount = 0;
  let linePos = -1;
  for (let i = 0; i < endIndex; i++) {
    if (source.charCodeAt(i) === 10) {
      //console.log('i--->', i)
      linesCount++

      linePos = i;
    }
  }
  context.line = context.line + linesCount

  //偏移量,删掉多少加多少;
  context.offset = context.offset + endIndex

  //等于-1,说明没有换行过;而这些文本前,可能就是个标签,所以要加之前的;
  //如果换行过,那么linePos必定是上一行中换行符的角标;
  context.column = linePos === -1 ? context.column + endIndex : endIndex - linePos
  //console.log('linePos--->', linePos)
  // debugger
}
/* 12312321231
    123456789

12312321231123456789    */

//把当前上下文的当前模版在结束角标前的文本截去;
//advanceBy 会进行前进删除;
function advanceBy(context: TemplateContext, endIndex: number) {
  //每次删掉内容的时候,都要更新最新的行列和偏移量信息;
  const source = context.source
  advancePositionWithMutation(context, source, endIndex)
  context.source = source.slice(endIndex)
}


//截取当前上下文的文本内容;
//parseTextData 处理文本内容,并且会更新最新的偏移量信息;
function parseTextData(context: TemplateContext, endIndex: number) {
  const rawText = context.source.slice(0, endIndex)
  advanceBy(context, endIndex)
  // debugger
  return rawText
}

//位置信息;
type SelectionObject = {
  start: CursorObject;//第几行;
  end: CursorObject;
  source: string;
}
//getSelection 获取当前开头和结尾的位置;
function getSelection(context: TemplateContext, start: CursorObject, end?: CursorObject) {
  end = end || getCursor(context)
  //console.log(start.offset, end.offset)
  const theReturn: SelectionObject = {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
  return theReturn
}
export type CodegenNode = TextCodegenNode | ElementCodegenNode | ParseNode
export type ParseNode = {
  type: NodeTypes;//节点类型;
  content?: string | ParseNode;//节点内容;
  tag?: string;//标签类型;
  isSelfClosing?: boolean;//是否标签自闭合;
  children?: ParseNode[],//儿子节点;//在COMPOUND_EXPRESSION时,string是用于拼接的;
  props?: ElementProp[],//属性;
  loc?: SelectionObject;//位置信息;//在COMPOUND_EXPRESSION时,没有loc?
  codegenNode?: CodegenNode,
  helpers?: symbol[];
}

function parseText(context: TemplateContext) {
  //在解析文本的;
  const endTokens = [`<`, `{{`]//结束标识列表;
  //asafs{{d<jfhlaksdjhalkjfhd;sjfh;
  let endIndex = context.source.length//默认为到最后结束;
  for (let i = 0; i < endTokens.length; i++) {
    //看结束标识第一次出现的地方;
    //因为进入parseText的第一个角标0,必定不是结束标识;
    const index = context.source.indexOf(endTokens[i], 1)
    //找到了,并且第一次比整个字符串小;
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  //创建 行列信息;
  const start = getCursor(context)//开始;

  //取内容;
  const content = parseTextData(context, endIndex)
  //debugger
  const theParseNode: ParseNode = {
    type: NodeTypes.TEXT,//类型;
    content: content,//内容;
    loc: getSelection(context, start),//位置信息;
  }

  return theParseNode
  //再获取结束的位置;

  //debugger
}


//getCursor 获取位置的信息,根据当前的上下文;
//parseTextData 处理文本内容,并且会更新最新的偏移量信息;
//advancePositionWithMutation 更新信息;
//getSelection 获取当前开头和结尾的位置;
//advanceBy 会进行前进删除;

//处理表达式的信息;
function parseInterpolation(context: TemplateContext) {
  const start = getCursor(context)//`{{  xxx  }}`;
  //const closeIndex = context.source.indexOf('}}', '{{'.length)//查找结束的大括号;
  const closeIndex = context.source.indexOf('}}', 2)//查找结束的大括号;

  advanceBy(context, 2);//`  xxx  }}`;

  const innerStart = getCursor(context);//用来记录表达式去掉了`{{`时的游标;
  const innerEnd = getCursor(context);//后面再: advancePositionWithMutation;

  //拿到原始的内容;
  const rawContentLength = closeIndex - 2;//原始内容的长度,这个是减去了`  xxx  }}`中的`}}`;
  const preContent = parseTextData(context, rawContentLength)//`  xxx  `;//可以返回文本内容,并且是可以更新信息;//此时context为`}}`;
  const content = preContent.trim()//`xxx`;
  const startOffset = preContent.indexOf(content)

  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, preContent, startOffset)
  }
  const endOffset = startOffset + content.length
  advancePositionWithMutation(innerEnd, preContent, endOffset)

  advanceBy(context, 2)

  const theParseNode: ParseNode = {
    type: NodeTypes.INTERPOLATION,//表达式;
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start),//位置信息;
  }

  return theParseNode
}

//上下文去掉前方的空格等空字符;
function advanceBySpaces(context: TemplateContext) {
  //const theRegExp = /^[ \t\r\n]{1,}/
  const theRegExp = /^[ \t\r\n]+/
  const match = theRegExp.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

function parseAttributeValue(context: TemplateContext) {
  const start = getCursor(context)
  const quote = context.source[0];
  let content: string
  if (quote === `"` || quote === `'`) {
    // debugger
    //有引号的;
    advanceBy(context, 1)//去除前引号;
    const endIndex = context.source.indexOf(quote)
    content = parseTextData(context, endIndex)
    advanceBy(context, 1)//去除后引号;
  }/*  else {
    //没引号的暂时不考虑;
    const endIndex1 = context.source.indexOf(`/`)
    const endIndex2 = context.source.indexOf(`>`)
    const endIndex3 = context.source.indexOf(` `)
    const endIndex4 = context.source.indexOf(`\n`)
    const endIndex5 = context.source.indexOf(`\r`)
    const endIndex = [endIndex1, endIndex2, endIndex3, endIndex4, endIndex5].sort()[0]
    content = parseTextData(context, endIndex)
  } */

  return {
    content,
    loc: getSelection(context, start)
  }
}


type ElementProp = {
  type: NodeTypes;
  name: string;//属性名称;
  value: {
    content: string;//属性值内容;
    loc: SelectionObject;
    type: NodeTypes;
  };
  loc: SelectionObject;
}
//处理单个节点;
function parseAttribute(context: TemplateContext) {
  const start = getCursor(context)

  //属性的名字;
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)

  const name = match[0]

  //单属性的 如disabeld`不考虑先; 考虑`a=1`这种;
  advanceBy(context, name.length)//有可能 `a = 1`?也有可能`a = '1'`;也有可能`a = "1"`;
  // debugger
  advanceBySpaces(context)
  advanceBy(context, 1)//删除等号?
  const value = parseAttributeValue(context)

  //debugger
  const theReturn: ElementProp = {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      ...value,
    },
    loc: getSelection(context, start)
  }
  return theReturn


}
//处理多个属性;
function parseAttributes(context: TemplateContext) {//`a=1 b=2 >`;
  const props: ElementProp[] = []

  //目前不考虑如`<div asdsad=1/>` input这类标签了;
  //无内容时停止循环,初始为`>`时停止循环;
  while (context.source.length > 0 && !context.source.startsWith(`>`) && !context.source.startsWith(`/>`)) {
    const prop = parseAttribute(context)
    //debugger
    props.push(prop)
    advanceBySpaces(context)
  }


  return props;
}

/* type ElementNode = {
  type: NodeTypes;
  tag: string;
  isSelfClosing: boolean;
  loc: SelectionObject;
} */
function parseTag(context: TemplateContext) {
  //进入进来标签若为: `<div    />`;则先删除`<div`,再删除`    `,再删除`/>`;
  const start = getCursor(context)
  //正则可以在: [正则表达式示意图查看网站](https://regexper.cn/)上看;
  //const theRegExp = /^<\/?([a-z][^ \t\r\n/>]*)/;
  //const theRegExp = /^[<][/]{0,1}([a-z][^ \t\r\n/>]*)/;
  const theRegExp = /^[<][/]{0,1}([a-z][^ \t\r\n/>]*)/;
  const match = theRegExp.exec(context.source)
  const tag = match[1];//标签名: div <div  aa=1  >;
  advanceBy(context, match[0].length);//删除整个标签;
  advanceBySpaces(context)

  //标签有两种: `<div></div>` `<div/>`;
  //可能有属性;
  const props = parseAttributes(context)



  const isSelfClosing = context.source.startsWith(`/>`)//是否是自闭合标签;
  advanceBy(context, isSelfClosing ? 2 : 1)//自闭合标签删2个字符,非自闭合删除1个;

  const theReturn: ParseNode = {
    type: NodeTypes.ELEMENT,
    tag: tag,
    isSelfClosing,
    children: [],
    props,
    loc: getSelection(context, start)
  }

  return theReturn

  //`<div></div>`;

}

//处理标签的信息;
function parseElement(context: TemplateContext) {
  //解析标签: 有: `<br/>` `<div asdsad="333" disabled >  </div>`

  //假设有: `<div></div>`;
  const ele = parseTag(context)//先干掉`<div></div>`中的`<div>`;

  //儿子;
  const children = parseChildren(context)//处理儿子的时候,可能没有儿子;

  //`</div>`;
  if (context.source.startsWith(`</`)) {
    //直接干掉如: `<div></div>`中的`</div>`;
    //其实也有返回的,但没有用到它的返回;
    parseTag(context)
  }

  ele.loc = getSelection(context, ele.loc.start)//计算最新的位置信息;
  ele.children = children;//挂载儿子节点;


  const theParseNode: ParseNode = ele

  return theParseNode
}



//将html语法转换成js语法;
//因为vue有自己的指令,插槽,动态表示如{{}},所以vue自己实现了,也更详细及精细一些;
export function parse(template: string) {
  //创建一个解析的上下文来进行处理;
  const context = createParserContext(template)
  //debugger

  //return parseChildren(context)

  const start = getCursor(context)//未解析前的游标;
  const children = parseChildren(context)//解析当前模板,会改变context;
  const theLoc = getSelection(context, start)//解析后的位置信息;
  const node = createRoot(children, theLoc)
  return node
}

//给子节点列表包一层根节点-Fragment类型的节点;
function createRoot(children: ParseNode[], loc: SelectionObject) {
  const theParseNode: ParseNode = {
    type: NodeTypes.ROOT,//Fragment;
    children,
    loc,
  }
  return theParseNode
}

function parseChildren(context: TemplateContext) {
  //< 元素;
  //{{}} 说明表达式;
  //其它就是文本;
  //目前不考虑其它;如动态指令,动态事件,动态指令之类的目前不考虑;
  const nodes: ParseNode[] = []
  while (!isEnd(context)) {
    const source = context.source
    let node: ParseNode
    if (source.startsWith('{{')) {
      //说明表达式;
      //{{  xxx   }};
      /* {{  
        
        xxx   
      
      }}; */
      node = parseInterpolation(context)
    } else if (source[0] === '<') {
      //元素-标签;
      //break
      node = parseElement(context)
    }

    //文本;
    //暂时不考虑其它,如注释之类的;
    if (!node) {//`  {{aa}}  aaa {{bbb}}  `
      node = parseText(context)
      //break
    }
    nodes.push(node)
    //console.log(nodes)
    //break
  }
  //console.log(nodes)

  //去除为全为空格之类的文本节点;
  nodes.forEach((item, index) => {
    if (item.type === NodeTypes.TEXT) {
      //const theRegExp = /^\t\r\n\f /;//个人感觉不太对;
      // debugger
      const theRegExp = /^[\t\r\n\f ]{1,}$/;
      //个人觉得`!/[^\t\r\n\f ]/.test(item.content as string)`不太好记,它的意思是`非 拥有除空格之外其它字符的 字符串`;
      if (theRegExp.test(item.content as string)) {
        nodes[index] = null
      }
    }
  })

  const theReturn = nodes.filter(Boolean)
  //Boolean是一个函数;Boolean(vaue)=>boolean;
  //相当于`nodes.filter(Boolean)` -> `nodes.filter(Boolean(item))` -> `nodes.filter((item)=>Boolean(item))` -> `nodes.filter((item)=>{return Boolean(item)})`;

  return theReturn
}