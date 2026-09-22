import type { ThemeMode } from './types'

export function isThemeMode(v: unknown): v is ThemeMode {
  return v === 'light' || v === 'dark'
}
