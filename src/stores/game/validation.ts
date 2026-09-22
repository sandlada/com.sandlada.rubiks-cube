import type { CubeSize, Difficulty, GameSnapshot, GameStatus } from './types'
import { parseMoveTurn } from './cubeMath'

export function isCubeSize(v: unknown): v is CubeSize {
  return v === 2 || v === 3 || v === 4
}

export function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'normal' || v === 'hard'
}

export function isGameStatus(v: unknown): v is GameStatus {
  return v === 'idle' || v === 'ready' || v === 'playing' || v === 'paused' || v === 'solved' || v === 'scrambling'
}

export function isValidSnapshot(v: unknown): v is GameSnapshot {
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
  if (o['historyMoves'] !== undefined) {
    if (!Array.isArray(o['historyMoves']) || (o['historyMoves'] as unknown[]).length > 20000) {
      return false
    }
    for (const m of o['historyMoves'] as unknown[]) {
      if (typeof m !== 'string' || parseMoveTurn(m) === null) {
        return false
      }
    }
  }
  return true
}

export function parseCubeSize(value: string): CubeSize {
  const n = Number(value)
  return n === 2 || n === 3 || n === 4 ? n : 3
}

export function parseDifficulty(value: string): Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard' ? value : 'normal'
}

export function coerceCubeSize(v: unknown): CubeSize {
  return isCubeSize(v) ? v : 3
}

export function coerceDifficulty(v: unknown): Difficulty {
  return isDifficulty(v) ? v : 'normal'
}
