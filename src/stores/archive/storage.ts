import { createListStorage } from '@utils/storage'
import { SAVES_KEY } from './constants'
import type { SaveEntry } from './types'
import { isSaveEntry } from './validation'

/** HOF: list-storage binding for archive entries (filters invalid items). */
export function makeArchiveStorage(): {
  load: () => SaveEntry[]
  save: (list: SaveEntry[]) => void
  clear: () => void
} {
  return createListStorage<SaveEntry>(SAVES_KEY, isSaveEntry)
}
