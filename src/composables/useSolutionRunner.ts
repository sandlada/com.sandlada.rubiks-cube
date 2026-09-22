import { onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import { findSolutionMoves } from '@stores/game'
import type { useGameStore } from '@stores/game'
import { SOLUTION_TURN_MS } from '@three/constants'

interface CubeCanvasHandle {
  reset: (stickers: number[][], size: number) => void
  playMove: (move: string, ms?: number) => Promise<void>
}

type GameStore = ReturnType<typeof useGameStore>

/** One-click solve playback orchestration (token-guarded, cancellable). */
export function useSolutionRunner(
  canvasRef: Ref<CubeCanvasHandle | null>,
  store: GameStore,
): {
  startSolution: () => boolean
  cancelSolution: () => void
  active: Ref<boolean>
} {
  let solutionToken = 0
  const active = ref(false)

  async function runSolution(moves: string[], token: number): Promise<void> {
    for (const m of moves) {
      if (token !== solutionToken) {
        return
      }
      try {
        await canvasRef.value?.playMove(m, SOLUTION_TURN_MS)
      } catch {
        return
      }
    }
    if (token !== solutionToken) {
      return
    }
    active.value = false
    store.finishSolution()
    store.saveAutosave()
  }

  function startSolution(): boolean {
    if (active.value || store.solving) {
      return false
    }
    const moves = findSolutionMoves(store.size, store.stickers, store.historyMoves)
    if (moves === null || moves.length === 0) {
      return moves !== null
    }
    solutionToken += 1
    const token = solutionToken
    active.value = true
    store.beginSolution(moves)
    void runSolution(moves, token)
    return true
  }

  function cancelSolution(): void {
    solutionToken += 1
    if (active.value) {
      active.value = false
      store.cancelSolution()
    }
  }

  onUnmounted(() => {
    cancelSolution()
  })

  return { startSolution, cancelSolution, active }
}
