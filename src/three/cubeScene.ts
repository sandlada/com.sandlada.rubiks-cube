import * as THREE from 'three';

/**
 * Isolated three.js Rubik's Cube renderer — a dumb view with no game logic.
 *
 * three.js 0.186.0 notes (pinned version):
 * - Color management is on by default (since r152): hex strings passed to
 *   THREE.Color are interpreted as sRGB and converted automatically, and the
 *   renderer defaults to SRGBColorSpace output. No manual setup needed and the
 *   removed legacy `outputEncoding` API must not be used.
 * - Raycasting uses the standard THREE.Raycaster API.
 * - No addons are imported: the camera is fixed (DEFAULT_THETA/DEFAULT_PHI,
 *   F+U visible) and peek offsets are hand-rolled quaternions on viewGroup
 *   instead of OrbitControls, so there are no `three/addons/*` import-style
 *   or version-mismatch pitfalls.
 *
 * Supported moves: OUTER face turns only — faces U D L R F B with suffix
 * '' (clockwise looking at the face) | "'" | '2'.
 * Inner-layer / wide moves (M E S, Rw, etc.) and whole-cube rotations
 * (x y z) are out of scope for this MVP: a drag that resolves to an inner
 * slice (possible when n > 2) is consumed as a no-op (no view rotation).
 *
 * Cube model:
 * - n^3 cubelets, shared BoxGeometry with a small gap (0.95 pitch 1),
 *   dark plastic (#111111) on hidden sides.
 * - Sticker colors by sticker index: 0 white #FFFFFF, 1 yellow #FFEB00,
 *   2 green #00D855, 3 blue #2D7DFF, 4 orange #FF6A00, 5 red #E8002D.
 * - Stickers arrays follow face order ['U','D','F','B','L','R'], each face
 *   row-major viewed from outside with the U edge on top:
 *     U: viewed from +y, B edge at top.    idx = iz * n + ix
 *     D: viewed from -y, F edge at top.    idx = (n-1-iz) * n + ix
 *     F: viewed from +z, U edge at top.    idx = (n-1-iy) * n + ix
 *     B: viewed from -z, U edge at top.    idx = (n-1-iy) * n + (n-1-ix)
 *     L: viewed from -x, U edge at top.    idx = (n-1-iy) * n + iz
 *     R: viewed from +x, U edge at top.    idx = (n-1-iy) * n + (n-1-iz)
 *   World axes: +x right (R), +y up (U), +z toward viewer (F).
 *
 * View model: fixed default camera + momentary peek offsets (pure viewGroup,
 * never touches stickers, never emits moves). peek(face) eases viewGroup to
 * the target quaternion — all single-axis, body-like tips (peek-back pitches
 * forward 90° so top comes front and back rises to the top band); a release
 * issued mid-turn is queued and applied once idle. peek(null) eases back to
 * identity. Logical reorientation is owned by the store; the caller calls
 * reset() back to identity which is equivalent to a "new front face".
 */

export type CubeSize = 2 | 3 | 4;

export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

/** Face order for the stickers arrays: ['U','D','F','B','L','R']. */
export const FACE_ORDER: readonly FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'] as const;

const STICKER_COLORS: readonly string[] = [
  '#FFFFFF',
  '#FFEB00',
  '#00D855',
  '#2D7DFF',
  '#FF6A00',
  '#E8002D',
] as const;

const PLASTIC_COLOR = '#111111';

const CUBLET_SIZE = 0.95;
const TURN_MS = 160;
export const SCRAMBLE_TURN_MS = 70;
const PEEK_MS = 180;
const DRAG_DECIDE_PX = 12;
const AXIS_DECISIVENESS_RATIO = 1.6;
const COMMIT_ANGLE_DEG = 30;
const MAX_PREVIEW_RAD = Math.PI * 0.94;

const CAMERA_FOV = 32;
// Framing: camera head-on to F with a slight look-down, so the front face
// dominates and U shows as a band on top. Theta is 0 for a symmetric
// front+top view (no side faces); peek targets assume this.
const DEFAULT_THETA = 0;
const DEFAULT_PHI = 1.22;

const PREVIEW_DIM_EMISSIVE = 0.02;
const PREVIEW_ARMED_EMISSIVE = 0.85;

export interface CubeSceneOptions {
  interactive?: boolean;
  onMove?: ((move: string) => void) | null;
  onPreview?: ((committed: boolean | null) => void) | null;
}

interface QueueEntry {
  move: string;
  ms: number;
  resolve: () => void;
}

interface ActiveTween {
  pivot: THREE.Group;
  axis: THREE.Vector3;
  angle: number;
  from: number;
  dur: number;
  t0: number;
}

/** Peek target: which face to bring toward +z while held. null = release. */
export type PeekFace = 'L' | 'R' | 'D' | 'B';

interface ActivePeekTween {
  from: THREE.Quaternion;
  to: THREE.Quaternion;
  t0: number;
}

interface GrabHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  localPoint: THREE.Vector3;
  localNormal: THREE.Vector3;
  localCubelet: THREE.Vector3;
}

interface PendingGesture {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  decided: 'undecided' | 'preview' | 'done';
  hit: GrabHit | null;
}

interface ActivePreview {
  pivot: THREE.Group;
  axisIdx: 0 | 1 | 2;
  layer: number;
  outward: 1 | -1;
  sign: 1 | -1;
  currentAngle: number;
  committed: boolean;
  members: THREE.Mesh[];
  savedMats: Array<THREE.Material | THREE.Material[]>;
}

interface ParsedTurn {
  axisIdx: 0 | 1 | 2;
  axis: THREE.Vector3;
  /** Signed radians about the +axis. */
  angle: number;
  /** Grid coordinate of the turning layer along the axis. */
  layer: number;
}

/** Solved-state stickers: U=0, D=1, F=2, B=3, L=4, R=5. */
export function createSolvedStickers(n: number): number[][] {
  return FACE_ORDER.map((_, face) => new Array<number>(n * n).fill(face));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function dominantAxisIndex(v: THREE.Vector3): 0 | 1 | 2 {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return 0;
  if (ay >= ax && ay >= az) return 1;
  return 2;
}

function axisUnit(idx: 0 | 1 | 2): THREE.Vector3 {
  const v = new THREE.Vector3();
  v.setComponent(idx, 1);
  return v;
}

/**
 * Parse outer-face-turn notation. Throws on anything else (wide/inner-layer
 * moves and cube rotations are out of scope for this MVP).
 */
function parseMove(move: string, n: number): ParsedTurn {
  const m = /^([UDLRFB])(['2]?)$/.exec(move);
  if (!m) throw new Error(`Unsupported move notation: ${move}`);
  const face = m[1] as FaceName;
  const suffix = m[2] as '' | "'" | '2';
  let axisIdx: 0 | 1 | 2;
  let outward: 1 | -1;
  switch (face) {
    case 'U': axisIdx = 1; outward = 1; break;
    case 'D': axisIdx = 1; outward = -1; break;
    case 'F': axisIdx = 2; outward = 1; break;
    case 'B': axisIdx = 2; outward = -1; break;
    case 'R': axisIdx = 0; outward = 1; break;
    case 'L': axisIdx = 0; outward = -1; break;
  }
  // Clockwise looking at the face = negative rotation about the outward normal.
  const dir = suffix === "'" ? 1 : -1;
  const magnitude = suffix === '2' ? Math.PI : Math.PI / 2;
  const angleAboutOutward = dir * magnitude;
  const angle = outward === 1 ? angleAboutOutward : -angleAboutOutward;
  const half = (n - 1) / 2;
  return { axisIdx, axis: axisUnit(axisIdx), angle, layer: outward * half };
}

/**
 * Map a +axis rotation back to face-turn notation (inverse of parseMove for
 * quarter turns). angleSign is the sign of a 90-degree rotation about +axis.
 */
function moveForAxisLayer(axisIdx: 0 | 1 | 2, outward: 1 | -1, angleSign: 1 | -1): string {
  const face: FaceName =
    axisIdx === 0 ? (outward === 1 ? 'R' : 'L') : axisIdx === 1 ? (outward === 1 ? 'U' : 'D') : outward === 1 ? 'F' : 'B';
  const clockwiseAboutFace = angleSign * outward === -1;
  return clockwiseAboutFace ? face : `${face}'`;
}

function peekTargetFor(face: PeekFace): THREE.Quaternion {
  if (face === 'L') return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  if (face === 'R') return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
  // Peek-back tips the body forward 90° (pure pitch, like tipping a real
  // cube toward you): top comes to the front, back rises to the top band.
  if (face === 'B') return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
}

export class CubeScene {
  onMove: ((move: string) => void) | null;
  onPreview: ((committed: boolean | null) => void) | null;

  private canvas: HTMLCanvasElement;
  private parent: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private viewGroup: THREE.Group = new THREE.Group();
  private cubeGroup: THREE.Group = new THREE.Group();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private geometry: THREE.BoxGeometry;
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private cubelets: THREE.Mesh[] = [];

  private sizeN = 3;
  private interactive: boolean;
  private queue: QueueEntry[] = [];
  private current: QueueEntry | null = null;
  private tween: ActiveTween | null = null;
  private preview: ActivePreview | null = null;
  private peekTween: ActivePeekTween | null = null;
  /** Release issued while a turn was in flight; applied once the scene is idle. */
  private pendingPeekRelease = false;
  private rafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private gesture: PendingGesture | null = null;

  private radius = 10;
  private fitHalfDiag = (Math.sqrt(3) * 3) / 2 + 0.6;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: CubeSceneOptions = {}) {
    this.canvas = canvas;
    this.parent = canvas.parentElement ?? canvas;
    this.interactive = options.interactive ?? true;
    this.onMove = options.onMove ?? null;
    this.onPreview = options.onPreview ?? null;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(5, 8, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-6, -4, -6);
    this.scene.add(ambient, key, fill);
    this.viewGroup.add(this.cubeGroup);
    this.scene.add(this.viewGroup);

    this.geometry = new THREE.BoxGeometry(CUBLET_SIZE, CUBLET_SIZE, CUBLET_SIZE);

    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('lostpointercapture', this.onCaptureLost);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.parent);
    this.handleResize();

    this.rafId = requestAnimationFrame(this.loop);
  }

  setInteractive(value: boolean): void {
    this.interactive = value;
    if (!value) this.gesture = null;
  }

  playMove(move: string, ms: number = TURN_MS): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('CubeScene is disposed'));
    parseMove(move, this.sizeN);
    return new Promise<void>((resolve) => {
      this.queue.push({ move, ms, resolve });
    });
  }

  /** Rebuild cubelets instantly from stickers and clear the queue (no emits). */
  reset(stickers: number[][], n: number): void {
    if (n !== 2 && n !== 3 && n !== 4) throw new Error(`Unsupported cube size: ${n}`);
    if (this.tween) {
      const orphaned = [...this.tween.pivot.children];
      for (const child of orphaned) this.cubeGroup.attach(child);
      this.cubeGroup.remove(this.tween.pivot);
      this.tween = null;
    }
    if (this.preview) {
      this.restorePreviewMaterials(this.preview);
      const orphaned = [...this.preview.pivot.children];
      for (const child of orphaned) this.cubeGroup.attach(child);
      this.cubeGroup.remove(this.preview.pivot);
      this.preview = null;
      this.onPreview?.(null);
    }
    this.cubeGroup.quaternion.identity();
    this.peekTween = null;
    this.pendingPeekRelease = false;
    this.viewGroup.quaternion.identity();
    const dropped = this.queue.splice(0, this.queue.length);
    for (const entry of dropped) entry.resolve();
    if (this.current) {
      const entry = this.current;
      this.current = null;
      entry.resolve();
    }
    this.gesture = null;
    this.sizeN = n;
    this.buildCube(stickers);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.onCaptureLost);
    if (this.gesture) {
      if (this.canvas.hasPointerCapture(this.gesture.pointerId)) {
        this.canvas.releasePointerCapture(this.gesture.pointerId);
      }
      this.gesture = null;
    }
    const dropped = this.queue.splice(0, this.queue.length);
    for (const entry of dropped) entry.resolve();
    if (this.current) {
      const entry = this.current;
      this.current = null;
      entry.resolve();
    }
    if (this.preview) {
      this.restorePreviewMaterials(this.preview);
      const orphaned = [...this.preview.pivot.children];
      for (const child of orphaned) this.cubeGroup.attach(child);
      this.cubeGroup.remove(this.preview.pivot);
      this.preview = null;
      this.onPreview?.(null);
    }
    this.peekTween = null;
    this.pendingPeekRelease = false;
    this.viewGroup.quaternion.identity();
    while (this.cubeGroup.children.length > 0) {      const child = this.cubeGroup.children[0];
      this.cubeGroup.remove(child);
    }
    this.cubelets = [];
    this.geometry.dispose();
    for (const material of this.materialCache.values()) material.dispose();
    this.materialCache.clear();
    this.renderer.dispose();
  }

  private plasticMaterial(): THREE.MeshStandardMaterial {
    let material = this.materialCache.get(PLASTIC_COLOR);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.55, metalness: 0.05 });
      this.materialCache.set(PLASTIC_COLOR, material);
    }
    return material;
  }

  private stickerMaterial(colorIndex: number): THREE.MeshStandardMaterial {
    const key = STICKER_COLORS[colorIndex];
    let material = this.materialCache.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: key, roughness: 0.28, metalness: 0.0, emissive: key, emissiveIntensity: 0.18 });
      this.materialCache.set(key, material);
    }
    return material;
  }

  private materialFor(faceIdx: number, stickerIdx: number, stickers: number[][]): THREE.MeshStandardMaterial {
    const row = stickers[faceIdx];
    const colorIndex = row ? row[stickerIdx] : undefined;
    if (typeof colorIndex === 'number' && colorIndex >= 0 && colorIndex < STICKER_COLORS.length) {
      return this.stickerMaterial(colorIndex);
    }
    return this.plasticMaterial();
  }

  private buildCube(stickers: number[][]): void {
    while (this.cubeGroup.children.length > 0) {
      const child = this.cubeGroup.children[0];
      this.cubeGroup.remove(child);
    }
    this.cubelets = [];
    const n = this.sizeN;
    const half = (n - 1) / 2;
    const plastic = this.plasticMaterial();
    for (let iy = 0; iy < n; iy += 1) {
      for (let iz = 0; iz < n; iz += 1) {
        for (let ix = 0; ix < n; ix += 1) {
          const px = ix === n - 1 ? this.materialFor(5, (n - 1 - iy) * n + (n - 1 - iz), stickers) : plastic;
          const nx = ix === 0 ? this.materialFor(4, (n - 1 - iy) * n + iz, stickers) : plastic;
          const py = iy === n - 1 ? this.materialFor(0, iz * n + ix, stickers) : plastic;
          const ny = iy === 0 ? this.materialFor(1, (n - 1 - iz) * n + ix, stickers) : plastic;
          const pz = iz === n - 1 ? this.materialFor(2, (n - 1 - iy) * n + ix, stickers) : plastic;
          const nz = iz === 0 ? this.materialFor(3, (n - 1 - iy) * n + (n - 1 - ix), stickers) : plastic;
          const mesh = new THREE.Mesh(this.geometry, [px, nx, py, ny, pz, nz]);
          mesh.position.set(ix - half, iy - half, iz - half);
          this.cubeGroup.add(mesh);
          this.cubelets.push(mesh);
        }
      }
    }
    const halfDiag = (Math.sqrt(3) * n) / 2 + 0.6;
    this.fitHalfDiag = halfDiag;
    this.updateFit();
  }

  /** Fit the bounding sphere in both dimensions; portrait needs extra distance. */
  private updateFit(): void {
    const tanV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const aspect = this.camera.aspect > 0 ? this.camera.aspect : 1;
    const tanMin = Math.min(tanV, tanV * aspect);
    this.radius = this.fitHalfDiag / tanMin;
    this.updateCamera();
  }

  private loop = (now: number): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    this.pump(now);
    this.renderer.render(this.scene, this.camera);
  };

  private pump(now: number): void {
    if (!this.tween && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) this.startTween(next, now);
    }
    const active = this.tween;
    if (active) {
      const t = Math.min((now - active.t0) / active.dur, 1);
      active.pivot.setRotationFromAxisAngle(active.axis, active.from + (active.angle - active.from) * easeInOutCubic(t));
      if (t >= 1) this.finishTween();
    }
    this.pumpPeek(now);
    // A release issued mid-turn was queued instead of dropped: ease back once idle.
    if (
      this.pendingPeekRelease &&
      this.tween === null &&
      this.preview === null &&
      this.queue.length === 0 &&
      this.current === null
    ) {
      this.pendingPeekRelease = false;
      this.peekTween = { from: this.viewGroup.quaternion.clone(), to: new THREE.Quaternion(), t0: now };
    }
  }

  private isBusy(): boolean {
    return this.tween !== null || this.preview !== null || this.queue.length > 0;
  }

  peek(face: PeekFace | null): void {
    if (this.disposed) return;
    if (this.tween !== null || this.preview !== null || this.queue.length > 0 || this.current !== null) {
      // Turns may start while a peek is held (e.g. key-held peek + button/drag).
      // Never lose the release: queue it so the view still eases back once idle.
      if (face === null) this.pendingPeekRelease = true;
      return;
    }
    this.pendingPeekRelease = false;
    const to = face === null ? new THREE.Quaternion() : peekTargetFor(face);
    this.peekTween = { from: this.viewGroup.quaternion.clone(), to, t0: performance.now() };
  }

  private pumpPeek(now: number): void {
    const active = this.peekTween;
    if (!active) return;
    const t = Math.min((now - active.t0) / PEEK_MS, 1);
    this.viewGroup.quaternion.slerpQuaternions(active.from, active.to, easeInOutCubic(t));
    if (t < 1) return;
    this.viewGroup.quaternion.copy(active.to);
    this.peekTween = null;
  }

  private startTween(entry: QueueEntry, now: number): void {
    const turn = parseMove(entry.move, this.sizeN);
    const members = this.cubelets.filter(
      (cubelet) => Math.abs(cubelet.position.getComponent(turn.axisIdx) - turn.layer) < 0.25,
    );
    if (members.length === 0) {
      this.onMove?.(entry.move);
      entry.resolve();
      return;
    }
    const pivot = new THREE.Group();
    this.cubeGroup.add(pivot);
    for (const member of members) pivot.attach(member);
    this.current = entry;
    this.tween = { pivot, axis: turn.axis, angle: turn.angle, from: 0, dur: entry.ms, t0: now };
  }

  private snapMember(member: THREE.Object3D): void {
    const half = (this.sizeN - 1) / 2;
    member.position.set(
      Math.round(member.position.x + half) - half,
      Math.round(member.position.y + half) - half,
      Math.round(member.position.z + half) - half,
    );
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(member.quaternion);
    const elements = matrix.elements;
    for (let i = 0; i < elements.length; i += 1) elements[i] = Math.round(elements[i]);
    member.quaternion.setFromRotationMatrix(matrix);
  }

  private finishTween(): void {
    const active = this.tween;
    if (!active) return;
    const members = [...active.pivot.children];
    for (const member of members) {
      this.cubeGroup.attach(member);
      this.snapMember(member);
    }
    this.cubeGroup.remove(active.pivot);
    this.tween = null;
    const entry = this.current;
    this.current = null;
    if (entry) {
      this.onMove?.(entry.move);
      entry.resolve();
    }
  }

  private updateCamera(): void {
    const sinPhi = Math.sin(DEFAULT_PHI);
    this.camera.position.set(
      this.radius * sinPhi * Math.sin(DEFAULT_THETA),
      this.radius * Math.cos(DEFAULT_PHI),
      this.radius * sinPhi * Math.cos(DEFAULT_THETA),
    );
    this.camera.lookAt(0, 0, 0);
  }

  private handleResize = (): void => {
    const width = this.parent.clientWidth || 1;
    const height = this.parent.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.updateFit();
  };

  private toNDC(event: PointerEvent | MouseEvent): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private pick(event: PointerEvent | MouseEvent): GrabHit | null {
    this.raycaster.setFromCamera(this.toNDC(event), this.camera);
    const hits = this.raycaster.intersectObjects(this.cubelets, false);
    const hit = hits[0];
    if (!hit) return null;
    const normal = new THREE.Vector3(0, 0, 1);
    if (hit.face) {
      normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    }
    const snapped = axisUnit(dominantAxisIndex(normal));
    if (normal.dot(snapped) < 0) snapped.negate();
    const worldQuat = new THREE.Quaternion();
    this.cubeGroup.getWorldQuaternion(worldQuat).invert();
    const localNormal = snapped.clone().applyQuaternion(worldQuat);
    const snappedLocal = axisUnit(dominantAxisIndex(localNormal));
    if (localNormal.dot(snappedLocal) < 0) snappedLocal.negate();
    const mesh = hit.object as THREE.Mesh;
    return {
      point: hit.point.clone(),
      normal: snapped,
      localPoint: this.cubeGroup.worldToLocal(hit.point.clone()),
      localNormal: snappedLocal,
      localCubelet: mesh.position.clone(),
    };
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.interactive || this.disposed) return;
    if (event.button === 1) {
      event.preventDefault();
      return;
    }
    // Keep gestures from overlapping animations: input is only accepted idle.
    if (this.isBusy()) return;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; gestures still work without it.
    }
    this.gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      decided: 'undecided',
      hit: this.pick(event),
    };
  };

  private onPointerMove = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId || gesture.decided === 'done') return;
    if (gesture.decided === 'preview') {
      this.updatePreview(gesture, event);
      return;
    }
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < DRAG_DECIDE_PX) return;
    const pixelX = Math.abs(event.clientX - gesture.startX);
    const pixelY = Math.abs(event.clientY - gesture.startY);
    if (Math.max(pixelX, pixelY) < Math.min(pixelX, pixelY) * AXIS_DECISIVENESS_RATIO) {
      gesture.decided = 'done';
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      return;
    }
    if (this.tryEnterPreview(gesture, event)) return;
    gesture.decided = 'done';
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (gesture.decided === 'preview' && this.preview) {
      const preview = this.preview;
      this.updatePreview(gesture, event);
      const committed = Math.abs(THREE.MathUtils.radToDeg(preview.currentAngle)) >= COMMIT_ANGLE_DEG;
      this.gesture = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      if (committed) this.commitPreview(preview);
      else this.cancelPreview(preview);
      return;
    }
    this.gesture = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private onPointerCancel = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (gesture.decided === 'preview' && this.preview) {
      const preview = this.preview;
      this.gesture = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      this.cancelPreview(preview);
      return;
    }
    this.gesture = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private onCaptureLost = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (gesture.decided === 'preview' && this.preview) {
      const preview = this.preview;
      this.gesture = null;
      this.cancelPreview(preview);
    }
  };

  private tryEnterPreview(gesture: PendingGesture, event: PointerEvent): boolean {
    const hit = gesture.hit;
    if (!hit) return false;
    this.raycaster.setFromCamera(this.toNDC(event), this.camera);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(hit.normal, hit.point);
    const world = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, world)) return false;
    const current = this.cubeGroup.worldToLocal(world.clone());
    const drag = current.sub(hit.localPoint);
    if (drag.lengthSq() < 1e-10) return false;
    const normalAxis = dominantAxisIndex(hit.localNormal);
    const inPlane: Array<0 | 1 | 2> = ([0, 1, 2] as Array<0 | 1 | 2>).filter((a) => a !== normalAxis);
    const turnAxisIdx = Math.abs(drag.getComponent(inPlane[0])) < Math.abs(drag.getComponent(inPlane[1]))
      ? inPlane[0]
      : inPlane[1];
    const half = (this.sizeN - 1) / 2;
    const layerCoord = hit.localCubelet.getComponent(turnAxisIdx);
    const outward = Math.abs(layerCoord) > half - 0.25 ? (Math.sign(layerCoord) as 1 | -1) : 0;
    if (outward === 0) return false;
    const turnAxis = axisUnit(turnAxisIdx);
    const sign = Math.sign(turnAxis.cross(hit.localPoint).dot(drag));
    if (sign === 0) return false;
    const layer = outward * half;
    const members = this.cubelets.filter(
      (cubelet) => Math.abs(cubelet.position.getComponent(turnAxisIdx) - layer) < 0.25,
    );
    if (members.length === 0) return false;
    const savedMats = members.map((member) => member.material);
    for (const member of members) {
      const src = Array.isArray(member.material) ? member.material : [member.material];
      const clones = src.map((mat) => {
        const c = (mat as THREE.MeshStandardMaterial).clone();
        c.emissiveIntensity = PREVIEW_DIM_EMISSIVE;
        return c;
      });
      member.material = Array.isArray(member.material) ? clones : clones[0];
    }
    const pivot = new THREE.Group();
    this.cubeGroup.add(pivot);
    for (const member of members) pivot.attach(member);
    this.preview = {
      pivot,
      axisIdx: turnAxisIdx,
      layer,
      outward,
      sign: sign as 1 | -1,
      currentAngle: 0,
      committed: false,
      members,
      savedMats,
    };
    gesture.decided = 'preview';
    this.onPreview?.(false);
    this.updatePreview(gesture, event);
    return true;
  }

  private previewTint(preview: ActivePreview, armed: boolean): void {
    const intensity = armed ? PREVIEW_ARMED_EMISSIVE : PREVIEW_DIM_EMISSIVE;
    for (const member of preview.members) {
      const mats = Array.isArray(member.material) ? member.material : [member.material];
      for (const mat of mats) {
        (mat as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
      }
    }
  }

  private restorePreviewMaterials(preview: ActivePreview): void {
    preview.members.forEach((member, i) => {
      const cur = member.material;
      const curs = Array.isArray(cur) ? cur : [cur];
      for (const mat of curs) mat.dispose();
      member.material = preview.savedMats[i];
    });
  }

  private updatePreview(gesture: PendingGesture, event: PointerEvent): void {
    const preview = this.preview;
    const hit = gesture.hit;
    if (!preview || !hit) return;
    this.raycaster.setFromCamera(this.toNDC(event), this.camera);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(hit.normal, hit.point);
    const world = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, world)) return;
    const current = this.cubeGroup.worldToLocal(world.clone());
    const axis = axisUnit(preview.axisIdx);
    const offAxis = (v: THREE.Vector3): THREE.Vector3 => v.clone().addScaledVector(axis, -v.dot(axis));
    const v0 = offAxis(hit.localPoint);
    const v1 = offAxis(current);
    if (v0.lengthSq() < 1e-8 || v1.lengthSq() < 1e-8) return;
    v0.normalize();
    v1.normalize();
    const cross = new THREE.Vector3().crossVectors(v0, v1);
    const angle = clamp(Math.atan2(axis.dot(cross), clamp(v0.dot(v1), -1, 1)), -MAX_PREVIEW_RAD, MAX_PREVIEW_RAD);
    preview.currentAngle = angle;
    preview.pivot.setRotationFromAxisAngle(axis, angle);
    const committed = Math.abs(THREE.MathUtils.radToDeg(angle)) >= COMMIT_ANGLE_DEG;
    if (committed !== preview.committed) {
      preview.committed = committed;
      this.previewTint(preview, committed);
      this.onPreview?.(committed);
    }
  }

  private commitPreview(preview: ActivePreview): void {
    this.restorePreviewMaterials(preview);
    this.preview = null;
    this.onPreview?.(null);
    let quarters = Math.round(preview.currentAngle / (Math.PI / 2));
    quarters = clamp(quarters, -2, 2);
    if (quarters === 0) quarters = preview.currentAngle >= 0 ? 1 : -1;
    const effSign = (quarters > 0 ? 1 : -1) as 1 | -1;
    const single = moveForAxisLayer(preview.axisIdx, preview.outward, effSign);
    const move = Math.abs(quarters) === 2 ? `${single.charAt(0)}2` : single;
    this.current = { move, ms: TURN_MS, resolve: () => {} };
    this.tween = {
      pivot: preview.pivot,
      axis: axisUnit(preview.axisIdx),
      angle: quarters * Math.PI / 2,
      from: preview.currentAngle,
      dur: TURN_MS,
      t0: performance.now(),
    };
  }

  private cancelPreview(preview: ActivePreview): void {
    this.restorePreviewMaterials(preview);
    this.preview = null;
    this.onPreview?.(null);
    this.current = null;
    this.tween = {
      pivot: preview.pivot,
      axis: axisUnit(preview.axisIdx),
      angle: 0,
      from: preview.currentAngle,
      dur: TURN_MS,
      t0: performance.now(),
    };
  }
}
