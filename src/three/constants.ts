import type { FaceName } from './types'

/** Face order for the stickers arrays: ['U','D','F','B','L','R']. */
export const FACE_ORDER: readonly FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'] as const

export const STICKER_COLORS: readonly string[] = [
  '#FFFFFF',
  '#FFEB00',
  '#00D855',
  '#2D7DFF',
  '#FF6A00',
  '#E8002D',
] as const

export const PLASTIC_COLOR = '#111111'

export const CUBLET_SIZE = 0.95
export const TURN_MS = 160
export const SCRAMBLE_TURN_MS = 70
/** One-click solve playback: fast continuous turning. */
export const SOLUTION_TURN_MS = 60
export const PEEK_MS = 180
export const DRAG_DECIDE_PX = 12
export const AXIS_DECISIVENESS_RATIO = 1.6
export const COMMIT_ANGLE_DEG = 30
export const MAX_PREVIEW_RAD = Math.PI * 0.94

export const CAMERA_FOV = 32
// Framing: camera head-on to F with a slight look-down, so the front face
// dominates and U shows as a band on top. Theta is 0 for a symmetric
// front+top view (no side faces); peek targets assume this.
export const DEFAULT_THETA = 0
export const DEFAULT_PHI = 1.22

export const PREVIEW_DIM_EMISSIVE = 0.02
export const PREVIEW_ARMED_EMISSIVE = 0.85
