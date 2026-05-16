import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { A } from "@/lib/assets";
import type { CachedAssetMap } from "@/lib/gameAssets";
import { BUILDINGS } from "@/lib/worldLayout";
import { Model } from "./Model";
import { RayDebug } from "./RayDebug";
import { RemotePlayers } from "./RemotePlayers";
import { ThirdPersonPlayer } from "./ThirdPersonPlayer";
import { Vehicle } from "./Vehicle";

type AABB = { min: THREE.Vector3; max: THREE.Vector3 };

export function World({ assetMap, username }: { assetMap: CachedAssetMap; username: string }) {
  const asset = useCallback((url: string) => assetMap[url] ?? url, [assetMap]);

  const obstacles = useMemo<AABB[]>(
    () =>
      BUILDINGS.map((b) => ({
        min: new THREE.Vector3(b.position[0] - b.halfX - 2, 0, b.position[2] - b.halfZ - 2),
        max: new THREE.Vector3(b.position[0] + b.halfX + 2, 80, b.position[2] + b.halfZ + 2),
      })),
    [],
  );

  return (
    <>
      <color attach="background" args={["#cfe6f5"]} />
      <ambientLight intensity={2.4} />
      <hemisphereLight args={["#ffffff", "#b0b8c0", 1.6]} />
      <directionalLight position={[250, 360, 140]} intensity={2.8} />
      <directionalLight position={[-200, 300, -180]} intensity={1.2} />
      <fog attach="fog" args={["#dfe7ec", 800, 3500]} />

      {/* Map scaled down 2.5× (was 0.8) so the village ring feels denser. */}
      <Model url={asset(A.map)} position={[0, 0, 0]} scale={0.16} />

      {BUILDINGS.map((b, i) => (
        <Model
          key={`building-${i}`}
          url={asset(b.url)}
          position={b.position}
          rotation={b.rotation}
          scale={b.scale}
          centered
        />
      ))}

      {/* Floating hovercar (3x scale, ~30cm hover). Walk near it and press E to drive. */}
      <Vehicle url={asset(A.vehicles[1])} spawn={[6, 0.3, 190]} initialYaw={Math.PI} />

      <RemotePlayers />

      <ThirdPersonPlayer
        assetMap={assetMap}
        spawn={[0, 0, 200]}
        groundY={0}
        obstacles={obstacles}
        username={username}
      />

      <RayDebug />
    </>
  );
}
