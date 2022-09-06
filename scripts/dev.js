// minimist 用来解析命令行参数
const args = require('minimist')(process.argv.splice(2)); // node scripts/dev.js reactivity -f global
const { build } = require('esbuild');
const { resolve } = require('path');

const target = args._[0] || 'reactivity';
const format = args.f || 'global';

// 开发环境只打包某一个
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));

// iife 立即执行函数
// cjs node 中的模块 modul.exports
// esm 浏览器中的 esModule 模块 import
const outpuFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm';

const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`);

build({
    entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
    outfile,
    bundle: true, // 把所有的包全部打包到一起
    sourcemap: true,
    format: outpuFormat, // 输出的格式
    globalName: pkg.buildOptions?.name, // 打包的全局的名字
    platform: format === 'cjs' ? 'node' : 'browser', // 平台
    watch: { // 监控文件变化
        onRebuild(error) {
            if(!error) console.log(`rebuilt~~~`)
        }
    }
}).then(() => {
    console.log('watching~~~');
})
