import { useEffect, useRef, useState } from "react";
import { playerState, nearestPlace } from "@/lib/playerState";
import { BUILDINGS, VILLAGE_CENTRES, WORLD_HALF_EXTENT } from "@/lib/worldLayout";
import { presence, type RemotePlayer } from "@/lib/presence";

export function CoordHUD() {
  const [snap, setSnap] = useState({ x: 0, y: 0, z: 0, yaw: 0 });

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 100) {
        last = t;
        setSnap({ ...playerState });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const place = nearestPlace(snap.x, snap.z);
  const heading = ((snap.yaw * 180) / Math.PI + 360) % 360;
  const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
    Math.round(heading / 45) % 8
  ];

  return (
    <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-background/70 px-3 py-2 text-xs text-foreground backdrop-blur font-mono">
      <div className="font-semibold">
        {place.place.name}
        <span className="ml-2 font-normal text-muted-foreground">
          ({Math.round(place.dist)}m away · facing {compass})
        </span>
      </div>
      <div>
        x: {snap.x.toFixed(1)} &nbsp; y: {snap.y.toFixed(1)} &nbsp; z:{" "}
        {snap.z.toFixed(1)}
      </div>
    </div>
  );
}

const useTick = (ms = 200) => {
  const [, setT] = useState(0);
  useRef(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
};

type AppKey = "home" | "gps" | "friends" | "car" | "chat";

const FAKE_FRIENDS = [
  { id: "1", name: "Alex", status: "Online", color: "#34d399" },
  { id: "2", name: "Sam", status: "In Sunset Hollow", color: "#60a5fa" },
  { id: "3", name: "Jordan", status: "Offline", color: "#9ca3af" },
  { id: "4", name: "Riley", status: "Online", color: "#fbbf24" },
];

const FAKE_MESSAGES: Record<string, { from: "me" | "them"; text: string }[]> = {
  "1": [
    { from: "them", text: "yo where u at?" },
    { from: "me", text: "heading to dawnhill" },
  ],
  "2": [{ from: "them", text: "come dance lol" }],
  "3": [],
  "4": [{ from: "them", text: "race?" }],
};

export function VirtualPhone() {
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState<AppKey>("home");
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState(FAKE_MESSAGES);
  useTick(250); // refresh GPS

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition"
        aria-label="Toggle phone"
      >
        📱
      </button>

      {open && (
        <div className="absolute bottom-20 right-4 z-20 w-[280px] h-[520px] rounded-[32px] bg-neutral-900 p-3 shadow-2xl ring-2 ring-neutral-700">
          {/* Notch */}
          <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-neutral-700" />

          <div className="relative h-[480px] w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-800 to-slate-950 text-white">
            <PhoneStatusBar />

            <div className="h-[calc(100%-28px)] overflow-y-auto p-3 text-sm">
              {app === "home" && <PhoneHome onOpen={(a) => { setApp(a); setChatWith(null); }} />}
              {app === "gps" && <GpsApp />}
              {app === "friends" && (
                <FriendsApp
                  onChat={(id) => {
                    setChatWith(id);
                    setApp("chat");
                  }}
                />
              )}
              {app === "car" && <CarApp />}
              {app === "chat" && chatWith && (
                <ChatApp
                  friend={FAKE_FRIENDS.find((f) => f.id === chatWith)!}
                  messages={chats[chatWith] ?? []}
                  draft={draft}
                  setDraft={setDraft}
                  onSend={() => {
                    if (!draft.trim()) return;
                    setChats((c) => ({
                      ...c,
                      [chatWith]: [...(c[chatWith] ?? []), { from: "me", text: draft.trim() }],
                    }));
                    setDraft("");
                  }}
                  onBack={() => setApp("friends")}
                />
              )}
            </div>

            {app !== "home" && app !== "chat" && (
              <button
                onClick={() => setApp("home")}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 h-8 w-20 rounded-full bg-white/10 text-xs hover:bg-white/20"
              >
                Home
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PhoneStatusBar() {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex h-7 items-center justify-between px-4 text-[10px] font-medium text-white/80">
      <span>{time}</span>
      <span>📶 🔋</span>
    </div>
  );
}

function PhoneHome({ onOpen }: { onOpen: (a: AppKey) => void }) {
  const apps: { key: AppKey; label: string; icon: string; color: string }[] = [
    { key: "gps", label: "GPS", icon: "🗺️", color: "from-emerald-500 to-teal-600" },
    { key: "friends", label: "Friends", icon: "👥", color: "from-sky-500 to-indigo-600" },
    { key: "car", label: "My Car", icon: "🚗", color: "from-rose-500 to-orange-600" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 pt-2">
      {apps.map((a) => (
        <button
          key={a.key}
          onClick={() => onOpen(a.key)}
          className="flex flex-col items-center gap-1"
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${a.color} text-2xl shadow-md`}
          >
            {a.icon}
          </div>
          <span className="text-[10px] text-white/80">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function GpsApp() {
  const place = nearestPlace(playerState.x, playerState.z);
  const SIZE = 230;
  const SCALE = SIZE / (WORLD_HALF_EXTENT * 2);
  const toScreen = (x: number, z: number) => ({
    left: SIZE / 2 + x * SCALE,
    top: SIZE / 2 + z * SCALE,
  });
  const px = toScreen(playerState.x, playerState.z);
  const arrowDeg = ((playerState.yaw * 180) / Math.PI);

  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">GPS</h3>
      <div
        className="relative mx-auto overflow-hidden rounded-lg bg-emerald-950/60 ring-1 ring-emerald-500/30"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Compass cross */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/5" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-white/5" />
        </div>

        {/* Houses */}
        {BUILDINGS.map((b, i) => {
          const p = toScreen(b.position[0], b.position[2]);
          return (
            <div
              key={i}
              className={`absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm ${
                b.isStore ? "bg-orange-400" : "bg-stone-300"
              }`}
              style={{ left: p.left, top: p.top }}
            />
          );
        })}

        {/* Village circles + names */}
        {VILLAGE_CENTRES.map((v) => {
          const p = toScreen(v.x, v.z);
          return (
            <div
              key={v.name}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: p.left, top: p.top }}
            >
              <div
                className="rounded-full border border-amber-300/40"
                style={{ width: 220 * SCALE, height: 220 * SCALE }}
              />
              <div className="mt-0.5 whitespace-nowrap text-center text-[8px] text-amber-200/90">
                {v.name}
              </div>
            </div>
          );
        })}

        {/* Spawn marker */}
        {(() => {
          const p = toScreen(0, 200);
          return (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: p.left, top: p.top }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400 ring-2 ring-purple-300/40" />
            </div>
          );
        })()}

        {/* Other players */}
        <OtherPlayerDots toScreen={toScreen} />

        {/* Player arrow */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: px.left, top: px.top, transform: `translate(-50%,-50%) rotate(${arrowDeg}deg)` }}
        >
          <div className="text-sky-300 text-base leading-none drop-shadow">▲</div>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-white/5 p-2 text-[11px]">
        <div className="font-semibold">Nearest: {place.place.name}</div>
        <div className="text-white/60">{Math.round(place.dist)}m away</div>
        <div className="mt-1 font-mono text-white/50">
          x {playerState.x.toFixed(0)} · y {playerState.y.toFixed(0)} · z {playerState.z.toFixed(0)}
        </div>
        <div className="mt-1 flex gap-3 text-[10px] text-white/50">
          <span><span className="inline-block h-1.5 w-1.5 rounded-sm bg-stone-300 align-middle" /> house</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-sm bg-orange-400 align-middle" /> store</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400 align-middle" /> player</span>
        </div>
      </div>
    </div>
  );
}

function OtherPlayerDots({ toScreen }: { toScreen: (x: number, z: number) => { left: number; top: number } }) {
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  useEffect(() => {
    const unsub = presence.subscribe(setPlayers);
    return () => { unsub(); };
  }, []);
  return (
    <>
      {players.map((p) => {
        const s = toScreen(p.x, p.z);
        return (
          <div
            key={p.userId}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: s.left, top: s.top }}
            title={p.username}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-pink-400 ring-2 ring-pink-300/40" />
          </div>
        );
      })}
    </>
  );
}

function FriendsApp({ onChat }: { onChat: (id: string) => void }) {
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  useEffect(() => {
    const unsub = presence.subscribe(setPlayers);
    return () => { unsub(); };
  }, []);
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">Online ({players.length})</h3>
      {players.length === 0 && (
        <div className="rounded-md bg-white/5 p-3 text-[11px] text-white/60">
          You're the only traveler online right now. Open the game in another tab to test multiplayer.
        </div>
      )}
      <ul className="space-y-2">
        {players.map((f) => {
          const np = nearestPlace(f.x, f.z);
          return (
            <li key={f.userId} className="flex items-center gap-3 rounded-lg bg-white/5 p-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-black"
                style={{ background: "#22d3ee" }}
              >
                {f.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{f.username}</div>
                <div className="text-[10px] text-white/60">near {np.place.name}</div>
              </div>
              <button
                onClick={() => onChat(f.userId)}
                className="rounded-md bg-sky-500/80 px-2 py-1 text-[10px] hover:bg-sky-400"
                disabled
                title="Chat coming soon"
              >
                Chat
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] text-white/40">
        In-game chat between online travelers is not wired yet.
      </p>
    </div>
  );
}

function ChatApp({
  friend,
  messages,
  draft,
  setDraft,
  onSend,
  onBack,
}: {
  friend: { id: string; name: string; color: string };
  messages: { from: "me" | "them"; text: string }[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={onBack}
          className="rounded-md bg-white/10 px-2 py-1 text-[10px]"
        >
          ←
        </button>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-black"
          style={{ background: friend.color }}
        >
          {friend.name[0]}
        </div>
        <h3 className="text-sm font-semibold">{friend.name}</h3>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="text-center text-[11px] text-white/40">
            Say hi 👋
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] ${
              m.from === "me"
                ? "ml-auto bg-sky-500/80"
                : "bg-white/10"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="mt-2 flex gap-1"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          className="rounded-full bg-sky-500 px-3 text-[11px] hover:bg-sky-400"
        >
          ↑
        </button>
      </form>
    </div>
  );
}

function CarApp() {
  const [status, setStatus] = useState<"idle" | "calling" | "arrived">("idle");
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">My Car</h3>
      <div className="rounded-xl bg-gradient-to-br from-rose-500/30 to-orange-500/20 p-3">
        <div className="text-3xl">🚗</div>
        <div className="mt-1 text-sm font-medium">Garage Speedster</div>
        <div className="text-[10px] text-white/60">Fuel ████░ · Locked</div>
      </div>
      <button
        onClick={() => {
          if (status !== "idle") return;
          setStatus("calling");
          setTimeout(() => setStatus("arrived"), 2500);
          setTimeout(() => setStatus("idle"), 6000);
        }}
        className="mt-3 w-full rounded-md bg-rose-500/80 py-2 text-xs font-medium hover:bg-rose-400 disabled:opacity-50"
        disabled={status !== "idle"}
      >
        {status === "idle" && "Bring car to me"}
        {status === "calling" && "Driving to your location…"}
        {status === "arrived" && "Car arrived nearby ✓"}
      </button>
      <p className="mt-2 text-[10px] text-white/40">
        (Vehicles aren't in the world yet — this UI is ready for when they are.)
      </p>
    </div>
  );
}
