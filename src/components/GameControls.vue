<template>
  <div class="flex w-full flex-col gap-2 md:w-auto md:gap-3">
    <section class="flex flex-col gap-1" :aria-label="t('hud.frontTurns')">
      <p class="text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 dark:text-white/50">
        {{ t('hud.frontTurns') }}
      </p>
      <div class="grid grid-cols-3 gap-1.5" role="group">
        <button
          v-for="m in FRONT_TURNS"
          :key="m"
          type="button"
          :disabled="props.disabled"
          :aria-label="m"
          class="pointer-events-auto min-h-[44px] min-w-[44px] border border-black/15 bg-white/70 px-2 text-sm font-light tracking-[0.15em] text-neutral-800 backdrop-blur-sm transition-colors hover:border-black/40 hover:text-neutral-900 active:border-[#e30613] active:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-black/15 disabled:hover:text-neutral-800 dark:border-white/15 dark:bg-black/60 dark:text-white/85 dark:hover:border-white/40 dark:hover:text-white dark:active:text-white dark:disabled:hover:border-white/15 dark:disabled:hover:text-white/85"
          @click="onPress(m)"
        >
          {{ m }}
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-1">
      <div
        class="grid grid-cols-4 gap-1.5"
        role="group"
      >
        <button
          v-for="b in PEEK_BUTTONS"
          :key="b.face"
          type="button"
          :disabled="props.disabled"
          :aria-label="t(b.key)"
          :title="b.hint"
          :aria-keyshortcuts="b.hint"
          class="pointer-events-auto flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 border border-black/15 bg-white/70 px-1 text-center text-[10px] font-medium uppercase leading-tight tracking-[0.2em] text-neutral-800 backdrop-blur-sm transition-colors hover:border-black/40 hover:text-neutral-900 active:border-[#e30613] active:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-black/15 disabled:hover:text-neutral-800 md:px-2 md:text-[11px] dark:border-white/15 dark:bg-black/60 dark:text-white/85 dark:hover:border-white/40 dark:hover:text-white dark:active:text-white dark:disabled:hover:border-white/15 dark:disabled:hover:text-white/85"
          @pointerdown="onPeekStart(b.face)"
          @pointerup="onPeekEnd"
          @pointercancel="onPeekEnd"
          @lostpointercapture="onPeekEnd"
          @contextmenu.prevent
        >
          <span>{{ t(b.key) }}</span>
          <span aria-hidden="true" class="hidden text-[9px] font-light tracking-[0.15em] opacity-60 md:inline">{{ b.hint }}</span>
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-1" :aria-label="t('hud.switchFront')">
      <p class="text-[11px] font-light uppercase tracking-[0.3em] text-neutral-500 dark:text-white/50">
        {{ t('hud.switchFront') }}
      </p>
      <div
        class="grid grid-cols-5 gap-1.5"
        role="group"
      >
        <button
          v-for="face in SWITCH_FACES"
          :key="face"
          type="button"
          :disabled="props.disabled"
          :aria-label="`${t('hud.switchFront')} ${face}`"
          :title="SWITCH_KEY_HINTS[face]"
          class="pointer-events-auto flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 border border-black/15 bg-white/70 px-1 text-sm font-light tracking-[0.15em] text-neutral-800 backdrop-blur-sm transition-colors hover:border-black/40 hover:text-neutral-900 active:border-[#e30613] active:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-black/15 disabled:hover:text-neutral-800 md:px-2 dark:border-white/15 dark:bg-black/60 dark:text-white/85 dark:hover:border-white/40 dark:hover:text-white dark:active:text-white dark:disabled:hover:border-white/15 dark:disabled:hover:text-white/85"
          @click="onSwitch(face)"
        >
          {{ face }}
          <span
            aria-hidden="true"
            class="inline-block h-3 w-3 rounded-full border border-black/30 dark:border-white/30"
            :style="{ backgroundColor: props.centers[face] }"
          />
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FaceName, PeekFace } from '@three/index'

const FRONT_TURNS = ['F', "F'", 'F2'] as const

const PEEK_BUTTONS: ReadonlyArray<{ face: PeekFace; key: string; hint: string }> = [
  { face: 'L', key: 'hud.peekLeft', hint: 'A · ←' },
  { face: 'R', key: 'hud.peekRight', hint: 'D · →' },
  { face: 'D', key: 'hud.peekDown', hint: 'S · ↓' },
  { face: 'B', key: 'hud.peekTop', hint: 'W · ↑' },
]

/** Physical-key mapping: A/← left, S/↓ below, D/→ right, W/↑ back. */
const KEY_TO_PEEK: Readonly<Record<string, PeekFace>> = {
  KeyA: 'L',
  ArrowLeft: 'L',
  KeyS: 'D',
  ArrowDown: 'D',
  KeyD: 'R',
  ArrowRight: 'R',
  KeyW: 'B',
  ArrowUp: 'B',
}

/**
 * Shift+key mapping: logically reorient so that face becomes the front
 * (same as its switch-front button). Screen-directional: the face sitting
 * in that direction comes forward. Back has no screen direction and stays
 * button-only; F is already front (no-op).
 */
const SHIFT_KEY_TO_FACE: Readonly<Record<string, FaceName>> = {
  KeyW: 'U',
  ArrowUp: 'U',
  KeyA: 'L',
  ArrowLeft: 'L',
  KeyS: 'D',
  ArrowDown: 'D',
  KeyD: 'R',
  ArrowRight: 'R',
}

/** Tooltip hint per switchable face; faces without a shortcut get null. */
const SWITCH_KEY_HINTS: Readonly<Record<FaceName, string | null>> = {
  U: '⇧W · ↑',
  D: '⇧S · ↓',
  L: '⇧A · ←',
  R: '⇧D · →',
  F: null,
  B: null,
}

const SWITCH_FACES: ReadonlyArray<FaceName> = ['U', 'D', 'L', 'R', 'B']

const props = defineProps<{
  disabled: boolean
  centers: Record<FaceName, string>
}>()

const emit = defineEmits<{
  press: [move: string]
  peek: [face: PeekFace]
  release: []
  switchFront: [face: FaceName]
}>()

const { t } = useI18n()

/** Peek face currently held via keyboard; null when no keyboard peek is active. */
let keyboardPeek: PeekFace | null = null

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
  if (keyboardPeek !== null) {
    keyboardPeek = null
    emit('release')
  }
})

watch(
  () => props.disabled,
  (value) => {
    if (value && keyboardPeek !== null) {
      keyboardPeek = null
      emit('release')
    }
  },
)

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled || event.repeat) {
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
    return
  }
  if (event.shiftKey) {
    const target = SHIFT_KEY_TO_FACE[event.code]
    if (target === undefined) {
      return
    }
    event.preventDefault()
    releaseKeyboardPeek()
    emit('switchFront', target)
    return
  }
  const face = KEY_TO_PEEK[event.code]
  if (face === undefined) {
    return
  }
  event.preventDefault()
  if (keyboardPeek === face) {
    return
  }
  keyboardPeek = face
  emit('peek', face)
}

function onKeyUp(event: KeyboardEvent): void {
  const face = KEY_TO_PEEK[event.code]
  if (face === undefined || keyboardPeek !== face) {
    return
  }
  keyboardPeek = null
  emit('release')
}

function onWindowBlur(): void {
  if (keyboardPeek === null) {
    return
  }
  keyboardPeek = null
  emit('release')
}

function onPress(m: string): void {
  if (props.disabled) return
  releaseKeyboardPeek()
  emit('press', m)
}

function onPeekStart(face: PeekFace): void {
  if (props.disabled) return
  emit('peek', face)
}

function onPeekEnd(): void {
  if (props.disabled) return
  emit('release')
}

function onSwitch(face: FaceName): void {
  if (props.disabled) return
  releaseKeyboardPeek()
  emit('switchFront', face)
}

/** A turn always acts on the true front: drop a held keyboard peek first. */
function releaseKeyboardPeek(): void {
  if (keyboardPeek === null) {
    return
  }
  keyboardPeek = null
  emit('release')
}
</script>
