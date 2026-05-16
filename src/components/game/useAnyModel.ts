import { useLoader, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as THREE from "three";

// Singleton KTX2 loader — basis transcoder served from /public/basis/.
let ktx2Loader: KTX2Loader | null = null;
function getKtx2Loader() {
  if (!ktx2Loader) ktx2Loader = new KTX2Loader().setTranscoderPath("/basis/");
  return ktx2Loader;
}

const DRACO_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.6/";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(DRACO_PATH);

// Drei's useGLTF caches a single GLTFLoader internally — make it Draco aware.
// (Meshopt is enabled per-call via the third arg to useGLTF.)
useGLTF.setDecoderPath(DRACO_PATH);

const isFbx = (formatUrl: string) => /\.fbx(\?|$)/i.test(formatUrl);

/**
 * Loads either a .glb or .fbx URL.
 * `formatUrl` is used to pick the loader (defaults to `url`). Pass the
 * original asset path here when `url` is a blob:/cached URL with no extension.
 */
export function useAnyModel(
  url: string,
  formatUrl: string = url,
): { scene: THREE.Object3D; animations: THREE.AnimationClip[] } {
  if (isFbx(formatUrl)) {
    const fbx = useLoader(FBXLoader, url) as THREE.Group & { animations: THREE.AnimationClip[] };
    return { scene: fbx, animations: fbx.animations ?? [] };
  }
  const gl = useThree((s) => s.gl);
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    (loader as GLTFLoader).setDRACOLoader(dracoLoader);
    (loader as GLTFLoader).setMeshoptDecoder(MeshoptDecoder);
    const ktx2 = getKtx2Loader();
    ktx2.detectSupport(gl);
    (loader as GLTFLoader).setKTX2Loader(ktx2);
  });
  return { scene: gltf.scene, animations: gltf.animations };
}

/** First animation clip from any source. */
export function useFirstClip(url: string, formatUrl: string = url): THREE.AnimationClip | undefined {
  return useAnyModel(url, formatUrl).animations[0];
}
