import type * as THREE from 'three'

export type CubeSize = 2 | 3 | 4

export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R'

/** Peek target: which face to bring toward +z while held. null = release. */
export type PeekFace = 'L' | 'R' | 'D' | 'B'

export interface CubeSceneOptions {
  interactive?: boolean
  onMove?: ((move: string) => void) | null
  onPreview?: ((committed: boolean | null) => void) | null
}

export interface QueueEntry {
  move: string
  ms: number
  resolve: () => void
}

export interface ActiveTween {
  pivot: THREE.Group
  axis: THREE.Vector3
  angle: number
  from: number
  dur: number
  t0: number
}

export interface ActivePeekTween {
  from: THREE.Quaternion
  to: THREE.Quaternion
  t0: number
}

export interface GrabHit {
  point: THREE.Vector3
  normal: THREE.Vector3
  localPoint: THREE.Vector3
  localNormal: THREE.Vector3
  localCubelet: THREE.Vector3
}

export interface PendingGesture {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  decided: 'undecided' | 'preview' | 'done'
  hit: GrabHit | null
}

export interface ActivePreview {
  pivot: THREE.Group
  axisIdx: 0 | 1 | 2
  layer: number
  outward: 1 | -1
  sign: 1 | -1
  currentAngle: number
  committed: boolean
  members: THREE.Mesh[]
  savedMats: Array<THREE.Material | THREE.Material[]>
}

export interface ParsedTurn {
  axisIdx: 0 | 1 | 2
  axis: THREE.Vector3
  /** Signed radians about the +axis. */
  angle: number
  /** Grid coordinate of the turning layer along the axis. */
  layer: number
}
