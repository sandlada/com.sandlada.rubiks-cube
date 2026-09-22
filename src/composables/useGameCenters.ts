import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { FACE_ORDER } from '@stores/game'
import type { FaceName } from '@stores/game'

/** Sticker palette mirror (index = color number); keep in sync with three STICKER_COLORS. */
export const STICKER_HEX: ReadonlyArray<string> = [
  '#FFFFFF',
  '#FFEB00',
  '#00D855',
  '#2D7DFF',
  '#FF6A00',
  '#E8002D',
]

/**
 * Current center color hex per face, for the switch-front dots.
 * Takes a getter (HOF) so Pinia unwrapped state works: () => store.stickers.
 */
export function useGameCenters(
  getStickers: () => number[][],
): ComputedRef<Record<FaceName, string>> {
  return computed<Record<FaceName, string>>(() => {
    const stickers = getStickers()
    const out = {} as Record<FaceName, string>
    for (const face of FACE_ORDER) {
      const index = FACE_ORDER.indexOf(face)
      const faceStickers = stickers[index] ?? []
      const colorNo = faceStickers[Math.floor(faceStickers.length / 2)] ?? 0
      out[face] = STICKER_HEX[colorNo] ?? '#FFFFFF'
    }
    return out
  })
}
