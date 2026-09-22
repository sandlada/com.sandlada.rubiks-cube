<template>
  <main class="relative h-dvh w-screen overflow-hidden bg-stone-100 text-neutral-900 dark:bg-[#050505] dark:text-white">
    <CubeCanvas
      ref="canvasRef"
      class="absolute inset-0"
      :stickers="store.stickers"
      :size="store.size"
      :interactive="isInteractive"
      @move="onMove"
      @preview="onPreview"
    />

    <div class="hud pointer-events-none absolute inset-0 z-10">
      <div
        v-if="store.status === 'scrambling'"
        class="absolute inset-x-0 top-[4.75rem] flex justify-center px-3 md:top-8 md:px-0"
      >
        <p
          role="status"
          class="max-w-full truncate border border-black/15 bg-white/70 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-800 backdrop-blur-sm dark:border-white/15 dark:bg-black/60 dark:text-white/85"
        >
          {{ t('game.scrambling') }} · {{ store.scrambleDone }}/{{ store.scrambleMoves.length }}
        </p>
      </div>

      <div
        v-if="previewHint !== null && isInteractive"
        class="absolute inset-x-0 top-[7.5rem] flex justify-center px-3 md:top-20 md:px-0"
      >
        <p
          role="status"
          class="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.25em] backdrop-blur-sm"
          :class="previewHint ? 'bg-[#e30613] text-white' : 'border border-black/15 bg-white/70 text-neutral-600 dark:border-white/15 dark:bg-black/60 dark:text-white/60'"
        >
          {{ previewHint ? t('game.releaseToTurn') : t('game.releaseToCancel') }}
        </p>
      </div>
      <!-- top-left: timer + move count -->
      <div class="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] flex max-w-[44vw] flex-col gap-0.5 md:left-8 md:top-8 md:max-w-none md:gap-1">
        <p class="text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 dark:text-white/50">
          {{ t('hud.timer') }}
        </p>
        <p class="text-2xl font-light tabular-nums tracking-[0.1em] text-neutral-900 md:text-3xl dark:text-white">
          {{ timeText }}
        </p>
        <p class="truncate text-[11px] font-light uppercase tracking-[0.3em] text-neutral-600 dark:text-white/60">
          {{ t('hud.moves') }} · {{ store.moves.length }}
        </p>
      </div>

      <!-- top-right: pause + save -->
      <div class="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex max-w-[56vw] flex-wrap items-start justify-end gap-1.5 md:right-8 md:top-8 md:max-w-none md:flex-nowrap md:gap-2">
        <span
          v-if="savedFlash"
          role="status"
          class="flex max-w-full items-center truncate border border-black/15 bg-white/70 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-900 md:tracking-[0.25em] dark:border-white/15 dark:bg-black/60 dark:text-white"
        >
          {{ t('game.saved') }}
        </span>
        <button
          type="button"
          :aria-label="t('game.saveLabel')"
          :disabled="store.status === 'scrambling'"
          class="pointer-events-auto min-h-[44px] border border-black/15 bg-white/70 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-800 backdrop-blur-sm transition-colors hover:border-black/40 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 md:px-4 md:tracking-[0.25em] dark:border-white/15 dark:bg-black/60 dark:text-white/85 dark:hover:border-white/40 dark:hover:text-white"
          @click="onSave"
        >
          {{ t('game.saveLabel') }}
        </button>
        <button
          v-if="canPause"
          type="button"
          :aria-label="t('hud.pause')"
          class="pointer-events-auto min-h-[44px] border border-black/15 bg-white/70 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-800 backdrop-blur-sm transition-colors hover:border-black/40 hover:text-neutral-900 md:px-4 md:tracking-[0.25em] dark:border-white/15 dark:bg-black/60 dark:text-white/85 dark:hover:border-white/40 dark:hover:text-white"
          @click="onPause"
        >
          {{ t('hud.pause') }}
        </button>
      </div>

      <!-- bottom HUD: mobile = full-width sheet; desktop = opposite corners -->
      <div class="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:inset-x-8 md:bottom-8 md:flex-row md:items-end md:justify-between md:gap-4 md:px-0 md:pb-0">
        <div class="flex items-baseline justify-between gap-2 md:flex-col md:items-start md:gap-1">
          <p class="truncate text-[11px] font-light uppercase tracking-[0.3em] text-neutral-600 dark:text-white/60">
            {{ sizeText }} · {{ t('difficulty.' + store.difficulty) }}
          </p>
          <p class="shrink-0 text-[11px] font-light uppercase tracking-[0.3em] text-neutral-400 dark:text-white/40">
            {{ t('game.status.' + store.status) }}
          </p>
        </div>

        <div class="pointer-events-auto max-h-[42dvh] w-full overflow-y-auto md:max-h-none md:w-auto md:overflow-visible">
          <GameControls
            :disabled="!isInteractive"
            :centers="centers"
            @press="pressMove"
            @peek="onPeek"
            @release="onReleasePeek"
            @switch-front="onSwitchFront"
          />
        </div>
      </div>

      <PauseOverlay
        v-if="store.status === 'paused'"
        @resume="onResume"
        @restart="onRestart"
        @quit="onQuit"
      />
      <SolvedOverlay
        v-if="store.status === 'solved'"
        :time="timeText"
        :move-count="store.moves.length"
        @play-again="onRestart"
        @open-menu="onQuit"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import CubeCanvas from '@components/CubeCanvas.vue'
import GameControls from '@components/GameControls.vue'
import PauseOverlay from '@components/PauseOverlay.vue'
import SolvedOverlay from '@components/SolvedOverlay.vue'
import { useGameCenters, useScrambleRunner } from '@composables/index'
import { useArchiveStore } from '@stores/archive'
import { parseCubeSize, parseDifficulty, useGameStore } from '@stores/game'
import type { FaceName } from '@stores/game'
import type { PeekFace } from '@three/index'
import { firstQuery, formatTime } from '@utils/index'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useGameStore()
const archive = useArchiveStore()

const canvasRef = ref<InstanceType<typeof CubeCanvas> | null>(null)
const savedFlash = ref(false)
const previewHint = ref<boolean | null>(null)
let flashHandle = 0

const { startScramble, cancelScramble } = useScrambleRunner(canvasRef, store, previewHint)

const isInteractive = computed(
  () => store.status !== 'paused' && store.status !== 'solved' && store.status !== 'scrambling',
)
const canPause = computed(() => store.status === 'playing' || store.status === 'ready')
const timeText = computed(() => formatTime(store.elapsedMs))
const sizeText = computed(() => `${store.size}×${store.size}`)

const centers = useGameCenters(() => store.stickers)

onMounted(() => {
  const saveId = firstQuery(route.query['saveId'])
  if (saveId !== '') {
    const snap = archive.findOneById(saveId)
    if (snap !== undefined) {
      store.loadSnapshot(snap)
      canvasRef.value?.reset(snap.stickers, snap.size)
      if (snap.status === 'playing') {
        store.resumeTimer()
      }
      return
    }
  }
  if (firstQuery(route.query['continue']) !== '') {
    const auto = store.loadAutosave()
    if (auto !== null) {
      store.loadSnapshot(auto)
      canvasRef.value?.reset(auto.stickers, auto.size)
      if (auto.status === 'playing') {
        store.resumeTimer()
      }
      return
    }
  }
  const size = parseCubeSize(firstQuery(route.query['size']))
  const difficulty = parseDifficulty(firstQuery(route.query['difficulty']))
  store.newGame(size, difficulty)
  startScramble()
})

onUnmounted(() => {
  cancelScramble()
  window.clearTimeout(flashHandle)
})

/** Single commit path: canvas emits `move` after its animation completes. */
function onMove(m: string): void {
  if (store.status === 'scrambling') {
    store.applyScrambleMove(m)
    return
  }
  if (store.status === 'ready') {
    store.startTimer()
  }
  const solved = store.applyMove(m)
  store.saveAutosave()
  if (solved) {
    store.clearAutosave()
  }
}

function onPreview(committed: boolean | null): void {
  previewHint.value = committed
}

function pressMove(m: string): void {
  void canvasRef.value?.playMove(m)
}

/** Hold-to-peek: tilt the view toward a face; release eases back. */
function onPeek(face: PeekFace | null): void {
  canvasRef.value?.peek(face)
}

function onReleasePeek(): void {
  onPeek(null)
}

/** Logical reorientation: the chosen face becomes the new front. */
function onSwitchFront(face: FaceName): void {
  if (store.setFrontFace(face)) {
    store.saveAutosave()
    canvasRef.value?.reset(store.stickers, store.size)
  }
}

function onPause(): void {
  if (store.status === 'ready') {
    store.startTimer()
  }
  store.pauseTimer()
}

function onResume(): void {
  store.resumeTimer()
}

function onRestart(): void {
  store.newGame(store.size, store.difficulty)
  startScramble()
}

function onQuit(): void {
  void router.push({ name: 'menu' })
}

function onSave(): void {
  if (store.status === 'scrambling') {
    return
  }
  const snap = store.serialize()
  const date = new Date(snap.updatedAt).toLocaleString(locale.value)
  archive.insertOne({ ...snap, name: t('archive.autoName', { date }) as string, createdAt: snap.updatedAt })
  savedFlash.value = true
  window.clearTimeout(flashHandle)
  flashHandle = window.setTimeout(() => {
    savedFlash.value = false
  }, 1600)
}
</script>

<style scoped>
.hud :deep(button),
.hud :deep(a) {
  pointer-events: auto;
}
</style>
