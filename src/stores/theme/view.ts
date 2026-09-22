import type { ThemeMode } from './types'

export function applyThemeMode(m: ThemeMode): void {
  document.documentElement.classList.toggle('dark', m === 'dark')
  document.documentElement.style.colorScheme = m
}
