import {
  faceLetterMapForSpins,
  invertSequence,
  normalizeWhiteDown,
  remapSequence,
  stickersToCorners,
  stickersToCubie,
} from './cubie.ts'
import type { Vec3 } from './cubeMath.ts'
import { checkSolvedIn, cloneStickers, parseMoveTurn, rotateStickers } from './cubeMath.ts'
import { solve2x2Normalized } from './solver2x2.ts'
import { solve3x3Normalized } from './solver3x3.ts'
import type { CubeSize } from './types.ts'

/** Verify a candidate solution by simulating it on stickers. */
export function verifiesSolution(stickers: number[][], size: CubeSize, moves: string[]): boolean {
  let cur = cloneStickers(stickers)
  for (const m of moves) {
    const parsed = parseMoveTurn(m)
    if (parsed === null) {
      return false
    }
    cur = rotateStickers(cur, size, parsed.face, parsed.times)
  }
  return checkSolvedIn(cur, size)
}

function solveStateBased(size: CubeSize, stickers: number[][]): string[] | null {
  const view = normalizeWhiteDown(stickers, size)
  if (view === null) {
    return null
  }
  if (size === 2) {
    const state = stickersToCorners(view.stickers)
    if (state === null) {
      return null
    }
    const moves = solve2x2Normalized(state)
    if (moves === null) {
      return null
    }
    const unmapped = moves.map((m) => view.unmap(m))
    return verifiesSolution(stickers, size, unmapped) ? unmapped : null
  }
  const state = stickersToCubie(view.stickers)
  if (state === null) {
    return null
  }
  const centers = (view.stickers as number[][]).map((face) => face[4] ?? 0)
  const moves = solve3x3Normalized(state, centers)
  if (moves === null) {
    return null
  }
  const unmapped = moves.map((m) => view.unmap(m))
  return verifiesSolution(stickers, size, unmapped) ? unmapped : null
}

/**
 * One-click solve dispatcher. 2x2/3x3 use the white-bottom-first beginner
 * method from live stickers; 4x4 inverts the recorded producing history
 * (outer-only turns keep wing pairs intact, so inversion is exact).
 * Returns the move list, [] when already solved, or null when unavailable.
 */
export function findSolutionMoves(
  size: CubeSize,
  stickers: number[][],
  history: string[] | null,
): string[] | null {
  if (checkSolvedIn(stickers, size)) {
    return []
  }
  if (size === 2 || size === 3) {
    return solveStateBased(size, stickers)
  }
  if (history === null || history.length === 0) {
    return null
  }
  const moves = invertSequence(history)
  return verifiesSolution(stickers, size, moves) ? moves : null
}

/** Relabel recorded history after a whole-cube reorientation (suffixes kept). */
export function relabelHistoryForSpins(
  history: string[],
  spins: ReadonlyArray<(v: Vec3) => Vec3>,
): string[] {
  return remapSequence(history, faceLetterMapForSpins(spins))
}
