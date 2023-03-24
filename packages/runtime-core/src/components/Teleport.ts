import { isNumber, isString } from "@vue/shared";
import { createVnode } from "../vnode";

export const TeleportImpl = {
    __isTeleport: true, // 标识是否为传送门组件
    process(n1, n2, container, anchor = null, internals) {
        // 处理传送门组件;
        // 新添加的子节点是字符串或数字时
        for(let index = 0; index < n2.children?.length; index++) {
            if(isString(n2.children[index]) || isNumber(n2.children[index])) {
                const vnode = createVnode(Text, null, String(n2.children[index]));
                n2.children[index] = vnode;
            }
        }

        const { mountChildren, patchChildren, move } = internals;
        if(!n1) {
            const target = document.querySelector(n2.props.to);
            if(target) {
                // 创建子元素递归
                mountChildren(n2.children, target);
            }
        } else {
            patchChildren(n1, n2, container); // 子组件内容变化; 这个时候还是发生在老容器中的;
            if (n2.props.to !== n1.props.to) {
                const nextTarget = document.querySelector(n2.props.to);

                n2.children.forEach((child) => {
                    // 将更新后的孩子放到新的容器里 移动到新的容器中;
                    // 这里没对文本和数字做处理,可以自己手动处理一下,但目前先用vnode写法;
                    // ...
                    move(child, nextTarget)
                });
            }
        }
    }
}

export const isTeleport = (type: any) => type.__isTeleport
