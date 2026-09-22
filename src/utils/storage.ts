/** LocalStorage codec + storage factory (HOF layer for all persisted state). */

export interface StorageCodec<T> {
  encode: (value: T) => string
  decode: (raw: string) => unknown
  isValid: (value: unknown) => value is T
}

export interface ValueStorage<T> {
  load: () => T | null
  save: (value: T) => void
  clear: () => void
}

export function jsonCodec<T>(isValid: (value: unknown) => value is T): StorageCodec<T> {
  return {
    encode: (value: T): string => JSON.stringify(value),
    decode: (raw: string): unknown => JSON.parse(raw) as unknown,
    isValid,
  }
}

export function stringCodec<T extends string>(
  isValid: (value: unknown) => value is T,
): StorageCodec<T> {
  return {
    encode: (value: T): string => value,
    decode: (raw: string): unknown => raw,
    isValid,
  }
}

/** Create a best-effort localStorage binding. All errors are swallowed. */
export function createStorage<T>(key: string, codec: StorageCodec<T>): ValueStorage<T> {
  function load(): T | null {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) {
        return null
      }
      const parsed = codec.decode(raw)
      if (!codec.isValid(parsed)) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  function save(value: T): void {
    try {
      window.localStorage.setItem(key, codec.encode(value))
    } catch {
      // storage unavailable or quota exceeded — best-effort only
    }
  }

  function clear(): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore — nothing to clear
    }
  }

  return { load, save, clear }
}

/** List-flavored storage: invalid items are filtered, never throws. */
export function createListStorage<T>(key: string, isItem: (value: unknown) => value is T): {
  load: () => T[]
  save: (list: T[]) => void
  clear: () => void
} {
  function isList(value: unknown): value is T[] {
    return Array.isArray(value)
  }
  const codec = jsonCodec<unknown>(isList)
  const base = createStorage<unknown>(key, codec)

  function load(): T[] {
    const raw = base.load()
    if (!Array.isArray(raw)) {
      return []
    }
    const out: T[] = []
    for (const item of raw as unknown[]) {
      if (isItem(item)) {
        out.push(item)
      }
    }
    return out
  }

  function save(list: T[]): void {
    base.save(list)
  }

  function clear(): void {
    base.clear()
  }

  return { load, save, clear }
}
