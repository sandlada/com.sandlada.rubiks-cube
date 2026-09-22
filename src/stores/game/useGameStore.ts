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
import { relabelHistoryForSpins } from './solution'
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
  /** Producing history in the current frame; null when unknown (legacy saves). */
  const historyMoves = ref<string[] | null>([])
  const solving = ref(false)
  const solutionMoves = ref<string[]>([])
  const solutionDone = ref(0)

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
    historyMoves.value = []
    solving.value = false
    solutionMoves.value = []
    solutionDone.value = 0
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
    if (historyMoves.value !== null) {
      historyMoves.value.push(move)
    }
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
    if (historyMoves.value !== null) {
      historyMoves.value.push(move)
    }
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
   * Recorded history is relabeled so it stays in the current frame.
   */
  function setFrontFace(face: FaceName): boolean {
    const spins = spinsForFrontFace(face)
    if (spins === null) {
      return false
    }
    stickers.value = reorientStickers(stickers.value, size.value, spins)
    if (historyMoves.value !== null) {
      historyMoves.value = relabelHistoryForSpins(historyMoves.value, spins)
    }
    if (moves.value.length > 0) {
      moves.value = relabelHistoryForSpins(moves.value, spins)
    }
    return true
  }

  /**
   * One-click solve availability: cheap gate (playable state + history).
   * The runner verifies the computed solution before playing it.
   * 4x4 inverts recorded history, so legacy saves without it are excluded.
   */
  function canAutoSolve(): boolean {
    if (solving.value) {
      return false
    }
    if (status.value !== 'ready' && status.value !== 'playing') {
      return false
    }
    if (checkSolved()) {
      return false
    }
    if (size.value === 4 && historyMoves.value === null) {
      return false
    }
    return true
  }

  function beginSolution(moves: string[]): void {
    solutionMoves.value = moves.slice()
    solutionDone.value = 0
    solving.value = true
  }

  /** Counted solution turn: records the move like a player turn plus progress. */
  function applySolutionMove(move: string): boolean {
    solutionDone.value += 1
    return applyMove(move)
  }

  function finishSolution(): void {
    solving.value = false
    solutionMoves.value = []
    solutionDone.value = 0
  }

  function cancelSolution(): void {
    solving.value = false
    solutionMoves.value = []
    solutionDone.value = 0
  }

  function loadSnapshot(snap: GameSnapshot): void {
    stopTick()
    size.value = snap.size
    difficulty.value = snap.difficulty
    stickers.value = cloneStickers(snap.stickers)
    moves.value = snap.moves.slice()
    historyMoves.value = snap.historyMoves === undefined ? null : snap.historyMoves.slice()
    solving.value = false
    solutionMoves.value = []
    solutionDone.value = 0
    timer.setElapsed(snap.elapsedMs)
    elapsedMs.value = snap.elapsedMs
    status.value = snap.status
  }

  function serialize(): GameSnapshot {
    const snap: GameSnapshot = {
      id: randomId(),
      size: size.value,
      difficulty: difficulty.value,
      stickers: cloneStickers(stickers.value),
      moves: moves.value.slice(),
      elapsedMs: elapsedMs.value,
      status: status.value,
      updatedAt: Date.now(),
    }
    if (historyMoves.value !== null) {
      snap.historyMoves = historyMoves.value.slice()
    }
    return snap
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
    historyMoves,
    solving,
    solutionMoves,
    solutionDone,
    newGame,
    applyMove,
    applyScrambleMove,
    applySolutionMove,
    beginSolution,
    finishSolution,
    cancelSolution,
    canAutoSolve,
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
