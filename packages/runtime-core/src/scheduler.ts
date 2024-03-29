let queue = [];
let isFlushing = false;
const resolvePromise = Promise.resolve();

export function queueJon(job) {
    if(!queue.includes(job)) {
        queue.push(job)
    }

    if(!isFlushing) { // 批量处理逻辑
        isFlushing = true;
        resolvePromise.then(() => {
            isFlushing = false;
            let copy = queue.slice(0);
            queue.length = 0;
            for(let i = 0; i < copy.length; i++) {
                let job = copy[i];
                job();
            }
            copy.length = 0;
        })
    }
}

