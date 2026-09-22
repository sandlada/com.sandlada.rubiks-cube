/** Shared id + router-query helpers (pure). */

export function randomId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 4294967295).toString(36)}`
}

export function firstQuery(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : ''
  }
  return ''
}
