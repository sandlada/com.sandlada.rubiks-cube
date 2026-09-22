import { applyCubieSequence, cloneCubie } from './cubie.ts'
import type { CubieState } from './cubie.ts'
import {
  cornerPermSteps,
  edgePermSteps,
  idaSearch,
  macroSteps,
  noDFaces,
  primitiveSteps,
} from './search.ts'
import type { SearchStep } from './search.ts'

/** Canonical cubie colors by cubie id (home position in canonical frame). */
export const EDGE_COLORS: number[][] = [
  [0, 5], [0, 2], [0, 4], [0, 3],
  [1, 5], [1, 2], [1, 4], [1, 3],
  [2, 5], [2, 4], [3, 4], [3, 5],
]

export const CORNER_COLORS: number[][] = [
  [0, 5, 2], [0, 2, 4], [0, 4, 3], [0, 3, 5],
  [1, 2, 5], [1, 4, 2], [1, 4, 3], [1, 5, 3],
]

export const WHITE_EDGES = [0, 1, 2, 3]
export const WHITE_CORNERS = [0, 1, 2, 3]
export const YELLOW_EDGES = [4, 5, 6, 7]
export const YELLOW_CORNERS = [4, 5, 6, 7]
export const MIDDLE_EDGES = [8, 9, 10, 11]

/** Side face index per D-edge slot: 4:R(5) 5:F(2) 6:L(4) 7:B(3). */
const D_EDGE_SIDE = [5, 2, 4, 3]
/** Side faces per D-corner slot 4..7. */
const D_CORNER_SIDES = [[2, 5], [2, 4], [3, 4], [3, 5]]
/** Side faces per U-corner slot 0..3. */
const U_CORNER_SIDES = [[5, 2], [2, 4], [4, 3], [3, 5]]
/** Side face per U-edge slot 0..3. */
const U_EDGE_SIDE = [5, 2, 4, 3]

export function posOfCp(state: CubieState, cubie: number): number {
  return state.cp.indexOf(cubie)
}

export function posOfEp(state: CubieState, edge: number): number {
  return state.ep.indexOf(edge)
}

function sideColors(colors: number[], without: number): number[] {
  return colors.filter((c) => c !== without)
}

/** D home slot (4..7) for a white edge cubie, from side center colors. */
export function crossHome(edge: number, centers: number[]): number {
  const sides = sideColors(EDGE_COLORS[edge] ?? [], 0)
  const want = sides[0] ?? -1
  for (let p = 4; p <= 7; p++) {
    if (centers[D_EDGE_SIDE[p - 4] ?? 0] === want) {
      return p
    }
  }
  return -1
}

/** D home slot (4..7) for a white corner cubie. */
export function whiteCornerHome(corner: number, centers: number[]): number {
  const sides = sideColors(CORNER_COLORS[corner] ?? [], 0)
  for (let i = 0; i < 4; i++) {
    const pair = D_CORNER_SIDES[i] ?? []
    const a = centers[pair[0] ?? 0]
    const b = centers[pair[1] ?? 0]
    if (sides.includes(a ?? -2) && sides.includes(b ?? -3) && a !== b) {
      return 4 + i
    }
  }
  return -1
}

/** Middle home slot (8..11) for a middle edge cubie (center-set match). */
export function middleHome(edge: number, centers: number[]): number {
  const want = (EDGE_COLORS[edge] ?? []).slice().sort((a, b) => a - b).join(',')
  const pairs = [[2, 5], [2, 4], [3, 4], [3, 5]]
  for (let i = 0; i < 4; i++) {
    const pair = pairs[i] ?? []
    const got = [centers[pair[0] ?? 0] ?? -1, centers[pair[1] ?? 0] ?? -1].sort((a, b) => a - b).join(',')
    if (got === want) {
      return 8 + i
    }
  }
  return -1
}

/**
 * Required eo for a middle edge at its home slot. Cubie eo tracks whether the
 * green/blue sticker sits in the primary (F/B) slot, but "oriented" means each
 * sticker faces its matching center — in rotated frames that can be eo 1.
 */
export function middleExpectedEo(edge: number, home: number, centers: number[]): number {
  const colors = EDGE_COLORS[edge] ?? []
  const fb = colors.find((c) => c === 2 || c === 3) ?? -1
  const primaryFaces = [2, 2, 3, 3]
  return centers[primaryFaces[home - 8] ?? 0] === fb ? 0 : 1
}

/** U home slot (0..3) for a yellow corner cubie. */
export function yellowCornerHome(corner: number, centers: number[]): number {
  const sides = sideColors(CORNER_COLORS[corner] ?? [], 1)
  for (let i = 0; i < 4; i++) {
    const pair = U_CORNER_SIDES[i] ?? []
    const a = centers[pair[0] ?? 0]
    const b = centers[pair[1] ?? 0]
    if (sides.includes(a ?? -2) && sides.includes(b ?? -3) && a !== b) {
      return i
    }
  }
  return -1
}

/** U home slot (0..3) for a yellow edge cubie. */
export function yellowEdgeHome(edge: number, centers: number[]): number {
  const sides = sideColors(EDGE_COLORS[edge] ?? [], 1)
  const want = sides[0] ?? -1
  for (let p = 0; p <= 3; p++) {
    if (centers[U_EDGE_SIDE[p] ?? 0] === want) {
      return p
    }
  }
  return -1
}

export function crossOk(state: CubieState, centers: number[]): boolean {
  for (const e of WHITE_EDGES) {
    const home = crossHome(e, centers)
    const pos = posOfEp(state, e)
    if (pos !== home || (state.eo[pos] ?? 1) !== 0) {
      return false
    }
  }
  return true
}

export function whiteCornerOk(state: CubieState, corner: number, centers: number[]): boolean {
  const home = whiteCornerHome(corner, centers)
  const pos = posOfCp(state, corner)
  return pos === home && (state.co[pos] ?? 1) === 0
}

export function whiteLayerOk(state: CubieState, centers: number[]): boolean {
  if (!crossOk(state, centers)) {
    return false
  }
  for (const c of WHITE_CORNERS) {
    if (!whiteCornerOk(state, c, centers)) {
      return false
    }
  }
  return true
}

export function middleEdgeOk(state: CubieState, edge: number, centers: number[]): boolean {
  const home = middleHome(edge, centers)
  const pos = posOfEp(state, edge)
  return pos === home && (state.eo[pos] ?? 2) === middleExpectedEo(edge, home, centers)
}

export function f2lOk(state: CubieState, centers: number[]): boolean {
  if (!whiteLayerOk(state, centers)) {
    return false
  }
  for (const e of MIDDLE_EDGES) {
    if (!middleEdgeOk(state, e, centers)) {
      return false
    }
  }
  return true
}

export function yellowCornersOriented(state: CubieState): boolean {
  for (let p = 0; p <= 3; p++) {
    if ((state.co[p] ?? 1) !== 0) {
      return false
    }
  }
  return true
}

export function yellowCornerOk(state: CubieState, corner: number, centers: number[]): boolean {
  const home = yellowCornerHome(corner, centers)
  const pos = posOfCp(state, corner)
  return pos === home && (state.co[pos] ?? 1) === 0
}

export function yellowEdgeOk(state: CubieState, edge: number, centers: number[]): boolean {
  const home = yellowEdgeHome(edge, centers)
  const pos = posOfEp(state, edge)
  return pos === home && (state.eo[pos] ?? 1) === 0
}

/** Faces relevant to a D corner slot (U plus its two side faces). */
function slotFacesD(slot: number): string[] {
  const faces: Record<number, string[]> = {
    4: ['U', 'R', 'F'],
    5: ['U', 'L', 'F'],
    6: ['U', 'L', 'B'],
    7: ['U', 'R', 'B'],
  }
  return faces[slot] ?? noDFaces()
}

/** Faces relevant to a middle slot (U plus its two side faces). */
function slotFacesM(slot: number): string[] {
  const faces: Record<number, string[]> = {
    8: ['U', 'R', 'F'],
    9: ['U', 'L', 'F'],
    10: ['U', 'L', 'B'],
    11: ['U', 'R', 'B'],
  }
  return faces[slot] ?? noDFaces()
}

function faceSteps(faces: string[]): SearchStep[] {
  const out: SearchStep[] = []
  for (const f of faces) {
    out.push({ key: f, moves: [f] }, { key: f, moves: [`${f}'`] }, { key: f, moves: [`${f}2`] })
  }
  return out
}

export interface SolveContext {
  state: CubieState
  centers: number[]
  out: string[]
  /** 2x2 has no edges: preservation goals check corners only. */
  cornersOnly?: boolean
}

export function whiteCornersOk(state: CubieState, centers: number[]): boolean {
  for (const c of WHITE_CORNERS) {
    if (!whiteCornerOk(state, c, centers)) {
      return false
    }
  }
  return true
}

/** Preservation base: full F2L, or white corners only for 2x2. */
export function baseOk(state: CubieState, centers: number[], cornersOnly: boolean): boolean {
  if (cornersOnly) {
    return whiteCornersOk(state, centers)
  }
  return f2lOk(state, centers)
}

function doSeq(ctx: SolveContext, moves: string[]): void {
  applyCubieSequence(ctx.state, moves)
  ctx.out.push(...moves)
}

function countWrong(state: CubieState, test: (s: CubieState) => boolean): number {
  return test(state) ? 0 : 1
}

/** Stage 1: white cross on D (beginner entry, white bottom first). */
export function solveCross(ctx: SolveContext): boolean {
  const homes = new Map(WHITE_EDGES.map((e) => [e, crossHome(e, ctx.centers)]))
  if ([...homes.values()].some((h) => h < 0)) {
    return false
  }
  const goal = (s: CubieState): boolean => {
    for (const e of WHITE_EDGES) {
      const home = homes.get(e) ?? -1
      const pos = posOfEp(s, e)
      if (pos !== home || (s.eo[pos] ?? 1) !== 0) {
        return false
      }
    }
    return true
  }
  const h = (s: CubieState): number => {
    let n = 0
    for (const e of WHITE_EDGES) {
      const home = homes.get(e) ?? -1
      const pos = posOfEp(s, e)
      if (pos !== home || (s.eo[pos] ?? 1) !== 0) {
        n += 1
      }
    }
    return n
  }
  const found = idaSearch(ctx.state, { steps: primitiveSteps(), goal, h, maxDepth: 10 })
  if (found === null) {
    return false
  }
  doSeq(ctx, found)
  return true
}

/** Stage 2: white corners into D beside the cross. */
export function solveWhiteCorners(ctx: SolveContext): boolean {
  const placed: number[] = []
  for (const c of WHITE_CORNERS) {
    const home = whiteCornerHome(c, ctx.centers)
    if (home < 0) {
      return false
    }
    if (whiteCornerOk(ctx.state, c, ctx.centers)) {
      placed.push(c)
      continue
    }
    const intact = (s: CubieState): boolean => {
      if (!ctx.cornersOnly && !crossOk(s, ctx.centers)) {
        return false
      }
      for (const p of placed) {
        if (!whiteCornerOk(s, p, ctx.centers)) {
          return false
        }
      }
      return true
    }
    // Phase A: bring the corner up into U when buried in D.
    const pos = posOfCp(ctx.state, c)
    if (pos >= 4) {
      const eject = idaSearch(ctx.state, {
        steps: primitiveSteps(noDFaces()),
        goal: (s) => posOfCp(s, c) <= 3 && intact(s),
        h: (s) => (posOfCp(s, c) <= 3 ? 0 : 1) + countWrong(s, intact),
        maxDepth: 6,
      })
      if (eject === null) {
        return false
      }
      doSeq(ctx, eject)
    }
    // Phase B: insert from U using only U plus the home slot faces.
    const insert = idaSearch(ctx.state, {
      steps: faceSteps(slotFacesD(home)),
      goal: (s) => whiteCornerOk(s, c, ctx.centers) && intact(s),
      h: (s) => {
        const p = posOfCp(s, c)
        const near = p === home ? 0 : p <= 3 ? 1 : 2
        const ori = (s.co[p] ?? 1) === 0 ? 0 : 1
        return near + ori + countWrong(s, intact)
      },
      maxDepth: 9,
    })
    if (insert === null) {
      return false
    }
    doSeq(ctx, insert)
    placed.push(c)
  }
  return true
}

/** Stage 3: middle-layer edges between the two solved layers. */
export function solveMiddleLayer(ctx: SolveContext): boolean {
  const placed: number[] = []
  for (const e of MIDDLE_EDGES) {
    const home = middleHome(e, ctx.centers)
    if (home < 0) {
      return false
    }
    if (middleEdgeOk(ctx.state, e, ctx.centers)) {
      placed.push(e)
      continue
    }
    const intact = (s: CubieState): boolean => {
      if (!whiteLayerOk(s, ctx.centers)) {
        return false
      }
      for (const p of placed) {
        if (!middleEdgeOk(s, p, ctx.centers)) {
          return false
        }
      }
      return true
    }
    const pos = posOfEp(ctx.state, e)
    if (pos >= 8) {
      if (!ejectMiddleEdge(ctx, e, home, intact)) {
        return false
      }
    }
    if (!insertMiddleEdge(ctx, e, home, intact)) {
      return false
    }
    placed.push(e)
  }
  return true
}

const RIGHT_INSERT = ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F']
const TRUE_LEFT_INSERT = ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"]

const Y_ROT_MAP: Record<string, string> = { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D' }

function rotYAlg(alg: string[], times: number): string[] {
  let cur = alg.slice()
  for (let t = 0; t < times; t++) {
    cur = cur.map((m) => `${Y_ROT_MAP[m.charAt(0)] ?? m.charAt(0)}${m.slice(1)}`)
  }
  return cur
}

/** All 8 middle-insertion candidates: y-rotations of the right/left pair. */
function middleInsertCandidates(): string[][] {
  const out: string[][] = []
  for (let r = 0; r < 4; r++) {
    out.push(rotYAlg(RIGHT_INSERT, r))
    out.push(rotYAlg(TRUE_LEFT_INSERT, r))
  }
  return out
}

/** Eject alg per middle home slot (verified clean, drops the edge to U). */
function middleEjectAlg(home: number): string[] {
  if (home === 11) {
    return rotYAlg(RIGHT_INSERT, 1)
  }
  if (home === 10) {
    return rotYAlg(RIGHT_INSERT, 2)
  }
  if (home === 9) {
    return rotYAlg(RIGHT_INSERT, 3)
  }
  return RIGHT_INSERT.slice()
}

function tryUSetupInsert(
  ctx: SolveContext,
  edge: number,
  home: number,
  intact: (s: CubieState) => boolean,
): string[] | null {
  for (let k = 0; k < 4; k++) {
    for (const alg of middleInsertCandidates()) {
      const trial = cloneCubie(ctx.state)
      for (let i = 0; i < k; i++) {
        applyCubieSequence(trial, ['U'])
      }
      applyCubieSequence(trial, alg)
      const hp = posOfEp(trial, edge)
      if (hp === home && (trial.eo[hp] ?? 2) === middleExpectedEo(edge, home, ctx.centers) && intact(trial)) {
        const moves: string[] = []
        for (let i = 0; i < k; i++) {
          moves.push('U')
        }
        moves.push(...alg)
        return moves
      }
    }
  }
  return null
}

function ejectMiddleEdge(
  ctx: SolveContext,
  edge: number,
  home: number,
  intact: (s: CubieState) => boolean,
): boolean {
  const trial = cloneCubie(ctx.state)
  applyCubieSequence(trial, middleEjectAlg(home))
  if (posOfEp(trial, edge) <= 3 && intact(trial)) {
    doSeq(ctx, middleEjectAlg(home))
    return true
  }
  const eject = idaSearch(ctx.state, {
    steps: primitiveSteps(noDFaces()),
    goal: (s) => posOfEp(s, edge) <= 3 && intact(s),
    h: (s) => (posOfEp(s, edge) <= 3 ? 0 : 1) + countWrong(s, intact),
    maxDepth: 6,
  })
  if (eject === null) {
    return false
  }
  doSeq(ctx, eject)
  return true
}

function insertMiddleEdge(
  ctx: SolveContext,
  edge: number,
  home: number,
  intact: (s: CubieState) => boolean,
): boolean {
  const direct = tryUSetupInsert(ctx, edge, home, intact)
  if (direct !== null) {
    doSeq(ctx, direct)
    return true
  }
  const insert = idaSearch(ctx.state, {
    steps: faceSteps(slotFacesM(home)),
    goal: (s) => middleEdgeOk(s, edge, ctx.centers) && intact(s),
    h: (s) => {
      const p = posOfEp(s, edge)
      const near = p === home ? 0 : p <= 3 ? 1 : 2
      const ori = (s.eo[p] ?? 1) === 0 ? 0 : 1
      return near + ori + countWrong(s, intact)
    },
    maxDepth: 10,
  })
  if (insert === null) {
    return false
  }
  doSeq(ctx, insert)
  return true
}

const TOP_CROSS_ALGS: string[][] = [
  ['F', 'R', 'U', "R'", "U'", "F'"],
  ['F', 'U', 'R', "U'", "R'", "F'"],
]

function misorientedTop(state: CubieState): number {
  let n = 0
  for (let p = 0; p <= 3; p++) {
    if ((state.eo[p] ?? 1) !== 0) {
      n += 1
    }
  }
  return n
}

/** Stage 4: yellow cross on U via greedy two-look (dot/line/L), first layer untouched. */
export function solveTopCross(ctx: SolveContext): boolean {
  const goal = (s: CubieState): boolean => {
    for (let p = 0; p <= 3; p++) {
      if ((s.eo[p] ?? 1) !== 0) {
        return false
      }
    }
    return f2lOk(s, ctx.centers)
  }
  for (let iter = 0; iter < 5; iter++) {
    if (goal(ctx.state)) {
      return true
    }
    const current = misorientedTop(ctx.state)
    let best: string[] | null = null
    let bestScore = current
    for (let k = 0; k < 4; k++) {
      for (const alg of TOP_CROSS_ALGS) {
        const trial = cloneCubie(ctx.state)
        for (let i = 0; i < k; i++) {
          applyCubieSequence(trial, ['U'])
        }
        applyCubieSequence(trial, alg)
        if (!f2lOk(trial, ctx.centers)) {
          continue
        }
        const score = misorientedTop(trial)
        if (score < bestScore) {
          bestScore = score
          best = [...Array<string>(k).fill('U'), ...alg]
        }
      }
    }
    if (best === null) {
      break
    }
    doSeq(ctx, best)
  }
  if (goal(ctx.state)) {
    return true
  }
  const h = (s: CubieState): number =>
    misorientedTop(s) + countWrong(s, (v) => f2lOk(v, ctx.centers))
  const found = idaSearch(ctx.state, { steps: primitiveSteps(noDFaces()), goal, h, maxDepth: 9 })
  if (found === null) {
    return false
  }
  doSeq(ctx, found)
  return true
}

/** Stage 5: orient yellow corners with Sune-family macros. */
export function orientYellowCorners(ctx: SolveContext): boolean {
  const stable = (s: CubieState): boolean => baseOk(s, ctx.centers, ctx.cornersOnly === true)
  const goal = (s: CubieState): boolean => yellowCornersOriented(s) && stable(s)
  const h = (s: CubieState): number => {
    let n = 0
    for (let p = 0; p <= 3; p++) {
      if ((s.co[p] ?? 1) !== 0) {
        n += 1
      }
    }
    return n + countWrong(s, stable)
  }
  const found = idaSearch(ctx.state, { steps: macroSteps(), goal, h, maxDepth: 9 })
  if (found === null) {
    return false
  }
  doSeq(ctx, found)
  return true
}

/** Stage 6a: permute yellow corners with T-perm macros (edges free). */
export function permuteYellowCorners(ctx: SolveContext): boolean {
  const stable = (s: CubieState): boolean => baseOk(s, ctx.centers, ctx.cornersOnly === true)
  const goal = (s: CubieState): boolean => {
    for (const c of YELLOW_CORNERS) {
      if (!yellowCornerOk(s, c, ctx.centers)) {
        return false
      }
    }
    return stable(s)
  }
  const h = (s: CubieState): number => {
    let n = 0
    for (const c of YELLOW_CORNERS) {
      if (!yellowCornerOk(s, c, ctx.centers)) {
        n += 1
      }
    }
    return n + countWrong(s, stable)
  }
  const found = idaSearch(ctx.state, { steps: cornerPermSteps(), goal, h, maxDepth: 9 })
  if (found === null) {
    return false
  }
  doSeq(ctx, found)
  return true
}

/** Stage 6b: permute yellow edges with U-perm macros (corners stay). */
export function permuteYellowEdges(ctx: SolveContext): boolean {
  const goal = (s: CubieState): boolean => {
    for (const e of YELLOW_EDGES) {
      if (!yellowEdgeOk(s, e, ctx.centers)) {
        return false
      }
    }
    for (const c of YELLOW_CORNERS) {
      if (!yellowCornerOk(s, c, ctx.centers)) {
        return false
      }
    }
    return f2lOk(s, ctx.centers)
  }
  const h = (s: CubieState): number => {
    let n = 0
    for (const e of YELLOW_EDGES) {
      if (!yellowEdgeOk(s, e, ctx.centers)) {
        n += 1
      }
    }
    return n
  }
  const found = idaSearch(ctx.state, { steps: edgePermSteps(), goal, h, maxDepth: 7 })
  if (found === null) {
    return false
  }
  doSeq(ctx, found)
  return true
}

/** Full beginner solve on a normalized (white-D) cubie state. Returns moves or null. */
export function solve3x3Normalized(state: CubieState, centers: number[]): string[] | null {
  const ctx: SolveContext = { state, centers, out: [] }
  if (!solveCross(ctx)) {
    return null
  }
  if (!solveWhiteCorners(ctx)) {
    return null
  }
  if (!solveMiddleLayer(ctx)) {
    return null
  }
  if (!solveTopCross(ctx)) {
    return null
  }
  if (!orientYellowCorners(ctx)) {
    return null
  }
  if (!permuteYellowCorners(ctx)) {
    return null
  }
  if (!permuteYellowEdges(ctx)) {
    return null
  }
  return ctx.out
}
