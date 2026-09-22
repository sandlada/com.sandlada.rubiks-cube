import { easeInOutCubic } from './math'

/** FIFO queue factory (HOF): owns the pending-move list. */
export function createFifoQueue<T>(): {
  push: (item: T) => void
  shift: () => T | undefined
  spliceAll: () => T[]
  size: () => number
  isEmpty: () => boolean
} {
  let items: T[] = []

  function push(item: T): void {
    items.push(item)
  }

  function shift(): T | undefined {
    return items.shift()
  }

  function spliceAll(): T[] {
    const out = items
    items = []
    return out
  }

  function size(): number {
    return items.length
  }

  function isEmpty(): boolean {
    return items.length === 0
  }

  return { push, shift, spliceAll, size, isEmpty }
}

/** HOF: bind an easing curve to a tween interpolator. */
export function withEasing(
  ease: (t: number) => number = easeInOutCubic,
): (from: number, to: number, t: number) => number {
  return (from: number, to: number, t: number): number => {
    const clamped = Math.min(Math.max(t, 0), 1)
    return from + (to - from) * ease(clamped)
  }
}

export const interpolateAngle = withEasing(easeInOutCubic)
