import type { SaveEntry } from './types'

export function isSaveEntry(v: unknown): v is SaveEntry {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const o = v as Record<string, unknown>
  return (
    typeof o['id'] === 'string' &&
    typeof o['name'] === 'string' &&
    typeof o['createdAt'] === 'number' &&
    Array.isArray(o['stickers']) &&
    Array.isArray(o['moves'])
  )
}

export function isSaveEntryList(v: unknown): v is SaveEntry[] {
  return Array.isArray(v)
}
