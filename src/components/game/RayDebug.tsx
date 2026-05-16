import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rayDebug, toggleRayDebug } from "@/lib/rayDebug";

function Segment({ color }: { color: string }) {
  const ref = useRef<THREE.Line>(null!);
  const geom = useRef(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(),
  ]));
  return (
    // @ts-expect-error R3F primitive
    <line ref={ref} userData={{ geom: geom.current }}>
      <primitive attach="geometry" object={geom.current} />
      <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.95} />
    </line>
  );
}

export function RayDebug() {
  const [, force] = useState(0);
  const groundRef = useRef<THREE.Line>(null!);
  const fxRef = useRef<THREE.Line>(null!);
  const fzRef = useRef<THREE.Line>(null!);
  const camRef = useRef<THREE.Line>(null!);
  const [enabled, setEnabled] = useState(rayDebug.enabled);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyB") setEnabled(toggleRayDebug());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame(() => {
    if (!enabled) return;
    const update = (line: THREE.Line | null, s: ReturnType<typeof Object>) => {
      if (!line || !s) return;
      const positions = (line.geometry as THREE.BufferGeometry).attributes.position
        ?.array as Float32Array | undefined;
      if (!positions) return;
      positions[0] = s.origin.x; positions[1] = s.origin.y; positions[2] = s.origin.z;
      positions[3] = s.end.x;    positions[4] = s.end.y;    positions[5] = s.end.z;
      (line.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.set(s.hit ? "#ff3b3b" : "#39ff88");
    };
    update(groundRef.current, rayDebug.ground);
    update(fxRef.current, rayDebug.forwardX);
    update(fzRef.current, rayDebug.forwardZ);
    update(camRef.current, rayDebug.camera);
    force((n) => (n + 1) % 1000000);
  });

  if (!enabled) return null;

  const make = (ref: React.MutableRefObject<THREE.Line>, color: string) => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3),
    );
    return (
      // @ts-expect-error R3F primitive
      <line ref={ref} renderOrder={9999}>
        <primitive attach="geometry" object={geom} />
        <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.95} linewidth={2} />
      </line>
    );
  };

  return (
    <group>
      {make(groundRef, "#39ff88")}
      {make(fxRef, "#39ff88")}
      {make(fzRef, "#39ff88")}
      {make(camRef, "#39ff88")}
    </group>
  );
}
