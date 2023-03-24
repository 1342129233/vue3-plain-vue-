export { createRenderer } from './renderer';

export { h } from './h';

export * from './vnode';

// 是为了让VueRuntimeDOM也可以拿到'@vue/reactivity'导出的变量和方法;
// '@vue/reactivity'是'/packages/reactivity/'目录打包出来的东西;
// '@vue/***'是'tsconfig.json'中配置的,用于TypeScript提示;
export * from '@vue/reactivity';

// 生命周期相关api;
export * from './apiLifeCycle'

// Vue组件相关api;
export * from './component'

// 依赖注入相关api;
export * from './apiInject'

//传送门组件相关api;
export { TeleportImpl as Teleport } from './components/Teleport'

// KeepAlive组件相关api;
export { KeepAliveImpl as KeepAlive } from './components/KeepAlive'

//异步组件相关api
export * from './defineAsyncComponent'
