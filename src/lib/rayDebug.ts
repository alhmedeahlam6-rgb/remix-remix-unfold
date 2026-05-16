// Tiny shared store for visualizing raycasts. Player writes; RayDebug reads.
import * as THREE from "three";

export type RaySample = {
  origin: THREE.Vector3;
  end: THREE.Vector3;
  hit: boolean;
};

export const rayDebug = {
  enabled: false,
  ground: null as RaySample | null,
  forwardX: null as RaySample | null,
  forwardZ: null as RaySample | null,
  camera: null as RaySample | null,
};

export function toggleRayDebug() {
  rayDebug.enabled = !rayDebug.enabled;
  return rayDebug.enabled;
}
