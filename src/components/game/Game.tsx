import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CachedAssetMap } from "@/lib/gameAssets";
import { presence } from "@/lib/presence";
import { CoordHUD, VirtualPhone } from "./PhoneHUD";
import { SceneLoader } from "./SceneLoader";
import { SplashScreen } from "./SplashScreen";
import { UsernameGate } from "./UsernameGate";
import { World } from "./World";

export function Game() {
  const [assetMap, setAssetMap] = useState<CachedAssetMap | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const handleReady = useCallback((m: CachedAssetMap) => setAssetMap(m), []);
  const handleAuth = useCallback((name: string) => setUsername(name), []);

  // Boot presence once both assets and username are ready.
  useEffect(() => {
    if (!assetMap || !username) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!cancelled && userId) presence.start(userId, username);
    })();
    return () => {
      cancelled = true;
      presence.stop();
    };
  }, [assetMap, username]);

  if (!assetMap) {
    return (
      <div className="fixed inset-0 bg-background">
        <SplashScreen onReady={handleReady} />
      </div>
    );
  }

  if (!username) {
    return (
      <div className="fixed inset-0 bg-background">
        <UsernameGate onReady={handleAuth} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        dpr={[0.75, 1.5]}
        camera={{ fov: 70, near: 0.1, far: 4000, position: [0, 7, 220] }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
      >
        {/* If FPS drops, scale internal resolution down; recover when stable. */}
        <PerformanceMonitor bounds={() => [40, 60]} flipflops={3} />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Suspense fallback={null}>
          <World assetMap={assetMap} username={username} />
        </Suspense>
      </Canvas>
      <SceneLoader />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/70 px-3 py-2 text-xs text-foreground backdrop-blur">
        <div className="font-semibold">Controls — playing as <span className="text-primary">{username}</span></div>
        <div>WASD move · Shift run · Space jump · Mouse look (click to lock)</div>
        <div>1–9, 0 → dance · F → next dance · X → stop dancing</div>
        <div>E → enter/exit hovercar (when nearby) · B → toggle ray debug</div>
      </div>
      <CoordHUD />
      <VirtualPhone />
    </div>
  );
}
