import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

// Singleton KTX2 loader — basis transcoder served from /public/basis/.
let ktx2Loader: KTX2Loader | null = null;
function getKtx2Loader() {
  if (!ktx2Loader) ktx2Loader = new KTX2Loader().setTranscoderPath("/basis/");
  return ktx2Loader;
}

export function Model({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  centered = false,
  /** Static = freeze matrices + skip frustum recompute. Default true. */
  isStatic = true,
}: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  centered?: boolean;
  isStatic?: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(url, true, true, (loader: unknown) => {
    const ktx2 = getKtx2Loader();
    ktx2.detectSupport(gl);
    (loader as { setKTX2Loader: (l: KTX2Loader) => unknown }).setKTX2Loader(ktx2);
  });
  const cloned = useMemo(() => {
    const copy = scene.clone(true);
    if (centered) {
      const box = new THREE.Box3().setFromObject(copy);
      const center = new THREE.Vector3();
      box.getCenter(center);
      copy.position.set(-center.x, -box.min.y, -center.z);
    }
    if (isStatic) {
      // Compute matrices once, then stop the per-frame matrix recompute walk.
      copy.traverse((o) => {
        o.matrixAutoUpdate = false;
        o.updateMatrix();
      });
    }
    return copy;
  }, [centered, scene, isStatic]);
  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale as THREE.Vector3Tuple | number}
      matrixAutoUpdate={!isStatic}
    >
      <primitive object={cloned} />
    </group>
  );
}
