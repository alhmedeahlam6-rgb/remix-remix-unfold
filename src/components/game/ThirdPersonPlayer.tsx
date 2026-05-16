import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { MOVES, DANCES, A } from "@/lib/assets";
import { playerState } from "@/lib/playerState";
import { presence } from "@/lib/presence";
import { driveState } from "@/lib/driveState";
import { rayDebug } from "@/lib/rayDebug";
import { useAnyModel, useFirstClip } from "./useAnyModel";

type AABB = { min: THREE.Vector3; max: THREE.Vector3 };

const RADIUS = 0.65;
// +90% movement speed.
const WALK_SPEED = 7.6;
const RUN_SPEED = 16.5;
// Animation playback multiplier — clips play 30% faster than authored
// (does NOT change movement speed, only how fast the limbs cycle).
const ANIM_TIME_SCALE = 1.3;
// Heights (relative to feet) where we sample forward collision rays.
// Reduced from 6 to 3 sample heights — biggest per-frame raycast cost in
// this component. Still covers low/mid/high so we don't slip past lamp posts
// or railings, but ~half the work each frame.
const COLLISION_HEIGHTS = [0.15, 0.9, 1.7];
const GRAVITY = 26;
const JUMP_V = 11;
// Camera pulled back ~25%.
const CAM_DIST = 2.0;
const CAM_MIN_DIST = 0.6;
const HEAD_HEIGHT = 0.9;
// Extra clearance so feet never sink below the sampled ground surface.
const GROUND_EPSILON = 0.04;
// Pitch limits in radians. Negative = looking up, positive = looking down.
// Tighter than before so the camera can't fly into the sky or dive under ground.
const PITCH_MIN = -0.45;
const PITCH_MAX = 0.7;

const keys: Record<string, boolean> = {};

function collides(pos: THREE.Vector3, obstacles: AABB[]) {
  for (const b of obstacles) {
    if (
      pos.x + RADIUS > b.min.x &&
      pos.x - RADIUS < b.max.x &&
      pos.z + RADIUS > b.min.z &&
      pos.z - RADIUS < b.max.z
    ) return true;
  }
  return false;
}

export function ThirdPersonPlayer({
  assetMap,
  spawn = [0, 0, 200] as [number, number, number],
  groundY = 0,
  obstacles = [],
  username = "traveler",
}: {
  assetMap: Record<string, string>;
  spawn?: [number, number, number];
  groundY?: number;
  obstacles?: AABB[];
  username?: string;
}) {
  const { camera, scene } = useThree();
  const group = useRef<THREE.Group>(null!);
  const innerGroup = useRef<THREE.Group>(null!);
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.15);
  const velY = useRef(0);
  const onGround = useRef(true);
  const [danceIndex, setDanceIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const asset = (u: string) => assetMap[u] ?? u;

  // Character (FBX). Mixamo FBX is in cm — apply small scale below.
  // Pass original URL as formatUrl so loader picks FBXLoader even when `asset()` returns a blob: URL.
  const { scene: rawCharScene } = useAnyModel(asset(A.character), A.character);
  const charScene = useMemo(() => SkeletonUtils.clone(rawCharScene), [rawCharScene]);

  // Find the lowest-named foot/toe bones in the rig. We use these every frame
  // to snap the body so the LOWEST FOOT stays planted on the ground, even when
  // the idle animation bobs the hips up and down. Mixamo names: "LeftToeBase",
  // "RightToeBase" (preferred — actually touch the floor), falling back to
  // "LeftFoot"/"RightFoot" on rigs that don't have toes.
  const footBones = useMemo(() => {
    const toes: THREE.Object3D[] = [];
    const feet: THREE.Object3D[] = [];
    charScene.traverse((o) => {
      const n = o.name.toLowerCase();
      if (n.includes("toebase") || n.endsWith("toe_end") || n.endsWith("toe")) toes.push(o);
      else if (n.endsWith("foot") || n.includes("foot_")) feet.push(o);
    });
    return toes.length ? toes : feet;
  }, [charScene]);

  // Auto-fit character to a target height, and compute a foot offset so
  // feet sit on the ground regardless of where the rig origin is (hips/center/etc).
  const { charScale, footOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(charScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetHeight = 1.8;
    const s = size.y > 0 ? targetHeight / size.y : 1;
    // After scaling, min.y in local space becomes box.min.y * s.
    // Push the inner group up by that amount so feet land at y=0.
    // Add an epsilon so feet never clip into the ground plane.
    return { charScale: s, footOffset: -box.min.y * s + GROUND_EPSILON };
  }, [charScene]);

  // Smoothed Y offset added on top of footOffset each frame to keep the lowest
  // foot bone planted on the ground. Lerped so it never pops on transitions.
  const footSnapY = useRef(0);

  // Animation clips — pass original URLs as formatUrl for FBX detection through blob caching.
  const idleClip = useFirstClip(asset(MOVES.idle), MOVES.idle);
  const walkClip = useFirstClip(asset(MOVES.walk), MOVES.walk);
  const runClip = useFirstClip(asset(MOVES.run), MOVES.run);
  const jumpClip = useFirstClip(asset(MOVES.jump), MOVES.jump);
  const danceClips = DANCES.map((d) => useFirstClip(asset(d), d));

  const mixer = useMemo(() => {
    const m = new THREE.AnimationMixer(charScene);
    // Make every clip play faster without affecting movement speed.
    m.timeScale = ANIM_TIME_SCALE;
    return m;
  }, [charScene]);
  const actions = useMemo(() => {
    const make = (clip: THREE.AnimationClip | undefined) => (clip ? mixer.clipAction(clip) : null);
    return {
      idle: make(idleClip),
      walk: make(walkClip),
      run: make(runClip),
      jump: make(jumpClip),
      dances: danceClips.map((c) => make(c)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer]);

  const currentRef = useRef<THREE.AnimationAction | null>(null);
  const playAction = (next: THREE.AnimationAction | null, fade = 0.2) => {
    if (!next || currentRef.current === next) return;
    next.reset().fadeIn(fade).play();
    if (currentRef.current) currentRef.current.fadeOut(fade);
    currentRef.current = next;
  };

  // Start idle immediately and push the mixer one frame so we never render a T-pose.
  useEffect(() => {
    if (actions.idle) {
      actions.idle.play();
      currentRef.current = actions.idle;
      mixer.update(0);
    }
    setReady(true);
  }, [actions.idle, mixer]);

  const pos = useRef(new THREE.Vector3(spawn[0], spawn[1], spawn[2]));

  useEffect(() => {
    charScene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });
  }, [charScene]);

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.slice(5), 10);
        const idx = n === 0 ? 9 : n - 1;
        if (idx >= 0 && idx < danceClips.length) setDanceIndex(idx);
      }
      if (e.code === "KeyF") {
        setDanceIndex((cur) => {
          const start = cur === null ? 9 : cur + 1;
          return start % danceClips.length;
        });
      }
      if (e.code === "KeyX") setDanceIndex(null);
    };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; };
    const mouse = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        yawRef.current -= e.movementX * 0.0025;
        pitchRef.current -= e.movementY * 0.0025;
        pitchRef.current = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitchRef.current));
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", mouse);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", mouse);
    };
  }, [danceClips.length]);

  useEffect(() => {
    const cancelOnMove = () => {
      if (
        danceIndex !== null &&
        (keys["KeyW"] || keys["KeyA"] || keys["KeyS"] || keys["KeyD"] || keys["Space"])
      ) {
        setDanceIndex(null);
      }
    };
    const id = setInterval(cancelOnMove, 100);
    return () => clearInterval(id);
  }, [danceIndex]);

  const downRay = useMemo(() => new THREE.Raycaster(), []);
  const fwdRay = useMemo(() => new THREE.Raycaster(), []);
  const camRay = useMemo(() => new THREE.Raycaster(), []);

  // Cache of collidable meshes in the scene. Raycasting against the full
  // scene graph recursively every frame is the single biggest cost in this
  // component — caching a flat mesh list and refreshing it on a slow timer
  // gives a large smoothness win without breaking dynamic objects.
  // All candidate meshes in the scene (full scan, slow refresh).
  const allMeshes = useRef<THREE.Object3D[]>([]);
  const lastFullScan = useRef(0);
  // Subset within COLLIDE_RADIUS of the player. We raycast only against this.
  const collidableMeshes = useRef<THREE.Object3D[]>([]);
  const lastNearScan = useRef(0);
  const lastNearPos = useRef(new THREE.Vector3(Infinity, 0, Infinity));
  const COLLIDE_RADIUS = 28;
  const COLLIDE_RADIUS_SQ = COLLIDE_RADIUS * COLLIDE_RADIUS;
  // Re-cull only after the player drifts this far from the last cull centre.
  // Combined with the 28m radius, this guarantees nothing pops in mid-walk.
  const NEAR_REPULL_DIST_SQ = 6 * 6;
  const _meshCentre = new THREE.Vector3();
  const _meshBox = new THREE.Box3();
  // Adaptive throttle: when frames are cheap, refresh near-scan often
  // (~4/s). When frames are expensive (low FPS), back off to ~1.5/s so the
  // scan itself isn't making things worse. dtEMA is updated each frame.
  const dtEMA = useRef(1 / 60);
  const refreshCollidables = (now: number) => {
    // Full scene scan: rare (every ~3s) — only to discover added/removed meshes.
    if (now - lastFullScan.current > 3.0 || !allMeshes.current.length) {
      lastFullScan.current = now;
      const list: THREE.Object3D[] = [];
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.visible && !isDescendantOfChar(m)) list.push(m);
      });
      allMeshes.current = list;
    }
    // Adaptive interval: 0.25s at 60+fps, up to 0.7s when struggling (<30fps).
    const fps = 1 / Math.max(dtEMA.current, 1e-3);
    const interval = fps > 55 ? 0.25 : fps > 35 ? 0.4 : 0.7;
    const dx = pos.current.x - lastNearPos.current.x;
    const dz = pos.current.z - lastNearPos.current.z;
    const movedFar = dx * dx + dz * dz > NEAR_REPULL_DIST_SQ;
    if (
      collidableMeshes.current.length &&
      !movedFar &&
      now - lastNearScan.current < interval
    ) return;
    lastNearScan.current = now;
    lastNearPos.current.set(pos.current.x, 0, pos.current.z);
    const px = pos.current.x;
    const pz = pos.current.z;
    const near: THREE.Object3D[] = [];
    for (const m of allMeshes.current) {
      const mesh = m as THREE.Mesh;
      if (!mesh.visible) continue;
      const geom = mesh.geometry;
      if (geom && geom.boundingSphere) {
        _meshCentre.copy(geom.boundingSphere.center).applyMatrix4(mesh.matrixWorld);
        const r = geom.boundingSphere.radius * Math.max(mesh.scale.x, mesh.scale.z);
        const ddx = _meshCentre.x - px;
        const ddz = _meshCentre.z - pz;
        const reach = COLLIDE_RADIUS + r;
        if (ddx * ddx + ddz * ddz <= reach * reach) near.push(mesh);
      } else {
        _meshBox.setFromObject(mesh);
        _meshBox.getCenter(_meshCentre);
        const ddx = _meshCentre.x - px;
        const ddz = _meshCentre.z - pz;
        if (ddx * ddx + ddz * ddz <= COLLIDE_RADIUS_SQ * 4) near.push(mesh);
      }
    }
    collidableMeshes.current = near;
  };

  // Collide horizontally against ANY mesh in the scene (excluding the character itself).
  // Cast forward rays at several heights so we don't slip through tall/thin geometry.
  const blockedByWorld = (from: THREE.Vector3, to: THREE.Vector3, axis: "x" | "z") => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    if (dist < 1e-4) return false;
    dir.normalize();
    let hit = false;
    let lastOrigin = new THREE.Vector3();
    for (const h of COLLISION_HEIGHTS) {
      const origin = new THREE.Vector3(from.x, from.y + h, from.z);
      lastOrigin = origin;
      fwdRay.set(origin, dir);
      fwdRay.far = dist + RADIUS;
      const hits = fwdRay.intersectObjects(collidableMeshes.current, false);
      if (hits.length > 0) hit = true;
      if (hit) break;
    }
    if (rayDebug.enabled) {
      const end = lastOrigin.clone().add(dir.clone().multiplyScalar(dist + RADIUS));
      const sample = { origin: lastOrigin.clone(), end, hit };
      if (axis === "x") rayDebug.forwardX = sample;
      else rayDebug.forwardZ = sample;
    }
    return hit;
  };
  const isDescendantOfChar = (o: THREE.Object3D) => {
    let cur: THREE.Object3D | null = o;
    while (cur) {
      if (cur === group.current) return true;
      cur = cur.parent;
    }
    return false;
  };

  // Sample ground height under a point by raycasting straight down.
  const groundAt = (x: number, z: number, fallback: number, record = false) => {
    const origin = new THREE.Vector3(x, 500, z);
    downRay.set(origin, new THREE.Vector3(0, -1, 0));
    downRay.far = 2000;
    const hits = downRay.intersectObjects(collidableMeshes.current, false);
    let y = fallback;
    let hit = false;
    // Only accept surfaces at or below the player's head — otherwise a roof,
    // bridge, or overhang above us would teleport the character up onto it.
    const ceilingCutoff = pos.current.y + 1.6;
    for (const h of hits) {
      if (h.point.y > ceilingCutoff) continue;
      y = h.point.y; hit = true; break;
    }
    if (record && rayDebug.enabled) {
      rayDebug.ground = {
        origin,
        end: new THREE.Vector3(x, hit ? y : -1000, z),
        hit,
      };
    }
    return y;
  };

  // Cache last camera collision hit so we don't raycast the cam every frame.
  const camHitDistCache = useRef<number | null>(null);
  const lastCamRayT = useRef(0);
  const frameCount = useRef(0);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    // EMA of frame time, drives adaptive collision throttle.
    dtEMA.current = dtEMA.current * 0.9 + dt * 0.1;
    frameCount.current++;
    mixer.update(dt);
    refreshCollidables(performance.now() / 1000);

    // Riding the hovercar — skip input/camera, snap to car seat.
    if (driveState.active) {
      pos.current.set(driveState.x, driveState.y + driveState.seatOffsetY, driveState.z);
      if (group.current) {
        group.current.position.copy(pos.current);
        group.current.rotation.y = driveState.yaw;
      }
      playerState.x = pos.current.x;
      playerState.y = pos.current.y;
      playerState.z = pos.current.z;
      playerState.yaw = driveState.yaw;
      presence.update(pos.current.x, pos.current.y, pos.current.z, driveState.yaw);
      playAction(actions.idle);
      return;
    }

    const running = !!keys["ShiftLeft"];
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const yaw = yawRef.current;

    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const move = new THREE.Vector3();
    if (keys["KeyW"]) move.add(fwd);
    if (keys["KeyS"]) move.sub(fwd);
    if (keys["KeyD"]) move.add(right);
    if (keys["KeyA"]) move.sub(right);

    const moving = move.lengthSq() > 0;
    if (moving) move.normalize().multiplyScalar(speed * dt);

    if (keys["Space"] && onGround.current) {
      velY.current = JUMP_V;
      onGround.current = false;
    }
    velY.current -= GRAVITY * dt;

    // X axis: try AABB + raycast against world geometry.
    const tryX = pos.current.clone();
    tryX.x += move.x;
    if (!collides(tryX, obstacles) && !blockedByWorld(pos.current, tryX, "x")) {
      pos.current.x = tryX.x;
    }
    // Z axis
    const tryZ = pos.current.clone();
    tryZ.z += move.z;
    if (!collides(tryZ, obstacles) && !blockedByWorld(pos.current, tryZ, "z")) {
      pos.current.z = tryZ.z;
    }

    pos.current.y += velY.current * dt;

    // Ground-follow: sample world surface under the player.
    const ground = groundAt(pos.current.x, pos.current.z, groundY, true);
    // HARD clamp — never allow the body origin below the ground surface,
    // even on big dt spikes or steep terrain. Plus a small epsilon so the
    // feet mesh (which sits at pos.y + footOffset relative to its inner
    // group) stays visually above the surface.
    if (pos.current.y <= ground + GROUND_EPSILON) {
      pos.current.y = ground + GROUND_EPSILON;
      velY.current = 0;
      onGround.current = true;
    }

    let target: THREE.AnimationAction | null = actions.idle;
    if (danceIndex !== null && actions.dances[danceIndex] && onGround.current && !moving) {
      target = actions.dances[danceIndex];
    } else if (!onGround.current) {
      target = actions.jump ?? actions.idle;
    } else if (moving) {
      target = running ? actions.run ?? actions.walk : actions.walk;
    }
    playAction(target);

    if (group.current) {
      group.current.position.copy(pos.current);
      const facingYaw = moving ? Math.atan2(move.x, move.z) : yaw;
      group.current.rotation.y = facingYaw;
      playerState.x = pos.current.x;
      playerState.y = pos.current.y;
      playerState.z = pos.current.z;
      playerState.yaw = facingYaw;
      presence.update(pos.current.x, pos.current.y, pos.current.z, facingYaw);
    }

    // ---- Foot snap ----
    // After the mixer has posed the skeleton, find the lowest foot bone in
    // world space and lift/drop the inner group so that bone sits at the
    // ground surface. Without this, the idle animation (which bobs the hips)
    // visibly lifts the whole character off the floor when standing still.
    if (innerGroup.current && footBones.length && onGround.current) {
      // Make sure bone world matrices reflect the mixer update we just did.
      group.current?.updateMatrixWorld(true);
      let lowest = Infinity;
      const tmp = new THREE.Vector3();
      for (const b of footBones) {
        b.getWorldPosition(tmp);
        if (tmp.y < lowest) lowest = tmp.y;
      }
      // We want lowest === ground + GROUND_EPSILON.
      const target = ground + GROUND_EPSILON;
      const delta = target - lowest;
      // Lerp toward the new offset so we never snap visibly.
      const desiredOffset = footSnapY.current + delta;
      footSnapY.current += (desiredOffset - footSnapY.current) * Math.min(1, dt * 18);
      innerGroup.current.position.y = footOffset + footSnapY.current;
    } else if (innerGroup.current) {
      // In the air — decay the snap so the next landing starts clean.
      footSnapY.current *= 0.85;
      innerGroup.current.position.y = footOffset + footSnapY.current;
    }

    // Desired camera position behind the player.
    // Proper spherical orbit: pitch rotates the camera AROUND the player's
    // head instead of just shoving the Y up/down. Distance stays constant
    // (unless something is in the way — handled by the raycast below).
    const pitch = pitchRef.current;
    const headY = pos.current.y + HEAD_HEIGHT;
    const lookAt = new THREE.Vector3(pos.current.x, headY, pos.current.z);
    const horizDist = Math.cos(pitch) * CAM_DIST;
    const vertOffset = Math.sin(pitch) * CAM_DIST;
    const desired = new THREE.Vector3(
      pos.current.x + Math.sin(yaw) * horizDist,
      headY + vertOffset,
      pos.current.z + Math.cos(yaw) * horizDist,
    );

    // Camera collision: raycast from player head toward desired cam pos; if blocked, pull in.
    const camDir = new THREE.Vector3().subVectors(desired, lookAt);
    const camDist = camDir.length();
    camDir.normalize();
    camRay.set(lookAt, camDir);
    camRay.far = camDist;
    const camHits = camRay.intersectObjects(collidableMeshes.current, false);
    let finalDist = camDist;
    if (camHits.length > 0) {
      finalDist = Math.max(CAM_MIN_DIST, camHits[0].distance - 0.15);
    }
    const finalPos = lookAt.clone().add(camDir.clone().multiplyScalar(finalDist));
    // Also keep ground clearance — pull camera up so it never clips the floor.
    const camGround = groundAt(finalPos.x, finalPos.z, -Infinity, false);
    if (camGround !== -Infinity && finalPos.y < camGround + 0.4) {
      finalPos.y = camGround + 0.4;
    }
    if (rayDebug.enabled) {
      rayDebug.camera = {
        origin: lookAt.clone(),
        end: finalPos.clone(),
        hit: camHits.length > 0,
      };
    }
    camera.position.copy(finalPos);
    camera.lookAt(lookAt);
  });

  return (
    <>
      <PointerLockControls />
      <group ref={group} visible={ready}>
        <group ref={innerGroup} position={[0, footOffset, 0]} scale={charScale}>
          <primitive object={charScene} />
        </group>
      </group>
    </>
  );
}
