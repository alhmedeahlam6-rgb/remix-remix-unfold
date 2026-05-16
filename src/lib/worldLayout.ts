// Single source of truth for the procedural village layout.
// Imported by World.tsx (3D) and PhoneHUD.tsx (2D minimap) so the GPS
// shows EXACTLY where the houses/villages are in-world.

import { A } from "@/lib/assets";

export const VILLAGE_RING_RADIUS = 1800;
export const VILLAGE_COUNT = 8;
export const HOUSES_PER_VILLAGE = 6;
export const VILLAGE_INNER_RADIUS = 110;

export const VILLAGE_NAMES = [
  "Eastwind",
  "Northgate",
  "Highmoor",
  "Westvale",
  "Sunset Hollow",
  "Southreach",
  "Lowmarsh",
  "Dawnhill",
];

export interface BuildingLayout {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  halfX: number;
  halfZ: number;
  villageIndex: number;
  isStore: boolean;
}

const HOUSE_SIZE_MULT = 5;
const variants = [
  { url: A.houses[0], scale: 1.35 * HOUSE_SIZE_MULT, halfX: 15 * HOUSE_SIZE_MULT, halfZ: 13 * HOUSE_SIZE_MULT, isStore: false },
  { url: A.houses[1], scale: 0.08 * HOUSE_SIZE_MULT, halfX: 18 * HOUSE_SIZE_MULT, halfZ: 18 * HOUSE_SIZE_MULT, isStore: false },
  { url: A.houses[2], scale: 0.82 * HOUSE_SIZE_MULT, halfX: 16 * HOUSE_SIZE_MULT, halfZ: 20 * HOUSE_SIZE_MULT, isStore: false },
  { url: A.stores[0], scale: 2.0 * HOUSE_SIZE_MULT, halfX: 13 * HOUSE_SIZE_MULT, halfZ: 13 * HOUSE_SIZE_MULT, isStore: true },
  { url: A.stores[1], scale: 2.25 * HOUSE_SIZE_MULT, halfX: 14 * HOUSE_SIZE_MULT, halfZ: 13 * HOUSE_SIZE_MULT, isStore: true },
  { url: A.stores[2], scale: 0.15 * HOUSE_SIZE_MULT, halfX: 13 * HOUSE_SIZE_MULT, halfZ: 25 * HOUSE_SIZE_MULT, isStore: true },
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export const VILLAGE_CENTRES: Array<{ name: string; x: number; z: number }> =
  Array.from({ length: VILLAGE_COUNT }, (_, i) => {
    const angle = (i / VILLAGE_COUNT) * Math.PI * 2;
    return {
      name: VILLAGE_NAMES[i] ?? `Village ${i + 1}`,
      x: Math.cos(angle) * VILLAGE_RING_RADIUS,
      z: Math.sin(angle) * VILLAGE_RING_RADIUS,
    };
  });

export const BUILDINGS: BuildingLayout[] = (() => {
  const list: BuildingLayout[] = [];
  const rand = seeded(42);
  VILLAGE_CENTRES.forEach((vc, vi) => {
    for (let h = 0; h < HOUSES_PER_VILLAGE; h++) {
      const angle = (h / HOUSES_PER_VILLAGE) * Math.PI * 2 + rand() * 0.4;
      const r = VILLAGE_INNER_RADIUS + rand() * 30;
      const x = vc.x + Math.cos(angle) * r;
      const z = vc.z + Math.sin(angle) * r;
      const variant = variants[(vi + h) % variants.length];
      list.push({
        ...variant,
        position: [x, 0, z],
        rotation: [0, angle + Math.PI, 0],
        villageIndex: vi,
      });
    }
  });
  return list;
})();

// World extents for scaling the minimap.
export const WORLD_HALF_EXTENT = VILLAGE_RING_RADIUS + 250;
