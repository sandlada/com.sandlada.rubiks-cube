import { createStorage, jsonCodec } from '@utils/storage'
import { randomId } from '@utils/query'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AUTOSAVE_KEY } from './constants'
import {
  checkSolvedIn,
  cloneStickers,
  makeSolved,
  parseMoveTurn,
  reorientStickers,
  rotateStickers,
  spinsForFrontFace,
} from './cubeMath'
import { generateScrambleMoves } from './scramble'
import { createTimer } from './timer'
import type { CubeSize, Difficulty, FaceName, GameSnapshot, GameStatus } from './types'
import { coerceCubeSize, coerceDifficulty, isValidSnapshot } from './validation'

const autosaveStorage = createStorage<GameSnapshot>(AUTOSAVE_KEY, jsonCodec(isValidSnapshot))

export const useGameStore = defineStore('game', () => {
  const size = ref<CubeSize>(3)
  const difficulty = ref<Difficulty>('normal')
  const stickers = ref<number[][]>(makeSolved(3))
  const moves = ref<string[]>([])
  const status = ref<GameStatus>('idle')
  const elapsedMs = ref(0)
  const scrambleMoves = ref<string[]>([])
  const scrambleDone = ref(0)

  const timer = createTimer((ms: number) => {
    elapsedMs.value = ms
  })

  function stopTick(): void {
    const ms = timer.stop()
    elapsedMs.value = ms
  }

  function startTick(): void {
    timer.start()
  }

  /** Rotate the CURRENT stickers for one face turn. times: 1 = cw, 2 = 180, 3 = ccw. */
  function rotateCurrent(faceLetter: string, times: number): void {
    stickers.value = rotateStickers(stickers.value, size.value, faceLetter, times)
  }

  function checkSolved(): boolean {
    return checkSolvedIn(stickers.value, size.value)
  }

  function newGame(newSize: CubeSize, newDifficulty: Difficulty): void {
    stopTick()
    size.value = coerceCubeSize(newSize)
    difficulty.value = coerceDifficulty(newDifficulty)
    stickers.value = makeSolved(size.value)
    moves.value = []
    timer.reset()
    elapsedMs.value = 0
    scrambleMoves.value = generateScrambleMoves(size.value, difficulty.value)
    scrambleDone.value = 0
    status.value = 'scrambling'
  }

  function applyScrambleMove(move: string): void {
    const parsed = parseMoveTurn(move)
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
    const parsed = parseMoveTurn(move)
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
   * Records nothing in moves and leaves timer/status untouched.
   */
  function setFrontFace(face: FaceName): boolean {
    const spins = spinsForFrontFace(face)
    if (spins === null) {
      return false
    }
    stickers.value = reorientStickers(stickers.value, size.value, spins)
    return true
  }

  function loadSnapshot(snap: GameSnapshot): void {
    stopTick()
    size.value = snap.size
    difficulty.value = snap.difficulty
    stickers.value = cloneStickers(snap.stickers)
    moves.value = snap.moves.slice()
    timer.setElapsed(snap.elapsedMs)
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
    if (timer.isRunning()) {
      return
    }
    if (status.value === 'ready' || status.value === 'paused' || status.value === 'idle') {
      status.value = 'playing'
    }
    startTick()
  }

  function pauseTimer(): void {
    if (!timer.isRunning()) {
      return
    }
    stopTick()
    if (status.value === 'playing') {
      status.value = 'paused'
    }
  }

  function resumeTimer(): void {
    if (timer.isRunning() || status.value === 'solved') {
      return
    }
    status.value = 'playing'
    startTick()
  }

  function stopTimer(): void {
    stopTick()
  }

  function resetTimer(): void {
    timer.reset()
    elapsedMs.value = 0
  }

  function saveAutosave(): void {
    autosaveStorage.save(serialize())
  }

  function loadAutosave(): GameSnapshot | null {
    return autosaveStorage.load()
  }

  function clearAutosave(): void {
    autosaveStorage.clear()
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
