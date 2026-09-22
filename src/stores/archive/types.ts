import type { GameSnapshot } from '@stores/game'

export interface SaveEntry extends GameSnapshot {
  name: string
  createdAt: number
}
