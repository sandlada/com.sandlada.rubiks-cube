import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameSnapshot } from './game'

export interface SaveEntry extends GameSnapshot {
  name: string
  createdAt: number
}

export const SAVES_KEY = 'rubiks.saves.v1'

function randomId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 4294967295).toString(36)}`
}

function isSaveEntry(v: unknown): v is SaveEntry {
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

function readStored(): SaveEntry[] {
  try {
    const raw = window.localStorage.getItem(SAVES_KEY)
    if (raw === null) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    const out: SaveEntry[] = []
    for (const item of parsed as unknown[]) {
      if (isSaveEntry(item)) {
        out.push(item)
      }
    }
    return out
  } catch {
    return []
  }
}

export const useArchiveStore = defineStore('archive', () => {
  const entries = ref<SaveEntry[]>(readStored())

  function persist(): void {
    try {
      window.localStorage.setItem(SAVES_KEY, JSON.stringify(entries.value))
    } catch {
      // storage unavailable — archive stays in memory only
    }
  }

  function findMany(): SaveEntry[] {
    return entries.value.slice().sort((a, b) => b.createdAt - a.createdAt)
  }

  function findOneById(id: string): SaveEntry | undefined {
    return entries.value.find((e) => e.id === id)
  }

  function insertOne(entry: SaveEntry): SaveEntry {
    const id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : randomId()
    const createdAt =
      typeof entry.createdAt === 'number' && entry.createdAt !== 0 ? entry.createdAt : Date.now()
    const full: SaveEntry = {
      ...entry,
      id,
      createdAt,
    }
    entries.value.push(full)
    persist()
    return full
  }

  function removeOneById(id: string): void {
    entries.value = entries.value.filter((e) => e.id !== id)
    persist()
  }

  function updateOneById(id: string, patch: Partial<SaveEntry>): void {
    const target = entries.value.find((e) => e.id === id)
    if (target === undefined) {
      return
    }
    Object.assign(target, patch)
    persist()
  }

  return {
    entries,
    findMany,
    findOneById,
    insertOne,
    removeOneById,
    updateOneById,
  }
})
