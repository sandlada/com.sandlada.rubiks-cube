<template>
  <main class="flex min-h-dvh w-full items-center justify-center bg-white px-6 py-12 text-neutral-900 dark:bg-[#050505] dark:text-white">
    <div class="flex w-full max-w-2xl flex-col items-stretch gap-8">
      <header class="flex flex-col items-center gap-3 text-center">
        <p class="text-[11px] font-light uppercase tracking-[0.35em] text-neutral-500 dark:text-white/50">
          {{ t('common.appName') }}
        </p>
        <h1 class="text-4xl font-light uppercase tracking-[0.2em] text-neutral-900 dark:text-white">
          {{ t('archive.heading') }}
        </h1>
        <div class="h-px w-10 bg-[#e30613]" aria-hidden="true" />
        <p class="text-xs font-light uppercase tracking-[0.25em] text-neutral-600 dark:text-white/60">
          {{ t('archive.savedCount', { count: saves.length }) }}
        </p>
      </header>

      <p
        v-if="saves.length === 0"
        class="border border-black/15 px-6 py-10 text-center text-xs font-light uppercase tracking-[0.25em] text-neutral-500 dark:border-white/15 dark:text-white/50"
      >
        {{ t('archive.empty') }}
      </p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="entry in saves"
          :key="entry.id"
          class="flex flex-col gap-4 border border-black/15 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:bg-black"
        >
          <div class="flex min-w-0 flex-col gap-1">
            <p class="truncate text-sm font-medium uppercase tracking-[0.2em] text-neutral-900 dark:text-white">
              {{ entry.name }}
            </p>
            <p class="text-[11px] font-light uppercase tracking-[0.2em] text-neutral-500 dark:text-white/55">
              {{ entry.size }}×{{ entry.size }} · {{ t('difficulty.' + entry.difficulty) }} · {{ t('hud.timer') }} {{ formatTime(entry.elapsedMs) }} · {{ t('hud.moves') }} {{ entry.moves.length }}
            </p>
            <p class="text-[11px] font-light tracking-[0.15em] text-neutral-400 dark:text-white/40">
              {{ formatDateEntry(entry.updatedAt) }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="min-h-[44px] border border-black/25 px-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-900 transition-colors hover:border-black hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:border-white dark:hover:bg-white/10"
              @click="resume(entry.id)"
            >
              {{ t('hud.resume') }}
            </button>
            <button
              type="button"
              class="min-h-[44px] border border-black/15 px-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:border-[#e30613] hover:text-neutral-900 dark:border-white/15 dark:text-white/60 dark:hover:text-white"
              @click="remove(entry.id)"
            >
              {{ t('archive.delete') }}
            </button>
          </div>
        </li>
      </ul>

      <nav class="flex justify-center">
        <RouterLink
          :to="{ name: 'menu' }"
          class="flex min-h-[44px] items-center justify-center text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 transition-colors hover:text-neutral-900 dark:text-white/60 dark:hover:text-white"
        >
          {{ t('archive.backToMenu') }}
        </RouterLink>
      </nav>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useArchiveStore } from '@stores/archive'
import { formatDate, formatTime } from '@utils/index'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'

const { t, locale } = useI18n()
const router = useRouter()
const archive = useArchiveStore()

const saves = computed(() => archive.findMany())

function formatDateEntry(ts: number): string {
  return formatDate(ts, locale.value)
}

function resume(id: string): void {
  void router.push({ name: 'game', query: { saveId: id } })
}

function remove(id: string): void {
  archive.removeOneById(id)
}
</script>
