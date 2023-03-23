export const isObject = (value) => {
    return typeof value === 'object' && value !== null;
}

export const isString = (value) => {
    return typeof value === 'string';
}

export const isNumber = (value) => {
    return typeof value === 'number';
}

export const isFunction = (value) => {
    return typeof value === 'function';
}

export const isArray = Array.isArray;
export const assign = Object.assign;

export const invokeArrayFns = (fns) => {
    for(let i = 0; i < fns.length; i++) {
        fns[i]()
    }
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (value, key) => hasOwnProperty.call(value, key);

// vue3 提供的形状标识
export const enum ShapeFlags {
    // 元素
    ELEMENT = 1,
    // 函数组件
    FUNCTIONAL_COMPONENT = 1 << 1,
    // 带状态组件
    STATEFUL_COMPONENT = 1 << 2,
    // 描述儿子

    TEXT_CHILDREN = 1 << 3,
    // 数组节点
    ARRAY_CHILDREN = 1 << 4,
    // 插槽
    SLOTS_CHILDREN = 1 << 5,
    // 组件
    TELEPORT = 1 << 6,
    SUSPENSE = 1 << 7,
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // keep-alive子节点专用;标识这个组件是keep-alive的子节点,稍后的卸载流程中是假的卸载(keep-alive组件中的自定义方法);
    COMPONENT_KEPT_ALIVE = 1 << 9, // keep-alive子节点专用,表示该子节点初始化的时候,不要走创建新的真实DOM了,而是在缓存中取(keep-alive组件中的自定义方法);
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 组件包含函数式组件与状态组件;
}

/* //位运算:&,|适合权限的组合;
//let user= 增加 | 删除;//user&增加 > 0就说明有权限;
const 有子元素的元素 = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN//1|16=17;
console.log('有子元素的元素--->',有子元素的元素)
const 是否包含子元素数组 = ShapeFlags.ARRAY_CHILDREN & 有子元素的元素
console.log('是否包含子元素数组--->',是否包含子元素数组) */

//模板转成虚拟节点的动态标识;
export const enum PatchFlags {
    TEXT = 1, // 动态文本节点
    CLASS = 1 << 1, // 动态class
    STYLE = 1 << 2, // 动态style
    PROPS = 1 << 3, // 除了class\style动态属性
    FULL_PROPS = 1 << 4, // 有key，需要完整diff
    HYDRATE_EVENTS = 1 << 5, // 挂载过事件的
    STABLE_FRAGMENT = 1 << 6, // 稳定序列，子节点顺序不会发生变化
    KEYED_FRAGMENT = 1 << 7, // 子节点有key的fragment
    UNKEYED_FRAGMENT = 1 << 8, // 子节点没有key的fragment
    NEED_PATCH = 1 << 9, // 进行非props比较, ref比较
    DYNAMIC_SLOTS = 1 << 10, // 动态插槽
    DEV_ROOT_FRAGMENT = 1 << 11, 
    HOISTED = -1, // 表示静态节点，内容变化，不比较儿子
    BAIL = -2 // 表示diff算法应该结束
}
