import { useEffect, useState } from "react";
import { GAME_ASSET_URLS } from "@/lib/assets";
import { ASSET_CACHE_NAME, type CachedAssetMap, uniqueAssetUrls } from "@/lib/gameAssets";

const assets = uniqueAssetUrls(GAME_ASSET_URLS);

const TIPS = [
  "Tip: press F to switch to a random dance.",
  "Tip: hold Shift to sprint between villages.",
  "Tip: tap the 📱 phone to open the GPS map.",
  "Tip: every village has its own name — find Sunset Hollow.",
  "Tip: press X to stop dancing and start running.",
  "Tip: more travelers may appear online — wave hello.",
];

async function cacheAndPrepareAssets(onProgress: (done: number, total: number) => void) {
  const cache = "caches" in window ? await caches.open(ASSET_CACHE_NAME) : null;
  const mappedUrls: CachedAssetMap = {};
  let completed = 0;

  for (const url of assets) {
    const cached = cache ? await cache.match(url) : null;
    const response = cached;
    if (!response) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Could not download ${url}`);
      if (cache) await cache.put(url, r.clone());
      mappedUrls[url] = URL.createObjectURL(await r.blob());
    } else {
      mappedUrls[url] = URL.createObjectURL(await response.blob());
    }
    completed += 1;
    onProgress(completed, assets.length);
  }

  // NOTE: Do NOT preload GLBs here. KTX2 transcoding requires a live
  // WebGL context (KTX2Loader.detectSupport(renderer)) which doesn't exist
  // until the <Canvas> mounts. Preloading without it produces black/white
  // textures that then get cached. Model.tsx handles loading at render time.
  return mappedUrls;
}

export function SplashScreen({ onReady }: { onReady: (assetMap: CachedAssetMap) => void }) {
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assetMap, setAssetMap] = useState<CachedAssetMap | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    let active = true;
    cacheAndPrepareAssets((d) => active && setLoaded(d))
      .then((m) => active && setAssetMap(m))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load"));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(id);
  }, []);

  const progress = Math.round((loaded / assets.length) * 100);
  const ready = !!assetMap && progress >= 100;

  return (
    <div className="absolute inset-0 z-10 overflow-hidden">
      {/* Animated gradient sky */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a3a6e_0%,_#0a1228_60%,_#05060d_100%)]" />
      {/* Stars */}
      <div className="absolute inset-0 opacity-70">
        {Array.from({ length: 80 }).map((_, i) => {
          const top = (i * 53) % 100;
          const left = (i * 97) % 100;
          const size = ((i * 7) % 3) + 1;
          const delay = (i % 8) * 0.4;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                opacity: 0.4 + ((i % 5) / 10),
                animationDelay: `${delay}s`,
                animationDuration: `${2 + (i % 4)}s`,
              }}
            />
          );
        })}
      </div>
      {/* Glow horizon */}
      <div className="absolute -bottom-40 left-1/2 h-[600px] w-[1200px] -translate-x-1/2 rounded-full bg-[#3b82f6] opacity-20 blur-3xl" />

      <div className="relative flex h-full w-full flex-col items-center justify-center px-6 text-white">
        <div className="mb-2 text-xs uppercase tracking-[0.4em] text-cyan-300/80">a procedural sandbox</div>
        <h1 className="bg-gradient-to-b from-white via-cyan-200 to-cyan-500 bg-clip-text text-center text-6xl font-black tracking-tight text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.5)] sm:text-7xl">
          FLAIR&nbsp;WORLD
        </h1>
        <div className="mt-1 text-sm text-cyan-100/60">explore · dance · meet travelers</div>

        <div className="mt-12 w-full max-w-md">
          <div className="relative h-3 overflow-hidden rounded-full border border-cyan-400/30 bg-black/40 shadow-[0_0_30px_rgba(56,189,248,0.25)]">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{
                transform: `translateX(${progress * 4}px) skewX(-12deg)`,
                transition: "transform 300ms",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-cyan-100/70">
            <span>{error ? "Download failed — refresh to retry" : ready ? "World ready" : "Streaming world assets…"}</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="mt-10 h-6 text-center text-sm italic text-cyan-100/70 transition-opacity">
          {TIPS[tipIndex]}
        </div>

        {ready && (
          <button
            onClick={() => onReady(assetMap!)}
            className="mt-10 rounded-full border border-cyan-400/50 bg-cyan-400/10 px-10 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100 shadow-[0_0_30px_rgba(56,189,248,0.4)] transition hover:bg-cyan-400/20 hover:text-white"
          >
            Enter World →
          </button>
        )}

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
