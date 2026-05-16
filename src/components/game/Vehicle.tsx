import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { A } from "@/lib/assets";
import { driveState } from "@/lib/driveState";
import { playerState } from "@/lib/playerState";
import { Model } from "./Model";

const HOVER_Y = 0.3;
// Tuned 2x faster + punchier acceleration so it actually feels like driving.
const ACCEL = 56;
const MAX_SPEED = 110;
const REVERSE_SPEED = 35;
const FRICTION = 1.4;
const BRAKE = 6.5;
const TURN_RATE = 1.6;
const ENTER_RADIUS = 7;
const CAM_DIST = (18 / 7) * 1.3;
const CAM_HEIGHT = (8 / 7) * 1.3;
const BASE_FOV = 60;
const MAX_FOV_BOOST = 22; // extra degrees at top speed
const CAM_LAG = 6; // higher = snappier
const ROLL_MAX = 0.35; // radians of bank in turns

const keys: Record<string, boolean> = {};

export function Vehicle({
  url,
  spawn = [6, HOVER_Y, 190] as [number, number, number],
  initialYaw = Math.PI,
}: {
  url: string;
  spawn?: [number, number, number];
  initialYaw?: number;
}) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null!);
  const pos = useRef(new THREE.Vector3(...spawn));
  const yaw = useRef(initialYaw);
  const speed = useRef(0);
  const roll = useRef(0);
  const camPos = useRef(new THREE.Vector3());
  const camLookAt = useRef(new THREE.Vector3());
  const camInit = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "KeyE") {
        if (!driveState.active) {
          const dx = pos.current.x - playerState.x;
          const dz = pos.current.z - playerState.z;
          if (dx * dx + dz * dz <= ENTER_RADIUS * ENTER_RADIUS) {
            driveState.active = true;
            camInit.current = false;
          }
        } else {
          driveState.active = false;
        }
      }
    };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const fwd = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);

    let turnInput = 0;
    if (driveState.active) {
      const throttle = (keys["KeyW"] ? 1 : 0) + (keys["KeyS"] ? -1 : 0);
      turnInput = (keys["KeyA"] ? 1 : 0) + (keys["KeyD"] ? -1 : 0);
      // Turn rate drops at high speed so it doesn't spin like a top.
      const speedFactor = 1 - Math.min(0.55, Math.abs(speed.current) / MAX_SPEED * 0.55);
      yaw.current += turnInput * TURN_RATE * speedFactor * dt *
        (speed.current >= 0 ? 1 : -1);

      // Throttle / brake. Pressing opposite of motion brakes harder.
      if (throttle !== 0) {
        const sameDir = Math.sign(throttle) === Math.sign(speed.current) || speed.current === 0;
        const accel = sameDir ? ACCEL : ACCEL + BRAKE * Math.abs(speed.current) * 0.05;
        speed.current += throttle * accel * dt;
      } else {
        // Coast friction (light, gives weight feel).
        speed.current *= Math.exp(-FRICTION * dt);
      }
      speed.current = Math.max(-REVERSE_SPEED, Math.min(MAX_SPEED, speed.current));
    } else {
      // Heavier friction when nobody is driving.
      speed.current *= Math.exp(-FRICTION * 2.5 * dt);
    }

    fwd.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    pos.current.addScaledVector(fwd, speed.current * dt);
    // Hover bob + a tiny speed-based lift for "lift off" feel.
    const speedFrac = Math.abs(speed.current) / MAX_SPEED;
    pos.current.y =
      HOVER_Y +
      Math.sin(performance.now() * 0.002) * 0.08 +
      speedFrac * 0.15;

    // Bank into turns + pitch back under acceleration.
    const targetRoll = -turnInput * ROLL_MAX * Math.min(1, Math.abs(speed.current) / 25);
    roll.current += (targetRoll - roll.current) * Math.min(1, dt * 6);
    const pitch = -speedFrac * 0.08;

    if (group.current) {
      group.current.position.copy(pos.current);
      group.current.rotation.set(pitch, yaw.current, roll.current);
    }

    driveState.x = pos.current.x;
    driveState.y = pos.current.y;
    driveState.z = pos.current.z;
    driveState.yaw = yaw.current;
    driveState.carX = pos.current.x;
    driveState.carZ = pos.current.z;

    if (driveState.active) {
      // Camera trails the car (lag) and pushes back with speed for swoosh.
      const dynDist = CAM_DIST * (1 + speedFrac * 0.35);
      const dynHeight = CAM_HEIGHT * (1 + speedFrac * 0.15);
      const targetCam = new THREE.Vector3(
        pos.current.x + Math.sin(yaw.current) * dynDist,
        pos.current.y + dynHeight,
        pos.current.z + Math.cos(yaw.current) * dynDist,
      );
      const targetLook = new THREE.Vector3(
        pos.current.x - Math.sin(yaw.current) * 0.6,
        pos.current.y + 2,
        pos.current.z - Math.cos(yaw.current) * 0.6,
      );
      if (!camInit.current) {
        camPos.current.copy(targetCam);
        camLookAt.current.copy(targetLook);
        camInit.current = true;
      } else {
        const k = Math.min(1, dt * CAM_LAG);
        camPos.current.lerp(targetCam, k);
        camLookAt.current.lerp(targetLook, k);
      }
      camera.position.copy(camPos.current);
      camera.lookAt(camLookAt.current);

      // FOV boost with speed — that classic "going fast" rush.
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.isPerspectiveCamera) {
        const targetFov = BASE_FOV + speedFrac * MAX_FOV_BOOST;
        persp.fov += (targetFov - persp.fov) * Math.min(1, dt * 5);
        persp.updateProjectionMatrix();
      }
    } else {
      // Restore FOV when not driving.
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.isPerspectiveCamera && Math.abs(persp.fov - BASE_FOV) > 0.05) {
        persp.fov += (BASE_FOV - persp.fov) * Math.min(1, dt * 5);
        persp.updateProjectionMatrix();
      }
    }
  });

  return (
    <group ref={group} position={spawn} rotation={[0, initialYaw, 0]}>
      <Model url={url} centered />
    </group>
  );
}
