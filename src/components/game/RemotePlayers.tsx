import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { presence, type RemotePlayer } from "@/lib/presence";

export function RemotePlayers() {
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  const targetsRef = useRef(new Map<string, THREE.Vector3>());

  useEffect(() => {
    const unsub = presence.subscribe(setPlayers);
    return () => { unsub(); };
  }, []);

  return (
    <group>
      {players.map((p) => {
        if (!targetsRef.current.has(p.userId)) {
          targetsRef.current.set(p.userId, new THREE.Vector3(p.x, p.y, p.z));
        }
        return (
          <group key={p.userId} position={[p.x, p.y, p.z]} rotation={[0, p.yaw, 0]}>
            {/* Body capsule */}
            <mesh position={[0, 3, 0]} castShadow>
              <capsuleGeometry args={[1.2, 3.2, 4, 8]} />
              <meshStandardMaterial color="#22d3ee" emissive="#0e7490" emissiveIntensity={0.4} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 6.2, 0]} castShadow>
              <sphereGeometry args={[1.0, 16, 16]} />
              <meshStandardMaterial color="#e0f2fe" />
            </mesh>
            {/* Forward indicator */}
            <mesh position={[0, 3.5, 1.6]}>
              <boxGeometry args={[0.4, 0.4, 0.6]} />
              <meshStandardMaterial color="#fef08a" />
            </mesh>
            <Html position={[0, 8.4, 0]} center distanceFactor={20} occlude={false}>
              <div className="select-none whitespace-nowrap rounded-md border border-cyan-300/50 bg-black/70 px-2 py-0.5 text-xs font-semibold text-cyan-100 shadow-lg">
                {p.username}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
