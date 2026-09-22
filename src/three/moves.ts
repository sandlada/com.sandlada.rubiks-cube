import { axisUnit } from './math'
import type { FaceName, ParsedTurn } from './types'
import { FACE_ORDER } from './constants'

/** Solved-state stickers: U=0, D=1, F=2, B=3, L=4, R=5. */
export function createSolvedStickers(n: number): number[][] {
  return FACE_ORDER.map((_, face) => new Array<number>(n * n).fill(face))
}

/**
 * Parse face-turn notation. Uppercase (UDLRFB) = outer layer; lowercase
 * (udlrfb) = inner slice adjacent to that face (4x4 only, plus middle
 * slice on 3x3 where both cases address layer 0 from opposite sides).
 */
export function parseMove(move: string, n: number): ParsedTurn {
  const m = /^([UDLRFBudlrfb])(['2]?)$/.exec(move)
  if (!m) {
    throw new Error(`Unsupported move notation: ${move}`)
  }
  const raw = m[1] as string
  const face = raw.toUpperCase() as FaceName
  const suffix = m[2] as '' | "'" | '2'
  const inner = raw !== face
  if (inner && n !== 3 && n !== 4) {
    throw new Error(`Unsupported move notation: ${move}`)
  }
  let axisIdx: 0 | 1 | 2
  let outward: 1 | -1
  switch (face) {
    case 'U':
      axisIdx = 1
      outward = 1
      break
    case 'D':
      axisIdx = 1
      outward = -1
      break
    case 'F':
      axisIdx = 2
      outward = 1
      break
    case 'B':
      axisIdx = 2
      outward = -1
      break
    case 'R':
      axisIdx = 0
      outward = 1
      break
    case 'L':
      axisIdx = 0
      outward = -1
      break
  }
  // Clockwise looking at the face = negative rotation about the outward normal.
  const dir = suffix === "'" ? 1 : -1
  const magnitude = suffix === '2' ? Math.PI : Math.PI / 2
  const angleAboutOutward = dir * magnitude
  const angle = outward === 1 ? angleAboutOutward : -angleAboutOutward
  const half = (n - 1) / 2
  const layer = inner ? outward * (half - 1) : outward * half
  return { axisIdx, axis: axisUnit(axisIdx), angle, layer: layer === 0 ? 0 : layer }
}

/**
 * Map a +axis rotation back to face-turn notation (inverse of parseMove for
 * quarter turns). angleSign is the sign of a 90-degree rotation about +axis.
 * Inner slices (4x4, or middle on 3x3) return lowercase.
 */
export function moveForAxisLayer(
  axisIdx: 0 | 1 | 2,
  layer: number,
  angleSign: 1 | -1,
  n: number,
): string {
  const outward: 1 | -1 = layer < 0 ? -1 : 1
  const half = (n - 1) / 2
  const inner = Math.abs(layer) < half - 0.25
  const face: FaceName =
    axisIdx === 0
      ? outward === 1
        ? 'R'
        : 'L'
      : axisIdx === 1
        ? outward === 1
          ? 'U'
          : 'D'
        : outward === 1
          ? 'F'
          : 'B'
  const clockwiseAboutFace = angleSign * outward === -1
  const base = inner ? face.toLowerCase() : face
  return clockwiseAboutFace ? base : `${base}'`
}
