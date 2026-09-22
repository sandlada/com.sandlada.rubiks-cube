import { randomId } from '@utils/query'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { makeArchiveStorage } from './storage'
import type { SaveEntry } from './types'

const archiveStorage = makeArchiveStorage()

function readStored(): SaveEntry[] {
  return archiveStorage.load()
}

export const useArchiveStore = defineStore('archive', () => {
  const entries = ref<SaveEntry[]>(readStored())

  function persist(): void {
    archiveStorage.save(entries.value)
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
