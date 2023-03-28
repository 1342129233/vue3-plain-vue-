import { parse } from './parse';
import { transform } from "./transform";

// 编译
export function compile(template) {
    // 将模版转成抽象语法树 - ast 树
    const ast = parse(template); // 这里需要将html语法转换成js语法;--编译原理;

    // codegen 为了生成代码的时候更方便,在转化过程中会生成这样一个属性;
    // 这里转化,要进行收集所需的方法 如: `createElementVnode toDisplayString`;
    // 这里需要在生成代码之前,再做一些转化;
    // 比如: `<div>{{aa}} 123</div>` 要转成 `createElementVnode('div',toDisplayString(aa) + 123)`;

    // 目前就主要针对: 元素,属性,表达式,文本;
    // 主要就在ast语法树上添加一些属性;
    transform(ast)

    // console.log('ast--->', ast)
    // return ast
    // 对ast语法树进行一些预先处理;
    // transform(ast);//会生成一些信息;

    //代码生成;
    // return generate(ast); // 最终生成代码;和vue2的过程一样;
}

// `openBlock + (_)` 这一类实际上就是手动拼字符串;
