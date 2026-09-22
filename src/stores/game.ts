import { defineStore } from 'pinia'
import { ref } from 'vue'

export type CubeSize = 2 | 3 | 4
export type Difficulty = 'easy' | 'normal' | 'hard'
export type GameStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'solved' | 'scrambling'
export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R'

export const FACE_ORDER = ['U', 'D', 'F', 'B', 'L', 'R'] as const

export interface GameSnapshot {
  id: string
  size: CubeSize
  difficulty: Difficulty
  stickers: number[][]
  moves: string[]
  elapsedMs: number
  status: GameStatus
  updatedAt: number
}

export const AUTOSAVE_KEY = 'rubiks.autosave.v1'

type Vec3 = [number, number, number]

interface StickerSlot {
  face: number
  row: number
  col: number
  pos: Vec3
  normal: Vec3
}

/**
 * Sticker model (3D agent: mirror this exactly when rendering).
 * - faces order ['U','D','F','B','L','R'], colors 0..5
 *   (0 white U, 1 yellow D, 2 green F, 3 blue B, 4 orange L, 5 red R).
 * - each face array length n*n, row-major viewed from OUTSIDE the cube:
 *   - U (top, camera above, B edge on top): x = c-h, z = r-h (row 0 -> B).
 *   - D (bottom, camera below, F edge on top): x = c-h, z = h-r (row 0 -> F).
 *   - F (front): x = c-h, y = h-r (row 0 -> U, col 0 -> L).
 *   - B (back, viewed from behind): x = h-c, y = h-r (row 0 -> U, col 0 -> R).
 *   - L (left, viewed from the left): z = c-h, y = h-r (row 0 -> U, col 0 -> B).
 *   - R (right, viewed from the right): z = h-c, y = h-r (row 0 -> U, col 0 -> F).
 *   where h = (n-1)/2, x = right, y = up, z = front.
 * - Moves: faces UDLRFB + suffix '' (90 deg clockwise seen from outside
 *   that face) | "'" (counter-clockwise) | '2' (180 deg).
 */
function buildSlots(n: number): { slots: StickerSlot[]; byKey: Map<string, StickerSlot> } {
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

function slotKey(pos: Vec3, normal: Vec3): string {
  return `${pos[0]},${pos[1]},${pos[2]},${normal[0]},${normal[1]},${normal[2]}`
}

function rotXPlus(v: Vec3): Vec3 {
  return [v[0], -v[2], v[1]]
}
function rotXMinus(v: Vec3): Vec3 {
  return [v[0], v[2], -v[1]]
}
function rotYPlus(v: Vec3): Vec3 {
  return [v[2], v[1], -v[0]]
}
function rotYMinus(v: Vec3): Vec3 {
  return [-v[2], v[1], v[0]]
}
function rotZPlus(v: Vec3): Vec3 {
  return [-v[1], v[0], v[2]]
}
function rotZMinus(v: Vec3): Vec3 {
  return [v[1], -v[0], v[2]]
}

function makeSolved(n: number): number[][] {
  const out: number[][] = []
  for (let f = 0; f < 6; f++) {
    out.push(new Array<number>(n * n).fill(f))
  }
  return out
}

function cloneStickers(s: number[][]): number[][] {
  return s.map((face) => face.slice())
}

function randomId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 4294967295).toString(36)}`
}

function isCubeSize(v: unknown): v is CubeSize {
  return v === 2 || v === 3 || v === 4
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'normal' || v === 'hard'
}

function isGameStatus(v: unknown): v is GameStatus {
  return v === 'idle' || v === 'ready' || v === 'playing' || v === 'paused' || v === 'solved' || v === 'scrambling'
}

function isValidSnapshot(v: unknown): v is GameSnapshot {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const o = v as Record<string, unknown>
  if (typeof o['id'] !== 'string' || !isCubeSize(o['size']) || !isDifficulty(o['difficulty'])) {
    return false
  }
  const n = o['size'] as number
  if (!Array.isArray(o['stickers']) || (o['stickers'] as unknown[]).length !== 6) {
    return false
  }
  for (const face of o['stickers'] as unknown[]) {
    if (!Array.isArray(face) || (face as unknown[]).length !== n * n) {
      return false
    }
    for (const s of face as unknown[]) {
      if (typeof s !== 'number' || !Number.isInteger(s) || s < 0 || s > 5) {
        return false
      }
    }
  }
  if (!Array.isArray(o['moves'])) {
    return false
  }
  for (const m of o['moves'] as unknown[]) {
    if (typeof m !== 'string') {
      return false
    }
  }
  if (typeof o['elapsedMs'] !== 'number' || (o['elapsedMs'] as number) < 0) {
    return false
  }
  if (!isGameStatus(o['status']) || typeof o['updatedAt'] !== 'number') {
    return false
  }
  return true
}

/**
 * Scramble lengths ARE the difficulty: each entry is one scramble turn
 * (a single face twist; "2" suffix still counts as one turn).
 * 2x2: easy 5 / normal 10 / hard 20
 * 3x3: easy 10 / normal 20 / hard 40
 * 4x4: easy 15 / normal 30 / hard 60
 */
function scrambleLength(size: CubeSize, difficulty: Difficulty): number {
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

const SCRAMBLE_FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const
const SCRAMBLE_SUFFIXES = ['', "'", '2'] as const

export const useGameStore = defineStore('game', () => {
  const size = ref<CubeSize>(3)
  const difficulty = ref<Difficulty>('normal')
  const stickers = ref<number[][]>(makeSolved(3))
  const moves = ref<string[]>([])
  const status = ref<GameStatus>('idle')
  const elapsedMs = ref(0)
  const scrambleMoves = ref<string[]>([])
  const scrambleDone = ref(0)

  // Timer internals (not persisted state): accumulated ms + performance.now anchor.
  let accumMs = 0
  let startedAt = 0
  let tickHandle: number | undefined

  function stopTick(): void {
    if (tickHandle !== undefined) {
      accumMs += performance.now() - startedAt
      elapsedMs.value = Math.round(accumMs)
      window.clearInterval(tickHandle)
      tickHandle = undefined
    }
  }

  function startTick(): void {
    if (tickHandle !== undefined) {
      return
    }
    startedAt = performance.now()
    tickHandle = window.setInterval(() => {
      elapsedMs.value = Math.round(accumMs + performance.now() - startedAt)
    }, 100)
  }

  /** Rotate the CURRENT stickers for one face turn. times: 1 = cw, 2 = 180, 3 = ccw. */
  function rotateCurrent(faceLetter: string, times: number): void {
    const n = size.value
    const h = (n - 1) / 2
    const { slots, byKey } = buildSlots(n)
    const axis = faceLetter === 'U' || faceLetter === 'D' ? 1 : faceLetter === 'F' || faceLetter === 'B' ? 2 : 0
    const layer = faceLetter === 'U' || faceLetter === 'F' || faceLetter === 'R' ? h : -h
    const spin =
      faceLetter === 'U'
        ? rotYMinus
        : faceLetter === 'D'
          ? rotYPlus
          : faceLetter === 'F'
            ? rotZMinus
            : faceLetter === 'B'
              ? rotZPlus
              : faceLetter === 'R'
                ? rotXMinus
                : rotXPlus
    const next = cloneStickers(stickers.value)
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
        next[target.face][target.row * n + target.col] = stickers.value[s.face][s.row * n + s.col]
      }
    }
    stickers.value = next
  }

  function parseMove(move: string): { face: string; times: number } | null {
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

  function checkSolved(): boolean {
    const n = size.value
    const current = stickers.value
    if (current.length !== 6) {
      return false
    }
    for (const face of current) {
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

  function newGame(newSize: CubeSize, newDifficulty: Difficulty): void {
    stopTick()
    size.value = isCubeSize(newSize) ? newSize : 3
    difficulty.value = isDifficulty(newDifficulty) ? newDifficulty : 'normal'
    stickers.value = makeSolved(size.value)
    moves.value = []
    accumMs = 0
    elapsedMs.value = 0
    const total = scrambleLength(size.value, difficulty.value)
    const queue: string[] = []
    let prevFace = ''
    for (let i = 0; i < total; i++) {
      let face = SCRAMBLE_FACES[Math.floor(Math.random() * SCRAMBLE_FACES.length)]
      while (face === prevFace) {
        face = SCRAMBLE_FACES[Math.floor(Math.random() * SCRAMBLE_FACES.length)]
      }
      prevFace = face
      const suffix = SCRAMBLE_SUFFIXES[Math.floor(Math.random() * SCRAMBLE_SUFFIXES.length)]
      queue.push(`${face}${suffix}`)
    }
    scrambleMoves.value = queue
    scrambleDone.value = 0
    status.value = 'scrambling'
  }

  function applyScrambleMove(move: string): void {
    const parsed = parseMove(move)
    if (parsed === null) {
      return
    }
    rotateCurrent(parsed.face, parsed.times)
    scrambleDone.value += 1
  }

  function finishScramble(): void {
    if (checkSolved()) {
      rotateCurrent('R', 1)
      scrambleMoves.value.push('R')
      scrambleDone.value += 1
    }
    status.value = 'ready'
  }

  function applyMove(move: string): boolean {
    const parsed = parseMove(move)
    if (parsed === null) {
      return checkSolved()
    }
    rotateCurrent(parsed.face, parsed.times)
    moves.value.push(move)
    const solved = checkSolved()
    if (solved) {
      stopTick()
      status.value = 'solved'
    }
    return solved
  }

  function setStickers(s: number[][]): void {
    stickers.value = cloneStickers(s)
  }

  /**
   * Whole-cube reorientation: makes the given face the new front (F).
   * Rotation table (normals U [0,1,0], D [0,-1,0], F [0,0,1],
   * B [0,0,-1], R [1,0,0], L [-1,0,0]; rot* helpers rotate about
   * the +axes by right-hand-rule +90 deg):
   * - 'F' -> noop, returns false (already front).
   * - 'B' -> rotYPlus twice (180 deg about y: B->F, U stays U).
   * - 'R' -> rotYMinus once; 'L' -> rotYPlus once (U stays U).
   * - 'U' -> rotXPlus once (top becomes old B);
   *   'D' -> rotXMinus once (top becomes old F).
   * Applies to ALL slots (no layer filter). Records nothing in moves
   * and leaves timer/status untouched. Caller persists via saveAutosave()
   * and resets the view.
   */
  function setFrontFace(face: FaceName): boolean {
    if (face !== 'U' && face !== 'D' && face !== 'F' && face !== 'B' && face !== 'L' && face !== 'R') {
      return false
    }
    if (face === 'F') {
      return false
    }
    const spins: Array<(v: Vec3) => Vec3> =
      face === 'B'
        ? [rotYPlus, rotYPlus]
        : face === 'R'
          ? [rotYMinus]
          : face === 'L'
            ? [rotYPlus]
            : face === 'U'
              ? [rotXPlus]
              : [rotXMinus]
    const n = size.value
    const { slots, byKey } = buildSlots(n)
    const next = cloneStickers(stickers.value)
    for (const s of slots) {
      let p = s.pos
      let nr = s.normal
      for (const spin of spins) {
        p = spin(p)
        nr = spin(nr)
      }
      const target = byKey.get(slotKey(p, nr))
      if (target !== undefined) {
        next[target.face][target.row * n + target.col] = stickers.value[s.face][s.row * n + s.col]
      }
    }
    stickers.value = next
    return true
  }

  function loadSnapshot(snap: GameSnapshot): void {
    stopTick()
    size.value = snap.size
    difficulty.value = snap.difficulty
    stickers.value = cloneStickers(snap.stickers)
    moves.value = snap.moves.slice()
    accumMs = snap.elapsedMs
    elapsedMs.value = snap.elapsedMs
    status.value = snap.status
  }

  function serialize(): GameSnapshot {
    return {
      id: randomId(),
      size: size.value,
      difficulty: difficulty.value,
      stickers: cloneStickers(stickers.value),
      moves: moves.value.slice(),
      elapsedMs: elapsedMs.value,
      status: status.value,
      updatedAt: Date.now(),
    }
  }

  function startTimer(): void {
    if (tickHandle !== undefined) {
      return
    }
    if (status.value === 'ready' || status.value === 'paused' || status.value === 'idle') {
      status.value = 'playing'
    }
    startTick()
  }

  function pauseTimer(): void {
    if (tickHandle === undefined) {
      return
    }
    stopTick()
    if (status.value === 'playing') {
      status.value = 'paused'
    }
  }

  function resumeTimer(): void {
    if (tickHandle !== undefined || status.value === 'solved') {
      return
    }
    status.value = 'playing'
    startTick()
  }

  function stopTimer(): void {
    stopTick()
  }

  function resetTimer(): void {
    stopTick()
    accumMs = 0
    elapsedMs.value = 0
  }

  function saveAutosave(): void {
    try {
      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serialize()))
    } catch {
      // storage unavailable or quota exceeded — autosave is best-effort
    }
  }

  function loadAutosave(): GameSnapshot | null {
    try {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY)
      if (raw === null) {
        return null
      }
      const parsed: unknown = JSON.parse(raw)
      if (!isValidSnapshot(parsed)) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  function clearAutosave(): void {
    try {
      window.localStorage.removeItem(AUTOSAVE_KEY)
    } catch {
      // ignore — nothing to clear
    }
  }

  function hasAutosave(): boolean {
    return loadAutosave() !== null
  }

  function isSolved(): boolean {
    return checkSolved()
  }

  return {
    size,
    difficulty,
    stickers,
    moves,
    status,
    elapsedMs,
    scrambleMoves,
    scrambleDone,
    newGame,
    applyMove,
    applyScrambleMove,
    finishScramble,
    setStickers,
    setFrontFace,
    loadSnapshot,
    serialize,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    saveAutosave,
    loadAutosave,
    clearAutosave,
    hasAutosave,
    isSolved,
  }
})
