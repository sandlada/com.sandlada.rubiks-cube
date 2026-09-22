import {
  applyCubieSequence,
  cloneCubie,
} from './cubie.ts'
import type { CubieState } from './cubie.ts'

export interface SearchStep {
  key: string
  moves: string[]
}

export interface SearchOptions {
  steps: SearchStep[]
  goal: (s: CubieState) => boolean
  h: (s: CubieState) => number
  maxDepth: number
  maxNodes?: number
}

const BASIC_FACES = ['U', 'D', 'F', 'B', 'L', 'R']
const NO_D_FACES = ['U', 'F', 'B', 'L', 'R']
const SUFFIXES = ['', "'", '2']

export function primitiveSteps(faces: string[] = BASIC_FACES): SearchStep[] {
  const out: SearchStep[] = []
  for (const f of faces) {
    for (const s of SUFFIXES) {
      out.push({ key: f, moves: [`${f}${s}`] })
    }
  }
  return out
}

export function noDFaces(): string[] {
  return NO_D_FACES.slice()
}

/** Iterative-deepening DFS over cubie states. Returns flat move list or null. */
export function idaSearch(start: CubieState, opts: SearchOptions): string[] | null {
  const maxNodes = opts.maxNodes ?? 3000000
  let nodes = 0
  const h0 = opts.h(start)
  if (h0 === 0 && opts.goal(start)) {
    return []
  }
  for (let bound = h0; bound <= opts.maxDepth; bound++) {
    const path: SearchStep[] = []
    const found = dfs(start, 0, bound, null, path)
    if (found !== null) {
      return found
    }
    if (nodes >= maxNodes) {
      return null
    }
  }
  return null

  function dfs(
    state: CubieState,
    g: number,
    bound: number,
    prevKey: string | null,
    path: SearchStep[],
  ): string[] | null {
    nodes += 1
    if (nodes > maxNodes) {
      return null
    }
    const f = g + opts.h(state)
    if (f > bound) {
      return null
    }
    if (opts.goal(state)) {
      const out: string[] = []
      for (const step of path) {
        out.push(...step.moves)
      }
      return out
    }
    if (g >= bound) {
      return null
    }
    for (const step of opts.steps) {
      if (prevKey !== null && step.key === prevKey && step.moves.length === 1) {
        continue
      }
      const next = cloneCubie(state)
      applyCubieSequence(next, step.moves)
      path.push(step)
      const found = dfs(next, g + 1, bound, step.key, path)
      if (found !== null) {
        return found
      }
      path.pop()
      if (nodes > maxNodes) {
        return null
      }
    }
    return null
  }
}

export const SUNE_MOVES = ['R', 'U', "R'", 'U', 'R', 'U2', "R'"]
export const ANTI_SUNE_MOVES = ['R', 'U2', "R'", "U'", 'R', "U'", "R'"]
export const U_PERM_CW = ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2']
export const U_PERM_CCW = ['R2', 'U', 'R', 'U', "R'", "U'", "R'", "U'", "R'", 'U', "R'"]
export const T_PERM_MOVES = ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"]
export const Y_PERM_MOVES = ['F', 'R', "U'", "R'", "U'", 'R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R', "F'"]

export function macroSteps(): SearchStep[] {
  return [
    { key: 'U', moves: ['U'] },
    { key: 'U', moves: ["U'"] },
    { key: 'U', moves: ['U2'] },
    { key: 'SUNE', moves: SUNE_MOVES },
    { key: 'ANTI', moves: ANTI_SUNE_MOVES },
  ]
}

export function cornerPermSteps(): SearchStep[] {
  return [
    { key: 'U', moves: ['U'] },
    { key: 'U', moves: ["U'"] },
    { key: 'U', moves: ['U2'] },
    { key: 'TPERM', moves: T_PERM_MOVES },
  ]
}

export function edgePermSteps(): SearchStep[] {
  return [
    { key: 'U', moves: ['U'] },
    { key: 'U', moves: ["U'"] },
    { key: 'U', moves: ['U2'] },
    { key: 'UCW', moves: U_PERM_CW },
    { key: 'UCCW', moves: U_PERM_CCW },
  ]
}
