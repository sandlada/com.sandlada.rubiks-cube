import { applyCubieSequence, CORNER_FACE_ORDER } from './cubie.ts'
import type { CubieState } from './cubie.ts'
import { idaSearch, primitiveSteps } from './search.ts'
import {
  orientYellowCorners,
  permuteYellowCorners,
  solveWhiteCorners,
  WHITE_CORNERS,
} from './solver3x3.ts'
import type { SolveContext } from './solver3x3.ts'

const CANONICAL_COLOR: Record<string, number> = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 }

/** Opposite side colors, deduced from white-corner adjacency (fixed scheme). */
const OPPOSITE_COLOR: Record<number, number> = { 2: 3, 3: 2, 4: 5, 5: 4 }

/** A/B side-facelet colors of a white corner cubie in canonical order. */
function cornerSideColors(cubie: number): [number, number] {
  const order = CORNER_FACE_ORDER[cubie] ?? ['U', 'F', 'R']
  const a = CANONICAL_COLOR[order[1] ?? 'F'] ?? 2
  const b = CANONICAL_COLOR[order[2] ?? 'R'] ?? 5
  return [a, b]
}

/** Place any white corner white-down on DFR, then invent a consistent scheme. */
function placeFirstCorner(ctx: SolveContext): number | null {
  if (WHITE_CORNERS.includes(ctx.state.cp[4] ?? -1) && (ctx.state.co[4] ?? 1) === 0) {
    return ctx.state.cp[4] ?? null
  }
  const found = idaSearch(ctx.state, {
    steps: primitiveSteps(),
    goal: (s) => WHITE_CORNERS.includes(s.cp[4] ?? -1) && (s.co[4] ?? 1) === 0,
    h: (s) => (WHITE_CORNERS.includes(s.cp[4] ?? -1) && (s.co[4] ?? 1) === 0 ? 0 : 1),
    maxDepth: 6,
  })
  if (found === null) {
    return null
  }
  applyCubieSequence(ctx.state, found)
  ctx.out.push(...found)
  return ctx.state.cp[4] ?? null
}

/**
 * 2x2 beginner solve on a normalized (white-D) corners-only state.
 * White layer first, then yellow with the shared Sune/T-perm stages.
 */
export function solve2x2Normalized(state: CubieState): string[] | null {
  const ctx: SolveContext = { state, centers: [1, 0, 2, 3, 4, 5], out: [], cornersOnly: true }
  const first = placeFirstCorner(ctx)
  if (first === null || !WHITE_CORNERS.includes(first)) {
    return null
  }
  const [aFace, bFace] = cornerSideColors(first)
  const oppA = OPPOSITE_COLOR[aFace] ?? 3
  const oppB = OPPOSITE_COLOR[bFace] ?? 4
  // Face index order: U0 D1 F2 B3 L4 R5. DFR slot faces F then R.
  ctx.centers = [1, 0, aFace, oppA, oppB, bFace]
  if (!solveWhiteCorners(ctx)) {
    return null
  }
  if (!orientYellowCorners(ctx)) {
    return null
  }
  if (!permuteYellowCorners(ctx)) {
    return null
  }
  return ctx.out
}
