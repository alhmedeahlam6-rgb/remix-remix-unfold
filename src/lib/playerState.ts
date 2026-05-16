// Lightweight shared player state. Updated by ThirdPersonPlayer every frame,
// read by HUD/Phone overlays via polling.
import { VILLAGE_CENTRES } from "@/lib/worldLayout";

export type PlayerSnapshot = {
  x: number;
  y: number;
  z: number;
  yaw: number;
};

export const playerState: PlayerSnapshot = { x: 0, y: 0, z: 0, yaw: 0 };

export type Place = { name: string; x: number; z: number; radius: number };

export const PLACES: Place[] = [
  { name: "Spawn Plaza", x: 0, z: 200, radius: 80 },
  ...VILLAGE_CENTRES.map((v) => ({ name: v.name, x: v.x, z: v.z, radius: 220 })),
];

export function nearestPlace(x: number, z: number) {
  let best: { place: Place; dist: number } | null = null;
  for (const p of PLACES) {
    const dx = p.x - x;
    const dz = p.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (!best || d < best.dist) best = { place: p, dist: d };
  }
  return best!;
}
