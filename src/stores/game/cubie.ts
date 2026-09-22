import { getSlots, parseMoveTurn, reorientStickers } from './cubeMath.ts'
import type { Vec3 } from './cubeMath.ts'
import { rotXPlus, rotYPlus } from './cubeMath.ts'
import type { FaceName } from './types.ts'

export interface CubieState {
  cp: number[]
  co: number[]
  ep: number[]
  eo: number[]
}

const CP: Record<string, number[]> = {
  U: [3, 0, 1, 2, 4, 5, 6, 7],
  D: [0, 1, 2, 3, 5, 6, 7, 4],
  F: [1, 5, 2, 3, 0, 4, 6, 7],
  B: [0, 1, 3, 7, 4, 5, 2, 6],
  L: [0, 2, 6, 3, 4, 1, 5, 7],
  R: [4, 1, 2, 0, 7, 5, 6, 3],
}

const CO: Record<string, number[]> = {
  U: [0, 0, 0, 0, 0, 0, 0, 0],
  D: [0, 0, 0, 0, 0, 0, 0, 0],
  F: [1, 2, 0, 0, 2, 1, 0, 0],
  B: [0, 0, 1, 2, 0, 0, 2, 1],
  L: [0, 1, 2, 0, 0, 2, 1, 0],
  R: [2, 0, 0, 1, 1, 0, 0, 2],
}

const EP: Record<string, number[]> = {
  U: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11],
  D: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11],
  F: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11],
  B: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7],
  L: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11],
  R: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0],
}

const EO: Record<string, number[]> = {
  U: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  D: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  F: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
  B: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
  L: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

export function createSolvedCubie(): CubieState {
  return {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
}

export function cloneCubie(s: CubieState): CubieState {
  return { cp: s.cp.slice(), co: s.co.slice(), ep: s.ep.slice(), eo: s.eo.slice() }
}

/** Apply one clockwise quarter-turn (from outside) of face to the cubie state. */
export function applyCubieQuarter(state: CubieState, face: string): void {
  const cpT = CP[face]
  const coT = CO[face]
  const epT = EP[face]
  const eoT = EO[face]
  if (cpT === undefined || coT === undefined || epT === undefined || eoT === undefined) {
    return
  }
  const ocp = state.cp.slice()
  const oco = state.co.slice()
  const oep = state.ep.slice()
  const oeo = state.eo.slice()
  for (let p = 0; p < 8; p++) {
    const q = cpT[p] ?? p
    state.cp[p] = ocp[q] ?? q
    state.co[p] = ((oco[q] ?? 0) + (coT[p] ?? 0)) % 3
  }
  for (let p = 0; p < 12; p++) {
    const q = epT[p] ?? p
    state.ep[p] = oep[q] ?? q
    state.eo[p] = ((oeo[q] ?? 0) + (eoT[p] ?? 0)) % 2
  }
}

export function applyCubieMove(state: CubieState, move: string): boolean {
  const parsed = parseMoveTurn(move)
  if (parsed === null) {
    return false
  }
  for (let i = 0; i < parsed.times; i++) {
    applyCubieQuarter(state, parsed.face)
  }
  return true
}

export function applyCubieSequence(state: CubieState, moves: string[]): void {
  for (const m of moves) {
    applyCubieMove(state, m)
  }
}

export function invertMove(move: string): string {
  if (move.endsWith("'")) {
    return move.charAt(0)
  }
  if (move.endsWith('2')) {
    return move
  }
  return `${move}'`
}

export function invertSequence(moves: string[]): string[] {
  const out: string[] = []
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i]
    if (m !== undefined) {
      out.push(invertMove(m))
    }
  }
  return out
}

interface SlotRef {
  face: number
  idx: number
}

const FACE_NORMALS: Record<FaceName, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  L: [-1, 0, 0],
  R: [1, 0, 0],
}

const FACE_BY_INDEX: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R']

function sameVec(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

/**
 * Clockwise face order around a corner viewed from outside. Twist numbers
 * compose additively only when side facelets follow this cyclic order
 * (face-index sorting breaks additivity).
 */
function clockwiseFaceOrder(position: Vec3, faces: FaceName[]): FaceName[] {
  const len = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2])
  const v: Vec3 = [-position[0] / len, -position[1] / len, -position[2] / len]
  const up: Vec3 = [0, 1, 0]
  let r: Vec3 = [v[1] * up[2] - v[2] * up[1], v[2] * up[0] - v[0] * up[2], v[0] * up[1] - v[1] * up[0]]
  const rLen = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2]) || 1
  r = [r[0] / rLen, r[1] / rLen, r[2] / rLen]
  const u: Vec3 = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]
  const scored = faces.map((face) => {
    const n = FACE_NORMALS[face] ?? [0, 0, 0]
    const x = n[0] * r[0] + n[1] * r[1] + n[2] * r[2]
    const y = n[0] * u[0] + n[1] * u[1] + n[2] * u[2]
    return { face, angle: Math.atan2(y, x) }
  })
  scored.sort((a, b) => b.angle - a.angle)
  return scored.map((s) => s.face)
}

/** Cyclic face order per corner position, shared by 3x3 and 2x2 converters. */
export const CORNER_FACE_ORDER: FaceName[][] = (() => {
  const corners: Record<string, number> = {
    '1,1,1': 0, '-1,1,1': 1, '-1,1,-1': 2, '1,1,-1': 3,
    '1,-1,1': 4, '-1,-1,1': 5, '-1,-1,-1': 6, '1,-1,-1': 7,
  }
  const out: FaceName[][] = Array.from({ length: 8 }, () => ['U', 'F', 'R'])
  for (const [key, ci] of Object.entries(corners)) {
    const [x, y, z] = key.split(',').map(Number) as [number, number, number]
    const faces: FaceName[] = [x === 1 ? 'R' : 'L', y === 1 ? 'U' : 'D', z === 1 ? 'F' : 'B']
    const ordered = clockwiseFaceOrder([x, y, z], faces)
    const ud = y === 1 ? 'U' : 'D'
    const start = ordered.indexOf(ud as FaceName)
    out[ci] = [0, 1, 2].map((k) => ordered[(start + k) % 3] ?? (ud as FaceName))
  }
  return out
})()

function buildSlotMaps(): { corners: SlotRef[][]; edges: SlotRef[][] } {
  const { slots } = getSlots(3)
  const byPos = new Map<string, { face: number; idx: number; normal: Vec3 }[]>()
  for (const s of slots) {
    const key = `${s.pos[0]},${s.pos[1]},${s.pos[2]}`
    const arr = byPos.get(key) ?? []
    arr.push({ face: s.face, idx: s.row * 3 + s.col, normal: s.normal })
    byPos.set(key, arr)
  }
  const cornerCoords: Record<string, number> = {
    '1,1,1': 0, '-1,1,1': 1, '-1,1,-1': 2, '1,1,-1': 3,
    '1,-1,1': 4, '-1,-1,1': 5, '-1,-1,-1': 6, '1,-1,-1': 7,
  }
  const edgeCoords: Record<string, number> = {
    '1,1,0': 0, '0,1,1': 1, '-1,1,0': 2, '0,1,-1': 3,
    '1,-1,0': 4, '0,-1,1': 5, '-1,-1,0': 6, '0,-1,-1': 7,
    '1,0,1': 8, '-1,0,1': 9, '-1,0,-1': 10, '1,0,-1': 11,
  }
  const corners: SlotRef[][] = Array.from({ length: 8 }, () => [])
  const edges: SlotRef[][] = Array.from({ length: 12 }, () => [])
  for (const [key, arr] of byPos) {
    const ci = cornerCoords[key]
    if (ci !== undefined && arr.length === 3) {
      const wantOrder = CORNER_FACE_ORDER[ci] ?? ['U', 'F', 'R']
      const byFace = new Map(arr.map((s) => [FACE_BY_INDEX[s.face] as FaceName, s]))
      const refs = wantOrder.map((f) => {
        const s = byFace.get(f)
        return { face: s?.face ?? 0, idx: s?.idx ?? 0 }
      })
      if (refs.length === 3 && refs[0] !== undefined && refs[1] !== undefined && refs[2] !== undefined) {
        corners[ci] = [refs[0] as SlotRef, refs[1] as SlotRef, refs[2] as SlotRef]
      }
      continue
    }
    const ei = edgeCoords[key]
    if (ei !== undefined && arr.length === 2) {
      const prim = arr.find((s) => Math.abs(s.normal[1]) === 1) ?? arr.find((s) => Math.abs(s.normal[2]) === 1) ?? arr[0]
      const sec = arr.find((s) => s !== prim) ?? arr[1]
      if (prim !== undefined && sec !== undefined) {
        edges[ei] = [
          { face: prim.face, idx: prim.idx },
          { face: sec.face, idx: sec.idx },
        ]
      }
    }
  }
  return { corners, edges }
}

const SLOT_MAPS = buildSlotMaps()

function homeKey(colors: number[]): string {
  return colors.slice().sort((a, b) => a - b).join(',')
}

const CORNER_HOME_KEYS = (() => {
  const solved: number[][] = []
  for (let f = 0; f < 6; f++) {
    solved.push(new Array<number>(9).fill(f))
  }
  return SLOT_MAPS.corners.map((sl) => homeKey(sl.map((s) => solved[s.face]?.[s.idx] ?? -1)))
})()

const EDGE_HOME_KEYS = (() => {
  const solved: number[][] = []
  for (let f = 0; f < 6; f++) {
    solved.push(new Array<number>(9).fill(f))
  }
  return SLOT_MAPS.edges.map((sl) => homeKey(sl.map((s) => solved[s.face]?.[s.idx] ?? -1)))
})()

function colorAt(stickers: number[][], s: SlotRef): number {
  return stickers[s.face]?.[s.idx] ?? -1
}

/** Convert 3x3 stickers to cubie state. Returns null when stickers are inconsistent. */
export function stickersToCubie(stickers: number[][]): CubieState | null {
  if (stickers.length !== 6) {
    return null
  }
  const state = createSolvedCubie()
  for (let p = 0; p < 8; p++) {
    const sl = SLOT_MAPS.corners[p]
    if (sl === undefined || sl.length !== 3) {
      return null
    }
    const colors = sl.map((s) => colorAt(stickers, s))
    const key = homeKey(colors)
    const cubie = CORNER_HOME_KEYS.indexOf(key)
    if (cubie < 0) {
      return null
    }
    const udColor = colors.includes(0) ? 0 : 1
    const udSlot = colors[0] === udColor ? 0 : colors[1] === udColor ? 1 : 2
    state.cp[p] = cubie
    state.co[p] = udSlot
  }
  for (let p = 0; p < 12; p++) {
    const sl = SLOT_MAPS.edges[p]
    if (sl === undefined || sl.length !== 2) {
      return null
    }
    const colors = sl.map((s) => colorAt(stickers, s))
    const key = homeKey(colors)
    const edge = EDGE_HOME_KEYS.indexOf(key)
    if (edge < 0) {
      return null
    }
    const primaryColor = colors.includes(0) ? 0 : colors.includes(1) ? 1 : colors.includes(2) ? 2 : 3
    state.ep[p] = edge
    state.eo[p] = colors[0] === primaryColor ? 0 : 1
  }
  return state
}

/** Convert 2x2 stickers to corners-only cubie state (edges ignored). */
export function stickersToCorners(stickers: number[][]): CubieState | null {
  if (stickers.length !== 6) {
    return null
  }
  const n = 2
  const { slots } = getSlots(n)
  const byPos = new Map<string, { face: number; idx: number; normal: Vec3 }[]>()
  for (const s of slots) {
    const key = `${s.pos[0]},${s.pos[1]},${s.pos[2]}`
    const arr = byPos.get(key) ?? []
    arr.push({ face: s.face, idx: s.row * n + s.col, normal: s.normal })
    byPos.set(key, arr)
  }
  const coords: Record<string, number> = {
    '0.5,0.5,0.5': 0, '-0.5,0.5,0.5': 1, '-0.5,0.5,-0.5': 2, '0.5,0.5,-0.5': 3,
    '0.5,-0.5,0.5': 4, '-0.5,-0.5,0.5': 5, '-0.5,-0.5,-0.5': 6, '0.5,-0.5,-0.5': 7,
  }
  const state = createSolvedCubie()
  for (const [key, arr] of byPos) {
    const p = coords[key]
    if (p === undefined || arr.length !== 3) {
      continue
    }
    const wantOrder = CORNER_FACE_ORDER[p] ?? ['U', 'F', 'R']
    const byFace = new Map(arr.map((s) => [FACE_BY_INDEX[s.face] as FaceName, s]))
    const ordered = wantOrder.map((f) => byFace.get(f)).filter((s) => s !== undefined)
    if (ordered.length !== 3) {
      continue
    }
    const colors = ordered.map((s) => stickers[s.face]?.[s.idx] ?? -1)
    const keyOf = homeKey(colors)
    const cubie = CORNER_HOME_KEYS.indexOf(keyOf)
    if (cubie < 0) {
      return null
    }
    const udColor = colors.includes(0) ? 0 : 1
    state.cp[p] = cubie
    state.co[p] = colors[0] === udColor ? 0 : colors[1] === udColor ? 1 : 2
  }
  return state
}

/** Face-letter map induced by whole-cube spins: original face -> rotated face. */
export function faceLetterMapForSpins(spins: ReadonlyArray<(v: Vec3) => Vec3>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [face, normal] of Object.entries(FACE_NORMALS) as Array<[FaceName, Vec3]>) {
    let v = normal
    for (const spin of spins) {
      v = spin(v)
    }
    map[face] = normalToFace(v) ?? face
  }
  return map
}

function normalToFace(n: Vec3): FaceName | null {
  for (const [face, normal] of Object.entries(FACE_NORMALS) as Array<[FaceName, Vec3]>) {
    if (sameVec(normal, n)) {
      return face
    }
  }
  return null
}

type SpinFn = (v: Vec3) => Vec3

/** BFS over the 24 orientations for spins mapping downFace -> D and frontFace -> F. */
export function findSpinsFor(downFace: FaceName, frontFace: FaceName): SpinFn[] | null {
  const startD = FACE_NORMALS[downFace]
  const startF = FACE_NORMALS[frontFace]
  if (startD === undefined || startF === undefined) {
    return null
  }
  const targetD: Vec3 = [0, -1, 0]
  const targetF: Vec3 = [0, 0, 1]
  interface Node {
    d: Vec3
    f: Vec3
    seq: SpinFn[]
  }
  const gens: SpinFn[] = [rotXPlus, rotYPlus]
  const seen = new Set<string>()
  const queue: Node[] = [{ d: startD, f: startF, seq: [] }]
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) {
      break
    }
    if (sameVec(node.d, targetD) && sameVec(node.f, targetF)) {
      return node.seq
    }
    const key = `${node.d.join(',')}|${node.f.join(',')}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    for (const g of gens) {
      queue.push({ d: g(node.d), f: g(node.f), seq: [...node.seq, g] })
    }
  }
  return null
}

/** Face-letter map induced by spins: original face -> normalized face. */
export function faceMapForSpins(spins: SpinFn[]): Record<FaceName, FaceName> {
  const out = {} as Record<FaceName, FaceName>
  for (const [face, normal] of Object.entries(FACE_NORMALS) as Array<[FaceName, Vec3]>) {
    let v = normal
    for (const spin of spins) {
      v = spin(v)
    }
    out[face] = normalToFace(v) ?? face
  }
  return out
}

/** Remap one move's face letter through a face map; suffix and case preserved. */
export function remapMove(move: string, map: Record<string, string>): string {
  const face = move.charAt(0)
  const upper = face.toUpperCase()
  const mappedUpper = map[upper] ?? map[face] ?? upper
  const target = face === upper ? mappedUpper : mappedUpper.toLowerCase()
  return `${target}${move.slice(1)}`
}

export function remapSequence(moves: string[], map: Record<string, string>): string[] {
  return moves.map((m) => remapMove(m, map))
}

const OPPOSITE: Record<FaceName, FaceName> = { U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L' }

export interface NormalizedView {
  stickers: number[][]
  /** Convert a normalized-frame move back to the original frame. */
  unmap: (move: string) => string
}

/**
 * Software-only reorientation putting white on D. 3x3 uses the white center;
 * 2x2 (no centers) uses the face holding the most white stickers.
 */
export function normalizeWhiteDown(stickers: number[][], n: number): NormalizedView | null {
  let downFace: FaceName | null = null
  if (n === 3) {
    const order: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R']
    const index: Record<FaceName, number> = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 }
    for (const face of order) {
      const row = stickers[index[face] ?? 0]
      if (row !== undefined && row[4] === 0) {
        downFace = face
        break
      }
    }
  } else {
    const index: Record<FaceName, number> = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 }
    let best: FaceName = 'D'
    let bestCount = -1
    for (const face of ['U', 'D', 'F', 'B', 'L', 'R'] as FaceName[]) {
      const row = stickers[index[face] ?? 0] ?? []
      const count = row.filter((c) => c === 0).length
      if (count > bestCount) {
        bestCount = count
        best = face
      }
    }
    downFace = best
  }
  if (downFace === null) {
    return null
  }
  const upFace = OPPOSITE[downFace] ?? 'U'
  const frontFace: FaceName = (['F', 'R', 'B', 'L'] as FaceName[]).find((f) => f !== downFace && f !== upFace) ?? 'F'
  const spins = findSpinsFor(downFace, frontFace)
  if (spins === null) {
    return null
  }
  const map = faceMapForSpins(spins)
  const inverse: Record<string, string> = {}
  for (const [from, to] of Object.entries(map)) {
    inverse[to] = from
  }
  return {
    stickers: reorientStickers(stickers, n, spins),
    unmap: (move: string) => remapMove(move, inverse),
  }
}
