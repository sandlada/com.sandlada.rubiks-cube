import type { FaceName } from './types'

export const FACE_ORDER = ['U', 'D', 'F', 'B', 'L', 'R'] as const satisfies ReadonlyArray<FaceName>

export const AUTOSAVE_KEY = 'rubiks.autosave.v1'

export const SCRAMBLE_FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const

export const SCRAMBLE_SUFFIXES = ['', "'", '2'] as const
