<template>
  <canvas ref="canvasRef" class="cube-canvas" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { CubeScene } from '../three/cubeScene';
import type { PeekFace } from '../three/cubeScene';

const props = defineProps<{
  /** Initial state, 6 faces x n*n. Only consumed on mount / explicit reset(). */
  stickers: number[][];
  /** Cube dimension: 2 | 3 | 4. */
  size: number;
  /** When false, all pointer input is ignored. */
  interactive: boolean;
}>();

const emit = defineEmits<{
  move: [payload: string];
  preview: [committed: boolean | null];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let scene: CubeScene | null = null;

onMounted(() => {
  if (!canvasRef.value) return;
  scene = new CubeScene(canvasRef.value, { interactive: props.interactive });
  scene.onMove = (move: string) => {
    emit('move', move);
  };
  scene.onPreview = (committed: boolean | null) => {
    emit('preview', committed);
  };
  scene.reset(props.stickers, props.size);
});

watch(
  () => props.interactive,
  (value) => {
    scene?.setInteractive(value);
  },
);

onUnmounted(() => {
  scene?.dispose();
  scene = null;
});

/** Animate a turn, then emit `move`. Queued FIFO inside the scene service. */
function playMove(move: string, ms?: number): Promise<void> {
  if (!scene) return Promise.reject(new Error('CubeScene is not mounted'));
  return scene.playMove(move, ms);
}

/** Rebuild cubelets instantly from stickers and clear the animation queue. */
function reset(stickers: number[][], size: number): void {
  scene?.reset(stickers, size);
}

/** Momentary view offset toward a face; null eases back to identity. */
function peek(face: PeekFace | null): void {
  scene?.peek(face);
}

defineExpose({ playMove, reset, peek });
</script>

<style scoped>
.cube-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
</style>
