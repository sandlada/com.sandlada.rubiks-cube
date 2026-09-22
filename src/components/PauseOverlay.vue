<template>
  <div
    class="overlay pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-black/80"
    role="dialog"
    aria-modal="true"
    :aria-label="t('game.pauseTitle')"
  >
    <div class="panel flex w-full max-w-xs flex-col items-stretch gap-5 border border-black/15 bg-white px-8 py-10 text-center dark:border-white/15 dark:bg-black">
      <p class="text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 dark:text-white/50">
        {{ t('game.pauseTitle') }}
      </p>
      <div class="mx-auto h-px w-10 bg-[#e30613]" aria-hidden="true" />
      <button
        type="button"
        class="min-h-[44px] border border-black/25 px-6 text-xs font-medium uppercase tracking-[0.25em] text-neutral-900 transition-colors hover:border-black hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:border-white dark:hover:bg-white/10"
        @click="emit('resume')"
      >
        {{ t('hud.resume') }}
      </button>
      <button
        type="button"
        class="min-h-[44px] border border-black/25 px-6 text-xs font-medium uppercase tracking-[0.25em] text-neutral-900 transition-colors hover:border-black hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:border-white dark:hover:bg-white/10"
        @click="emit('restart')"
      >
        {{ t('game.restart') }}
      </button>
      <button
        type="button"
        class="min-h-[44px] border border-black/25 px-6 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:border-black hover:text-neutral-900 dark:border-white/25 dark:text-white/70 dark:hover:border-white dark:hover:text-white"
        @click="emit('quit')"
      >
        {{ t('game.quit') }}
      </button>
      <div class="flex justify-center">
        <ThemeToggle />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from '@components/ThemeToggle.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  resume: []
  restart: []
  quit: []
}>()
</script>
