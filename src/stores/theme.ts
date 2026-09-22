import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const THEME_KEY = 'rubiks.theme.v1'

function isThemeMode(v: unknown): v is ThemeMode {
  return v === 'light' || v === 'dark'
}

function applyMode(m: ThemeMode): void {
  document.documentElement.classList.toggle('dark', m === 'dark')
  document.documentElement.style.colorScheme = m
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light')

  function setMode(m: ThemeMode): void {
    mode.value = m
    try {
      window.localStorage.setItem(THEME_KEY, m)
    } catch {
      // storage unavailable — theme stays in memory only
    }
    applyMode(m)
  }

  function toggleMode(): void {
    setMode(mode.value === 'light' ? 'dark' : 'light')
  }

  function initTheme(): void {
    let stored: ThemeMode = 'light'
    try {
      const raw = window.localStorage.getItem(THEME_KEY)
      if (isThemeMode(raw)) {
        stored = raw
      }
    } catch {
      // storage unavailable — fall back to light
    }
    mode.value = stored
    applyMode(stored)
  }

  return {
    mode,
    setMode,
    toggleMode,
    initTheme,
  }
})
