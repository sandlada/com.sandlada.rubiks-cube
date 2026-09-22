/**
 * Pure sticker geometry. Mirror of the 3D contract, no store / DOM access.
 * - faces order ['U','D','F','B','L','R'], colors 0..5
 * - each face row-major viewed from OUTSIDE, see original buildSlots docs.
 * - moves UDLRFB + '' / "'" / '2' (clockwise from outside).
 */

export type Vec3 = [number, number, number]

export interface StickerSlot {
  face: number
  row: number
  col: number
  pos: Vec3
  normal: Vec3
}

export interface ParsedTurn {
  face: string
  times: number
}

function buildSlotsUncached(n: number): { slots: StickerSlot[]; byKey: Map<string, StickerSlot> } {
  const h = (n - 1) / 2
  const slots: StickerSlot[] = []
  for (let face = 0; face < 6; face++) {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        let pos: Vec3
        let normal: Vec3
        if (face === 0) {
          pos = [col - h, h, row - h]
          normal = [0, 1, 0]
        } else if (face === 1) {
          pos = [col - h, -h, h - row]
          normal = [0, -1, 0]
        } else if (face === 2) {
          pos = [col - h, h - row, h]
          normal = [0, 0, 1]
        } else if (face === 3) {
          pos = [h - col, h - row, -h]
          normal = [0, 0, -1]
        } else if (face === 4) {
          pos = [-h, h - row, col - h]
          normal = [-1, 0, 0]
        } else {
          pos = [h, h - row, h - col]
          normal = [1, 0, 0]
        }
        slots.push({ face, row, col, pos, normal })
      }
    }
  }
  const byKey = new Map<string, StickerSlot>()
  for (const s of slots) {
    byKey.set(slotKey(s.pos, s.normal), s)
  }
  return { slots, byKey }
}

const slotsCache = new Map<number, { slots: StickerSlot[]; byKey: Map<string, StickerSlot> }>()

/** Memoized slot table per cube size (n is only 2 | 3 | 4). */
export function getSlots(n: number): { slots: StickerSlot[]; byKey: Map<string, StickerSlot> } {
  const hit = slotsCache.get(n)
  if (hit !== undefined) {
    return hit
  }
  const built = buildSlotsUncached(n)
  slotsCache.set(n, built)
  return built
}

export function slotKey(pos: Vec3, normal: Vec3): string {
  return `${pos[0]},${pos[1]},${pos[2]},${normal[0]},${normal[1]},${normal[2]}`
}

export function rotXPlus(v: Vec3): Vec3 {
  return [v[0], -v[2], v[1]]
}
export function rotXMinus(v: Vec3): Vec3 {
  return [v[0], v[2], -v[1]]
}
export function rotYPlus(v: Vec3): Vec3 {
  return [v[2], v[1], -v[0]]
}
export function rotYMinus(v: Vec3): Vec3 {
  return [-v[2], v[1], v[0]]
}
export function rotZPlus(v: Vec3): Vec3 {
  return [-v[1], v[0], v[2]]
}
export function rotZMinus(v: Vec3): Vec3 {
  return [v[1], -v[0], v[2]]
}

export function makeSolved(n: number): number[][] {
  const out: number[][] = []
  for (let f = 0; f < 6; f++) {
    out.push(new Array<number>(n * n).fill(f))
  }
  return out
}

export function cloneStickers(s: number[][]): number[][] {
  return s.map((face) => face.slice())
}

export function parseMoveTurn(move: string): ParsedTurn | null {
  if (move.length < 1 || move.length > 2) {
    return null
  }
  const face = move.charAt(0)
  if (face !== 'U' && face !== 'D' && face !== 'L' && face !== 'R' && face !== 'F' && face !== 'B') {
    return null
  }
  if (move.length === 1) {
    return { face, times: 1 }
  }
  const suffix = move.charAt(1)
  if (suffix === "'") {
    return { face, times: 3 }
  }
  if (suffix === '2') {
    return { face, times: 2 }
  }
  return null
}

function spinFor(faceLetter: string): (v: Vec3) => Vec3 {
  if (faceLetter === 'U') {
    return rotYMinus
  }
  if (faceLetter === 'D') {
    return rotYPlus
  }
  if (faceLetter === 'F') {
    return rotZMinus
  }
  if (faceLetter === 'B') {
    return rotZPlus
  }
  if (faceLetter === 'R') {
    return rotXMinus
  }
  return rotXPlus
}

/** Pure single-layer rotation. Returns a new stickers matrix. */
export function rotateStickers(
  stickers: number[][],
  n: number,
  faceLetter: string,
  times: number,
): number[][] {
  const h = (n - 1) / 2
  const { slots, byKey } = getSlots(n)
  const axis = faceLetter === 'U' || faceLetter === 'D' ? 1 : faceLetter === 'F' || faceLetter === 'B' ? 2 : 0
  const layer = faceLetter === 'U' || faceLetter === 'F' || faceLetter === 'R' ? h : -h
  const spin = spinFor(faceLetter)
  const next = cloneStickers(stickers)
  for (const s of slots) {
    const onLayer = axis === 0 ? s.pos[0] === layer : axis === 1 ? s.pos[1] === layer : s.pos[2] === layer
    if (!onLayer) {
      continue
    }
    let p = s.pos
    let nr = s.normal
    for (let i = 0; i < times; i++) {
      p = spin(p)
      nr = spin(nr)
    }
    const target = byKey.get(slotKey(p, nr))
    if (target !== undefined) {
      next[target.face][target.row * n + target.col] = stickers[s.face][s.row * n + s.col]
    }
  }
  return next
}

/** Pure whole-cube reorientation. Returns a new stickers matrix. */
export function reorientStickers(
  stickers: number[][],
  n: number,
  spins: ReadonlyArray<(v: Vec3) => Vec3>,
): number[][] {
  const { slots, byKey } = getSlots(n)
  const next = cloneStickers(stickers)
  for (const s of slots) {
    let p = s.pos
    let nr = s.normal
    for (const spin of spins) {
      p = spin(p)
      nr = spin(nr)
    }
    const target = byKey.get(slotKey(p, nr))
    if (target !== undefined) {
      next[target.face][target.row * n + target.col] = stickers[s.face][s.row * n + s.col]
    }
  }
  return next
}

export function spinsForFrontFace(face: string): Array<(v: Vec3) => Vec3> | null {
  if (face === 'F') {
    return null
  }
  if (face === 'B') {
    return [rotYPlus, rotYPlus]
  }
  if (face === 'R') {
    return [rotYMinus]
  }
  if (face === 'L') {
    return [rotYPlus]
  }
  if (face === 'U') {
    return [rotXPlus]
  }
  if (face === 'D') {
    return [rotXMinus]
  }
  return null
}

export function checkSolvedIn(stickers: number[][], n: number): boolean {
  if (stickers.length !== 6) {
    return false
  }
  for (const face of stickers) {
    if (face.length !== n * n) {
      return false
    }
    const first = face[0]
    for (const s of face) {
      if (s !== first) {
        return false
      }
    }
  }
  return true
}
