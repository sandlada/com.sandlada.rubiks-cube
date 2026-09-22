<template>
    <main
        class="flex min-h-dvh w-full justify-center bg-white px-6 py-12 text-neutral-900 dark:bg-[#050505] dark:text-white"
    >
        <div class="flex w-full max-w-md flex-col items-stretch gap-8 text-center">
            <header class="flex flex-col items-center gap-3">
                <p class="text-[11px] font-light uppercase tracking-[0.35em] text-neutral-500 dark:text-white/50">
                    {{ t('common.appName') }}
                </p>
                <h1 class="text-4xl font-light uppercase tracking-[0.2em] text-neutral-900 dark:text-white">
                    {{ t('menu.heading') }}
                </h1>
                <div
                    class="h-px w-10 bg-[#e30613]"
                    aria-hidden="true"
                />
                <p class="text-xs font-light uppercase tracking-[0.25em] text-neutral-600 dark:text-white/60">
                    {{ t('menu.tagline') }}
                </p>
            </header>

            <section
                class="flex flex-col gap-2"
                :aria-label="t('game.sizeLabel')"
            >
                <p class="text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 dark:text-white/50">
                    {{ t('game.sizeLabel') }}
                </p>
                <div class="grid grid-cols-3 border border-black/15 dark:border-white/15">
                    <button
                        v-for="s in SIZES"
                        :key="s"
                        type="button"
                        :aria-pressed="size === s"
                        class="min-h-[44px] text-sm font-light tracking-[0.2em] transition-colors"
                        :class="size === s ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'"
                        @click="size = s"
                    >
                        {{ s }}×{{ s }}
                    </button>
                </div>
            </section>

            <section
                class="flex flex-col gap-2"
                :aria-label="t('game.difficultyLabel')"
            >
                <p class="text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 dark:text-white/50">
                    {{ t('game.difficultyLabel') }}
                </p>
                <div class="grid grid-cols-3 border border-black/15 dark:border-white/15">
                    <button
                        v-for="d in DIFFICULTIES"
                        :key="d"
                        type="button"
                        :aria-pressed="difficulty === d"
                        class="min-h-[44px] px-2 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors"
                        :class="difficulty === d ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'"
                        @click="difficulty = d"
                    >
                        {{ t('difficulty.' + d) }} · {{ t('game.scrambleTurns', { count: scrambleCountFor(size, d) }) }}
                    </button>
                </div>
            </section>

            <div class="flex flex-col items-stretch gap-3">
                <button
                    type="button"
                    class="min-h-[48px] bg-[#e30613] px-6 text-xs font-medium uppercase tracking-[0.3em] text-white transition-opacity hover:opacity-85"
                    @click="startGame"
                >
                    {{ t('menu.startGame') }}
                </button>
                <button
                    v-if="canContinue"
                    type="button"
                    class="min-h-[48px] border border-black/25 px-6 text-xs font-medium uppercase tracking-[0.3em] text-neutral-900 transition-colors hover:border-black hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:border-white dark:hover:bg-white/10"
                    @click="continueGame"
                >
                    {{ t('game.continueLabel') }}
                </button>
                <RouterLink
                    :to="{ name: 'archive' }"
                    class="flex min-h-[44px] items-center justify-center text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 transition-colors hover:text-neutral-900 dark:text-white/60 dark:hover:text-white"
                >
                    {{ t('menu.openArchive') }}
                </RouterLink>
            </div>

            <footer class="flex flex-col items-center gap-4">
                <div
                    class="h-px w-full bg-black/15 dark:bg-white/15"
                    aria-hidden="true"
                />
                <LanguageSwitcher />
                <ThemeToggle />
            </footer>
        </div>
    </main>
</template>

<script setup lang="ts">
import LanguageSwitcher from '@components/LanguageSwitcher.vue'
import ThemeToggle from '@components/ThemeToggle.vue'
import type { CubeSize, Difficulty } from '@stores/game'
import { scrambleCountFor, useGameStore } from '@stores/game'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const store = useGameStore()

const SIZES: CubeSize[] = [2, 3, 4]
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

const size = ref<CubeSize>(3)
const difficulty = ref<Difficulty>('normal')
const canContinue = ref(false)

onMounted(() => {
    canContinue.value = store.hasAutosave()
})

function startGame(): void {
    void router.push({ name: 'game', query: { size: String(size.value), difficulty: difficulty.value } })
}

function continueGame(): void {
    void router.push({ name: 'game', query: { continue: '1' } })
}
</script>
