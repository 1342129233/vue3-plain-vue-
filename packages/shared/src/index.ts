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
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
    COMPONENT_KEPT_ALIVE = 1 << 9,
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
