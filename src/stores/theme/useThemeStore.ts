import { defineStore } from 'pinia'
import { ref } from 'vue'
import { makeThemeStorage } from './storage'
import type { ThemeMode } from './types'
import { applyThemeMode } from './view'

const themeStorage = makeThemeStorage()

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light')

  function setMode(m: ThemeMode): void {
    mode.value = m
    themeStorage.save(m)
    applyThemeMode(m)
  }

  function toggleMode(): void {
    setMode(mode.value === 'light' ? 'dark' : 'light')
  }

  function initTheme(): void {
    const stored = themeStorage.load()
    const next: ThemeMode = stored ?? 'light'
    mode.value = next
    applyThemeMode(next)
  }

  return {
    mode,
    setMode,
    toggleMode,
    initTheme,
  }
})
