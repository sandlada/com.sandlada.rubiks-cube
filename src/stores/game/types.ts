export type CubeSize = 2 | 3 | 4
export type Difficulty = 'easy' | 'normal' | 'hard'
export type GameStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'solved' | 'scrambling'
export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R'

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
