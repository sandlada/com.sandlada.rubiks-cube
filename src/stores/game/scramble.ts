import { SCRAMBLE_FACES, SCRAMBLE_SUFFIXES } from './constants'
import { makeSolved } from './cubeMath'
import type { CubeSize, Difficulty } from './types'

/**
 * Scramble lengths ARE the difficulty: each entry is one scramble turn
 * (a single face twist; "2" suffix still counts as one turn).
 * 2x2: easy 5 / normal 10 / hard 20
 * 3x3: easy 10 / normal 20 / hard 40
 * 4x4: easy 15 / normal 30 / hard 60
 */
export function scrambleLength(size: CubeSize, difficulty: Difficulty): number {
  const base = difficulty === 'easy' ? 5 : difficulty === 'normal' ? 10 : 20
  return base * (size === 2 ? 1 : size === 3 ? 2 : 3)
}

/** Public alias so menus/HUD can display "difficulty = N scramble turns". */
export function scrambleCountFor(size: CubeSize, difficulty: Difficulty): number {
  return scrambleLength(size, difficulty)
}

/** Solved-state stickers for a fresh scramble-init playback. */
export function createSolvedStickers(n: CubeSize): number[][] {
  return makeSolved(n)
}

export type RandomFn = () => number

/** HOF: inject randomness so scramble generation is pure + testable. */
export function createScrambleGenerator(random: RandomFn = Math.random): {
  generate: (size: CubeSize, difficulty: Difficulty) => string[]
} {
  function pickFace(prevFace: string, pool: readonly string[]): string {
    let face = pool[Math.floor(random() * pool.length)] ?? 'U'
    while (face.toUpperCase() === prevFace.toUpperCase()) {
      face = pool[Math.floor(random() * pool.length)] ?? 'U'
    }
    return face
  }

  function generate(size: CubeSize, difficulty: Difficulty): string[] {
    const total = scrambleLength(size, difficulty)
    const queue: string[] = []
    // 4x4 needs inner slices to truly scramble centers; outer-only keeps
    // each face's 2x2 center block on its home face.
    const pool: readonly string[] =
      size === 4 ? [...SCRAMBLE_FACES, 'u', 'd', 'l', 'r', 'f', 'b'] : SCRAMBLE_FACES
    let prevFace = ''
    for (let i = 0; i < total; i++) {
      const face = pickFace(prevFace, pool)
      prevFace = face
      const suffix = SCRAMBLE_SUFFIXES[Math.floor(random() * SCRAMBLE_SUFFIXES.length)] ?? ''
      queue.push(`${face}${suffix}`)
    }
    return queue
  }

  return { generate }
}

/** Default generator bound to Math.random (production path). */
export function generateScrambleMoves(size: CubeSize, difficulty: Difficulty): string[] {
  return createScrambleGenerator().generate(size, difficulty)
}
