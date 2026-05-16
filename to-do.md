# Flair World — Build Log

Last updated: this session.

## ✅ Latest fixes (this turn)

- **Character speed 3× slower**: `WALK_SPEED` 12→4, `RUN_SPEED` 26→8.7 in
  `ThirdPersonPlayer.tsx`.
- **Better wall collisions**: forward collision raycast now fires at THREE
  heights (knee/hip/chest = 0.1 / 0.4 / 0.55) instead of one. Stops the
  character slipping through lamp posts, railings, and building edges that
  a single mid-height ray was missing.
- **Hovercar 2× faster + actually feels like driving**:
  - `ACCEL` 28→56, `MAX_SPEED` 55→110, reverse capped at 35.
  - Turn rate scales DOWN with speed so it doesn't spin like a top.
  - Pressing opposite throttle now brakes harder than coasting.
  - Body banks into turns (`roll`) and pitches forward under throttle.
  - Camera trails the car (lag/lerp) instead of teleporting — gives weight.
  - Camera distance + height grow with speed; **FOV boosts up to +22°** at
    top speed for that classic "going fast" rush. FOV restores on dismount.
  - Subtle hover lift at speed (the car visibly rises a bit when flying).

## ✅ Previous fixes (earlier this turn)

- **T-pose bug fixed.** Character was a plain `Object3D.clone(true)` — the
  cloned SkinnedMesh kept references to the ORIGINAL bones, so the mixer
  animated bones that nothing was bound to. Result: skeleton moved, mesh
  stayed in T-pose, looked like "camera moves but character doesn't".
  Fix: `SkeletonUtils.clone(rawCharScene)` rebinds skin to the new bones.
- **Hovercar scaled 3×** in `Vehicle` component (`scale={3}`).
- **Driveable hovercar.** New `src/components/game/Vehicle.tsx` +
  `src/lib/driveState.ts`. Walk within ~7m of the car and press **E** to
  mount; WASD drives (A/D turn, W/S throttle, friction + hover bob),
  camera switches to chase-cam, character snaps to the driver seat and
  goes idle. Press **E** again to dismount.


## ✅ Done this session

### Fixed: game crashed at "Enter World" with `Kaydara FB ... is not valid JSON`
- Root cause: the asset preloader caches every model as a `blob:` URL. The
  shared `useAnyModel` hook detected FBX vs GLB by file extension, but blob
  URLs have no extension — so every FBX got routed through `GLTFLoader`,
  which then choked on the FBX magic header `Kaydara FB...`.
- Fix: `useAnyModel` / `useFirstClip` now accept a `formatUrl` arg used
  purely for format detection. `ThirdPersonPlayer` passes the original
  `A.character` / `MOVES.*` / `DANCES[i]` paths so the loader picks
  `FBXLoader` correctly even when the actual fetch URL is a blob.
- Bonus: wired Draco decoder into drei's `useGLTF` (`useGLTF.setDecoderPath`)
  so all `<Model>` components can load the new compressed map.

### Map compression (Draco) — without nuking the look
- Added `scripts/compress-map.mjs` and `scripts/compress-all.mjs`.
- `full_map.glb`: **62 MB → 48 MB** (Draco edgebreaker, lossless on geometry).
- Other large `.glb`s (american_house, hovercars, lgb-optimized, etc.) were
  already meshopt-compressed — Draco made them *bigger*, so the script
  auto-restores those originals. Total `public/models/` is now ~143 MB
  (down from ~158 MB, with the visual fidelity untouched).
- Original files saved outside `public/` in `.model-backups/` (not shipped).

### Earlier in the project
- GPS uses real world data (`src/lib/worldLayout.ts` is the single source of
  truth for villages + houses).
- `SplashScreen.tsx` with starfield, glowing progress bar, rotating tips,
  and an "Enter World →" gate.
- Lovable Cloud + `profiles` table + RLS + `handle_new_user` trigger.
- `UsernameGate.tsx` — NPC-style "Gate Guard" signup with live availability
  check.
- Multiplayer presence: `src/lib/presence.ts` + `RemotePlayers.tsx` rendered
  as glowing cyan capsules with floating usernames.
- Phone "Friends" tab → live online players list. Other players also dot the
  GPS minimap.

## 🚧 Partially done / known limitations

- **Three.js console warnings** (cosmetic, not crashes):
  - `Unknown extension "KHR_materials_pbrSpecularGlossiness"` — that
    extension was removed from core three.js. Some imported `.glb`s still
    declare it. Models still render with their albedo. Real fix is a
    one-time re-export of those models with metallic-roughness PBR.
  - `THREE.Clock has been deprecated` — coming from inside `@react-three/fiber`.
    Will go away on the next R3F release; nothing to do on our side.
  - SES `Removing unpermitted intrinsics` — Lovable preview sandbox
    boilerplate, not from our code.
  - `Input elements should have autocomplete attributes` — DOM hint about
    the secret-word field on the Gate Guard. Harmless.
- **Remote players still use a placeholder capsule mesh** — no walk-cycle,
  dance, or jump animation streamed yet.
- **In-game chat** is not wired (Friends tab "Chat" button still disabled).
- **My Car app** is still a UI stub — no vehicles spawned in the world.
- **Email field** for auth is a synthetic `<username>@flairworld.game`.

## 🔜 Missing / next steps

- **Re-export `pbrSpecularGlossiness` models** to silence the warning and
  guarantee correct shading on stricter three.js versions.
- **Texture compression** on `full_map.glb` (KTX2/Basis) — biggest remaining
  size win, would need a one-time Squoosh / KTX-Software pass.
- **Animated remote players** — stream `{state: 'idle'|'walk'|'dance'|...}`
  through the presence channel and play the matching clip on each peer.
- **Real-time chat** between online travelers (Supabase Realtime broadcast).
- **Portals** between villages (use the live HUD coords to pick spawn/exit).
- **Cars** in-world + the phone's "Bring my car" actually drives one over.
- **Friends system** (mutual follow) on top of presence.
- **Persistent inventory / progression** per profile.
- Day/night cycle, ambient sound, better shadows.

## Files added / changed

- new: `scripts/compress-map.mjs`, `scripts/compress-all.mjs`,
  `.model-backups/` (uncompressed originals, gitignored worthy).
- edited: `src/components/game/useAnyModel.ts` (formatUrl arg + Draco for
  drei `useGLTF`), `src/components/game/ThirdPersonPlayer.tsx` (pass
  original URLs as formatUrl).
- assets: `public/models/full_map.glb` recompressed (62 MB → 48 MB).

## Update — hovercar + meshopt fix

- Replaced `public/models/free_merc_hovercar.glb` with the user-supplied
  meshopt-compressed version (~5.8 MB, no wheels — meant to hover).
- Added meshopt decoder to both `useLoader(GLTFLoader, ...)` (via
  `setMeshoptDecoder`) and drei `useGLTF` (third arg `true` already set in
  `Model.tsx`). Fixes "setMeshoptDecoder must be called before loading
  compressed files".
- Spawned the hovercar in `World.tsx` near the player spawn at y=0.3
  (~30cm float). Position/rotation easy to tweak later.

## Iteration: size & ground fixes
- Reverted hovercar scale to 1 (was 3×) — too big.
- Character target height 7 → 3.5 (smaller, fits map scale).
- Fixed character sinking into ground: offset `charScene.position.y = -box.min.y` so feet anchor at y=0 regardless of rig origin.
- Camera tuned for smaller char: CAM_DIST 14→8, CAM_HEIGHT 7→4, lookAt y+4→y+2.
- driveState.seatOffsetY 1.6 → 0.6 to seat smaller char on smaller car.

## Iteration: tiny char + foot anchoring + close cam
- Character 3× smaller: targetHeight 3.5 → 1.2.
- Real foot anchoring: instead of writing `charScene.position.y` (which didn't survive SkeletonUtils/animation), wrap charScene in inner group at `position={[0, -box.min.y * scale, 0]}` and put scale on the inner group too. Outer group stays at world pos so y=0 = feet on ground.
- Camera ~3× closer: CAM_DIST 8 → 2.7, CAM_HEIGHT 4 → 1.5, lookAt y+2 → y+0.8.
- RADIUS 1.8 → 0.5 to match new char size.
- driveState.seatOffsetY 0.6 → 0.3 for smaller char on car.

## Update — this session

### Done
- Re-cloned the project from GitHub (all `public/*.glb` + `.fbx` assets, `src/components/game/*`, Supabase wiring).
- Restored missing `to-do.md` from the GitHub repo.
- Fixed SSR rendering failure (`./lib/error-capture` / `./lib/error-page` imports were missing `.ts` extensions in `src/server.ts` and `src/start.ts`).
- Fixed asset 404s: `src/lib/assets.ts` `ASSET_BASE` changed from `/models/` to `/` so files in `public/` resolve correctly. Draco + Meshopt + FBX loaders confirmed wired in `useAnyModel.ts`.
- Character ~2× smaller: `targetHeight` 1.2 → 0.6 in `ThirdPersonPlayer`.
- Character no longer sinks into ground: added `+0.02` epsilon to `footOffset`.
- Third-person camera ~2× closer: `CAM_DIST` 2.7 → 1.35.
- In-car chase camera 7× closer: `CAM_DIST` 18 → 18/7, `CAM_HEIGHT` 8 → 8/7 in `Vehicle.tsx`.
- **Fixed the long white screen after splash**: the Canvas `<Suspense fallback>` was `null`, so while three.js was decoding all the Draco/Meshopt GLBs for the first frame (~20–60 s on slower devices), the screen sat plain white. Added `src/components/game/SceneLoader.tsx` — a DOM overlay driven by drei's `useProgress()` that shows a real progress bar + "Parsing models (X/Y)" while the scene is being built, then fades out when `active=false && progress=100`. Splash "Enter World" no longer leads to a blank screen.

### Still missing / next up
- Re-export the few `.glb`s that still declare `KHR_materials_pbrSpecularGlossiness` (cosmetic warning).
- Texture compression (KTX2/Basis) on `full_map.glb` — biggest remaining size win.
- Animated remote players (currently capsules — stream `state: idle|walk|dance` over presence).
- Real-time chat between online travelers (Friends tab → Chat is still disabled).
- "Bring my car" actually spawning/driving a car to the player.
- Friends system (mutual follow) on top of presence.
- Persistent inventory / progression per profile.
- Day/night cycle, ambient audio, better shadows.

## Environment work — this session (continued)

### Done
- **KTX2/Basis texture compression on `public/full_map.glb`**: every embedded
  PNG re-encoded with `gltf-transform etc1s` (Basis ETC1S, qlevel 200) and
  then re-Draco'd for geometry. Result: **48 MB → 26 MB on disk** (~45%
  smaller download) and the GPU keeps textures in compressed form (lower
  VRAM + better fps on the dense map). Original backed up to
  `.model-backups/full_map.glb`.
- **`KTX2Loader` wired into the renderer**: `src/components/game/Model.tsx`
  now passes a 4th `extendLoader` callback to drei's `useGLTF` that lazily
  creates a singleton `KTX2Loader`, calls `.detectSupport(gl)` against the
  active WebGL renderer, and attaches it to the loader. The Basis
  transcoder binaries are served from `public/basis/`
  (`basis_transcoder.js` + `.wasm`, copied out of
  `three/examples/jsm/libs/basis/`).
- **Map scaled down 2× again**: `<Model url={A.map} scale={0.32} />` →
  `scale={0.16}` in `World.tsx`. World is now half its previous size so the
  village ring is reachable on foot in seconds instead of minutes.
- **Removed the experimental blob/contact shadows**: the `BlobShadow` +
  `PlayerBlobShadow` discs under buildings and the player looked dumb /
  flat against the lit map. Deleted `src/components/game/BlobShadow.tsx`
  and reverted `World.tsx` to render buildings without the wrapper group.
- **Foot-snap so the idle bob doesn't lift the character off the ground**:
  the previous footOffset was computed once from the rest-pose bounding box,
  so once the Mixamo "Breathing Idle" clip raised the hips, the feet
  visibly floated above the floor when standing still. New behaviour in
  `ThirdPersonPlayer.tsx`:
  - On load, find foot/toe bones by name in the rig
    (`*ToeBase` preferred, falls back to `*Foot`).
  - Every frame, after the mixer poses the skeleton, sample the **lowest
    foot bone's world Y** and compute the delta to `ground + epsilon`.
  - Apply that delta as a smoothed offset (`footSnapY`, lerped at ~18/s)
    to the inner character group's local Y.
  - In the air, decay the snap back toward 0 so landings start clean.
  Net: hips can bob freely during idle/dance, but **feet stay planted** on
  the actual ground surface.

### Still to do (environment-ish, not addressed here)
- Re-export the few `.glb`s that still declare
  `KHR_materials_pbrSpecularGlossiness` (cosmetic warning).
- Day/night cycle (sun position, fog colour, ambient intensity blending).
- Ambient audio bed per village + wind/birdsong far from villages.
- A real skybox / HDRI instead of the flat `#cfe6f5` background colour.
- Optional LOD / frustum-culling pass on the village houses for distant
  buildings.
- Compress textures on the other large `.glb`s (houses, stores, hovercars)
  the same way as `full_map.glb` for additional VRAM savings.

## Environment work — this session

Scope: ONLY the world/environment (map, ground, collisions, camera vs
terrain, performance of the scene). Character, multiplayer, UI, etc. are
intentionally out of scope here.

### Done
- **Map scaled down 2.5×**: `<Model url={A.map} scale={0.8} />` →
  `scale={0.32}` in `src/components/game/World.tsx`. World feels much
  denser, less running through empty terrain to reach the village ring.
- **Camera no longer clips through the ground / sky**: third-person camera
  is now a proper spherical orbit around the player's head, pitch clamped
  to `-0.45 … 0.7`, min ground clearance bumped to `0.35`, min chase
  distance to `0.5`. Looking up no longer flips into the sky; looking down
  no longer buries the camera under the map.
- **Camera no longer punches through buildings/walls**: camera raycast
  reused with a cached list of collidable meshes; if a wall is hit, the
  camera slides in to the hit point.
- **Character no longer falls through / sinks into the ground**:
  `GROUND_EPSILON` added to `footOffset` and the player Y is hard-clamped
  to `ground + GROUND_EPSILON` every frame instead of just `>= ground`.
- **Character no longer warps onto roofs/bridges**: ground raycast now
  ignores any hit above the player's head so it always picks the floor
  directly beneath them.
- **Fewer wall slip-throughs**: forward collision rays now fire at 6
  heights (`0.05 → 1.3`) instead of 3, and the body radius is slightly
  thicker (`0.5 → 0.55`). Lamp posts, railings and building edges block
  movement properly.
- **Smoother framerate in the environment**: cached collidable meshes via
  a `useRef` list refreshed once per second instead of traversing
  `scene.children` recursively every frame for ground / wall / camera
  raycasts. Big win on the dense map.
- Camera distance tuned: `CAM_DIST 1.6 → 2.0`, `CAM_MIN_DIST 0.5 → 0.6`,
  `HEAD_HEIGHT 0.9 → 0.95` so the player isn't filling the screen.

### Still to do (environment only)
- Re-export the few `.glb`s that still declare
  `KHR_materials_pbrSpecularGlossiness` — currently just a console warning,
  but on stricter three.js versions the materials will fall back to flat.
- **Texture compression (KTX2/Basis) on `full_map.glb`** — biggest
  remaining size/perf win. Geometry is already Draco-compressed; textures
  are still uncompressed PNG/JPG inside the GLB.
- Add baked / cheap shadows under buildings and the player — right now
  everything floats visually because there's no contact shadow.
- Day/night cycle (sun position, fog colour, ambient intensity blending).
- Ambient audio bed per village + wind/birdsong far from villages.
- A real skybox / HDRI instead of the flat `#cfe6f5` background colour.
- Optional: LOD or frustum-culling pass on the village houses so distant
  buildings render at lower cost.

### Fixed: KTX2 texture loader error
- `GLTFLoader` was throwing `"THREE.GLTFLoader: setKTX2Loader must be called
  before loading KTX2 textures"` whenever a `.glb` containing KTX2/Basis
  textures was loaded.
- Wired a singleton `KTX2Loader` (transcoder served from `/public/basis/`)
  into both code paths:
  - `src/components/game/useAnyModel.ts` (the raw `useLoader(GLTFLoader, …)`
    path used by most in-world models).
  - `src/components/game/SplashScreen.tsx` (`useGLTF.preload(...)` so the
    preloaded GLBs are decoded with KTX2 support too).
- `Model.tsx` already had it; same loader instance is now shared across
  all three sites.

### Fixed: Map appearing black/white after KTX2 wiring
- Symptom: full_map.glb (and any other GLB with KTX2 textures) rendered
  with flat black/white materials after the previous KTX2 fix.
- Root cause: `useGLTF.preload(...)` in `SplashScreen.tsx` was setting the
  KTX2Loader on the GLTFLoader, but `KTX2Loader.detectSupport(renderer)`
  was never called — there is no live WebGL context during the splash
  screen preload step. Without `detectSupport`, KTX2Loader can't pick a
  GPU-supported transcoded format, so textures decode to garbage and the
  broken result gets cached by drei's useGLTF.
- Fix: removed GLB preloading from SplashScreen entirely. The raw GLB
  blobs are still cached in the browser's Cache Storage (so no re-download)
  and `Model.tsx` / `useAnyModel.ts` load them at render time where
  `detectSupport(gl)` runs against the actual `<Canvas>` renderer.
- Side benefit: also reduces a duplicate parsing pass that was contributing
  to startup lag.

### Perf pass: adaptive renderer + lighter Canvas + static-matrix freeze
Goal: cut frame cost without changing visuals meaningfully.

1. `Game.tsx` — Canvas tuned for performance:
   - `dpr={[0.75, 1.5]}` (was `[1, 1.5]`) so weaker GPUs can render under
     1.0 internal resolution.
   - `gl={{ antialias: false, powerPreference: "high-performance",
     stencil: false, depth: true }}` — drops the MSAA pass and the unused
     stencil buffer, hints the browser to pick the discrete GPU.
   - Camera `far` 15000 → 4000. The map is only ~2km across at the current
     scale; the old far plane was wasting depth precision and shadow/fog
     ranges.
   - Added `<PerformanceMonitor>`, `<AdaptiveDpr pixelated />`, and
     `<AdaptiveEvents />` from drei. If FPS drops below ~40, dpr is scaled
     down automatically and pointer events are throttled while moving;
     things scale back up when FPS recovers above ~60.

2. `World.tsx` — fog tightened to match new far plane:
   - `<fog args={["#dfe7ec", 800, 3500]} />` (was `1200, 7000`). Far
     buildings now fade out earlier, which also means three.js can early-
     out a lot of fragment work in the fogged region.

3. `Model.tsx` — `isStatic` (default `true`):
   - For every Model in the world (buildings, map, parked hovercar body),
     after the clone we walk the tree once, call `updateMatrix()`, then
     set `matrixAutoUpdate = false`. The outer wrapper `<group>` also
     gets `matrixAutoUpdate={!isStatic}`.
   - This stops three.js from recomputing local matrices for hundreds of
     static meshes every frame. World matrices still compose from moving
     parents (e.g. the Vehicle group), so the parked hovercar still moves
     correctly when driven.
   - Pass `isStatic={false}` on any future Model that needs to animate its
     own transform locally.

Not touched yet (next candidates if still laggy):
- LOD / frustum-distance culling on the village houses.
- Re-export `full_map.glb` with KTX2 + Draco at lower texture res
  (current GLB is 26MB).
- Merge identical building meshes via `InstancedMesh`.
