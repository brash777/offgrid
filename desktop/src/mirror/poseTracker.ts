import { DrawingUtils, PoseLandmarker, type MPMask } from '@mediapipe/tasks-vision';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import modelAssetPath from '../assets/models/pose_landmarker_full.task?url';

export type RunningMode = 'IMAGE' | 'VIDEO';

export interface PoseTracker {
  landmarker: PoseLandmarker;
  cutout: (mask: MPMask, source: CanvasImageSource) => CanvasImageSource;
}

const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

let pending: Promise<PoseTracker> | null = null;
let currentMode: RunningMode = 'VIDEO';

async function create(delegate: 'GPU' | 'CPU'): Promise<PoseTracker> {
  const canvas = new OffscreenCanvas(1, 1);
  const landmarker = await PoseLandmarker.createFromOptions(
    { wasmLoaderPath, wasmBinaryPath },
    {
      baseOptions: { modelAssetPath, delegate },
      canvas,
      runningMode: currentMode,
      numPoses: 1,
      outputSegmentationMasks: true,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    },
  );
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    throw new Error('WebGL2 is not available');
  }
  const drawing = new DrawingUtils(gl);
  return {
    landmarker,
    cutout: (mask, source) => {
      drawing.drawConfidenceMask(mask, TRANSPARENT, source as TexImageSource);
      return canvas;
    },
  };
}

export function loadPoseTracker(): Promise<PoseTracker> {
  if (!pending) {
    pending = create('GPU').catch(() => create('CPU'));
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

export async function setRunningMode(tracker: PoseTracker, mode: RunningMode) {
  if (mode !== currentMode) {
    currentMode = mode;
    await tracker.landmarker.setOptions({ runningMode: mode });
  }
}
