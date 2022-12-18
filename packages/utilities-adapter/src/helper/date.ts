export function secondFromNow(base: number, time?: number) {
    const b = Math.floor(Date.now() / 1000)
    if (time) return b + time
    return b + base
}
