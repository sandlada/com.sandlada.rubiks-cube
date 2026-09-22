import * as THREE from 'three'

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function dominantAxisIndex(v: THREE.Vector3): 0 | 1 | 2 {
  const ax = Math.abs(v.x)
  const ay = Math.abs(v.y)
  const az = Math.abs(v.z)
  if (ax >= ay && ax >= az) {
    return 0
  }
  if (ay >= ax && ay >= az) {
    return 1
  }
  return 2
}

export function axisUnit(idx: 0 | 1 | 2): THREE.Vector3 {
  const v = new THREE.Vector3()
  v.setComponent(idx, 1)
  return v
}
