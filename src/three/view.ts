import * as THREE from 'three'
import type { PeekFace } from './types'

export function peekTargetFor(face: PeekFace): THREE.Quaternion {
  if (face === 'L') {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
  }
  if (face === 'R') {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
  }
  // Peek-back tips the body forward 90° (pure pitch, like tipping a real
  // cube toward you): top comes to the front, back rises to the top band.
  if (face === 'B') {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
  }
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
}
