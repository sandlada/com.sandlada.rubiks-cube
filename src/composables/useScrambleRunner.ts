import { onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import { createSolvedStickers } from '@stores/game'
import type { useGameStore } from '@stores/game'
import { SCRAMBLE_TURN_MS } from '@three/constants'

interface CubeCanvasHandle {
  reset: (stickers: number[][], size: number) => void
  playMove: (move: string, ms?: number) => Promise<void>
}

type GameStore = ReturnType<typeof useGameStore>

/** Scramble playback orchestration (token-guarded, restartable). */
export function useScrambleRunner(
  canvasRef: Ref<CubeCanvasHandle | null>,
  store: GameStore,
  previewHint: Ref<boolean | null>,
): {
  startScramble: () => void
  cancelScramble: () => void
} {
  let scrambleToken = 0
  const active = ref(false)

  async function runScramble(token: number): Promise<void> {
    const moves = store.scrambleMoves.slice()
    for (const m of moves) {
      if (token !== scrambleToken) {
        return
      }
      try {
        await canvasRef.value?.playMove(m, SCRAMBLE_TURN_MS)
      } catch {
        return
      }
    }
    if (token !== scrambleToken) {
      return
    }
    active.value = false
    store.finishScramble()
    store.saveAutosave()
  }

  function startScramble(): void {
    scrambleToken += 1
    const token = scrambleToken
    active.value = true
    previewHint.value = null
    canvasRef.value?.reset(createSolvedStickers(store.size), store.size)
    void runScramble(token)
  }

  function cancelScramble(): void {
    scrambleToken += 1
    active.value = false
  }

  onUnmounted(() => {
    cancelScramble()
  })

  return { startScramble, cancelScramble }
}
