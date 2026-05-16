import { useProgress } from "@react-three/drei";

export function SceneLoader() {
  const { progress, active, loaded, total } = useProgress();
  const pct = Math.max(1, Math.round(progress));
  const done = !active && progress >= 100;
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_#1a3a6e_0%,_#0a1228_60%,_#05060d_100%)] text-white transition-opacity duration-700 ${done ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="text-xs uppercase tracking-[0.4em] text-cyan-300/80">
        {active ? "Preparing scene" : "Almost there"}
      </div>
      <h2 className="mt-2 bg-gradient-to-b from-white via-cyan-200 to-cyan-500 bg-clip-text text-4xl font-black tracking-tight text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.5)]">
        Building World
      </h2>
      <div className="mt-8 w-[min(420px,80vw)]">
        <div className="relative h-2 overflow-hidden rounded-full border border-cyan-400/30 bg-black/40 shadow-[0_0_30px_rgba(56,189,248,0.25)]">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-cyan-100/70">
          <span>Parsing models{total ? ` (${loaded}/${total})` : "…"}</span>
          <span>{pct}%</span>
        </div>
      </div>
      <div className="mt-6 text-xs italic text-cyan-100/60">
        Decoding Draco / Meshopt geometry — this only happens once.
      </div>
    </div>
  );
}
