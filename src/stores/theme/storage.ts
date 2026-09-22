import { createStorage, stringCodec } from '@utils/storage'
import { THEME_KEY } from './constants'
import type { ThemeMode } from './types'
import { isThemeMode } from './validation'

/** HOF: raw-string storage binding (keeps backward compat with stored values). */
export function makeThemeStorage(): {
  load: () => ThemeMode | null
  save: (value: ThemeMode) => void
  clear: () => void
} {
  return createStorage<ThemeMode>(THEME_KEY, stringCodec(isThemeMode))
}
