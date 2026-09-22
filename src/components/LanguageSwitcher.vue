<template>
  <div
    class="lang-switch flex items-center gap-2"
    role="group"
    :aria-label="t('common.language')"
  >
    <span class="text-[11px] font-light uppercase tracking-[0.25em] text-neutral-500 dark:text-white/50">
      {{ t('common.language') }}
    </span>
    <div class="flex border border-black/15 dark:border-white/15">
      <button
        v-for="entry in entries"
        :key="entry.code"
        type="button"
        :aria-pressed="isActive(entry.code)"
        :disabled="isActive(entry.code)"
        class="min-h-[40px] px-4 text-[11px] font-medium uppercase tracking-[0.25em] transition-colors"
        :class="isActive(entry.code) ? 'bg-[#e30613] text-white' : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'"
        @click="setLocale(entry.code)"
      >
        {{ entry.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from '@i18n/index'
import type { SupportedLocale } from '@i18n/index'

const { t, locale } = useI18n()

const entries = computed(() =>
  SUPPORTED_LOCALES.map((code) => ({
    code,
    label: code === 'en' ? (t('common.langEnglish') as string) : (t('common.langChinese') as string),
  })),
)

function isActive(code: SupportedLocale): boolean {
  return locale.value === code
}

function setLocale(code: SupportedLocale): void {
  locale.value = code
}
</script>
