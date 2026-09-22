<template>
  <div
    class="flex items-center gap-2"
    role="group"
    :aria-label="t('common.theme')"
  >
    <span class="text-[11px] font-light uppercase tracking-[0.25em] text-neutral-500 dark:text-white/50">
      {{ t('common.theme') }}
    </span>
    <div class="flex border border-black/15 dark:border-white/15">
      <button
        v-for="m in MODES"
        :key="m"
        type="button"
        :aria-pressed="theme.mode === m"
        :disabled="theme.mode === m"
        class="min-h-[40px] px-4 text-[11px] font-medium uppercase tracking-[0.25em] transition-colors"
        :class="theme.mode === m ? 'bg-[#e30613] text-white' : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'"
        @click="theme.setMode(m)"
      >
        {{ m === 'light' ? t('common.themeLight') : t('common.themeDark') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@stores/theme'
import type { ThemeMode } from '@stores/theme'

const { t } = useI18n()
const theme = useThemeStore()

const MODES: ThemeMode[] = ['light', 'dark']
</script>
