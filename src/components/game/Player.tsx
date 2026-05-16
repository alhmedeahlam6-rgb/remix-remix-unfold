import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

const keys: Record<string, boolean> = {};

type AABB = { min: THREE.Vector3; max: THREE.Vector3 };

const PLAYER_RADIUS = 1.5;
const PLAYER_EYE_HEIGHT = 5;

function collides(pos: THREE.Vector3, obstacles: AABB[]): boolean {
  for (const b of obstacles) {
    if (
      pos.x + PLAYER_RADIUS > b.min.x &&
      pos.x - PLAYER_RADIUS < b.max.x &&
      pos.z + PLAYER_RADIUS > b.min.z &&
      pos.z - PLAYER_RADIUS < b.max.z
    ) {
      return true;
    }
  }
  return false;
}

export function Player({
  spawn = [0, PLAYER_EYE_HEIGHT, 10] as [number, number, number],
  groundY = 0,
  obstacles = [],
}: {
  spawn?: [number, number, number];
  groundY?: number;
  obstacles?: AABB[];
}) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(true);

  useEffect(() => {
    camera.position.set(...spawn);
    const down = (e: KeyboardEvent) => (keys[e.code] = true);
    const up = (e: KeyboardEvent) => (keys[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [camera, spawn]);

  useFrame((_, dt) => {
    const speed = keys["ShiftLeft"] ? 34 : 20;
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();

    if (keys["KeyW"]) dir.add(fwd);
    if (keys["KeyS"]) dir.sub(fwd);
    if (keys["KeyD"]) dir.add(right);
    if (keys["KeyA"]) dir.sub(right);
    dir.normalize().multiplyScalar(speed * dt);

    if (keys["Space"] && onGround.current) {
      velocity.current.y = 8;
      onGround.current = false;
    }
    velocity.current.y -= 22 * dt;

    // Move with axis-separated collision so player can slide along walls
    const next = camera.position.clone();
    next.x += dir.x;
    if (collides(next, obstacles)) next.x = camera.position.x;
    next.z += dir.z;
    if (collides(next, obstacles)) next.z = camera.position.z;
    camera.position.x = next.x;
    camera.position.z = next.z;

    camera.position.y += velocity.current.y * dt;
    const floorEyeHeight = groundY + PLAYER_EYE_HEIGHT;
    if (camera.position.y <= floorEyeHeight) {
      camera.position.y = floorEyeHeight;
      velocity.current.y = 0;
      onGround.current = true;
    }
  });

  return <PointerLockControls />;
}
