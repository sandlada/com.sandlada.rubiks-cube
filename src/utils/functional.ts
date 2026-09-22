/** Shared functional helpers: pipe / compose / memoize. */

export function pipe<T>(value: T): T
export function pipe<T, A>(value: T, f1: (v: T) => A): A
export function pipe<T, A, B>(value: T, f1: (v: T) => A, f2: (v: A) => B): B
export function pipe<T, A, B, C>(value: T, f1: (v: T) => A, f2: (v: A) => B, f3: (v: B) => C): C
export function pipe(value: unknown, ...fns: Array<(v: never) => unknown>): unknown {
  let out: unknown = value
  for (const fn of fns) {
    out = fn(out as never)
  }
  return out
}

export function compose<A, B, C>(f: (v: B) => C, g: (v: A) => B): (v: A) => C {
  return (v: A) => f(g(v))
}

/** Memoize a unary pure function (single-arg cache). */
export function memoizeOne<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>()
  return (arg: A): R => {
    const hit = cache.get(arg)
    if (hit !== undefined) {
      return hit
    }
    const out = fn(arg)
    cache.set(arg, out)
    return out
  }
}

/** Run fn at most once, cache the result. */
export function once<T>(fn: () => T): () => T {
  let done = false
  let out = undefined as unknown as T
  return (): T => {
    if (!done) {
      out = fn()
      done = true
    }
    return out
  }
}
