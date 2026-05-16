// Realtime multiplayer presence. Each client publishes its position to a
// shared "world" channel ~10 Hz; subscribers get the full live roster.
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RemotePlayer = {
  id: string;          // presence_ref
  userId: string;      // auth user id
  username: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  updatedAt: number;
};

type Listener = (players: RemotePlayer[]) => void;

class PresenceManager {
  private channel: RealtimeChannel | null = null;
  private listeners = new Set<Listener>();
  private current: RemotePlayer[] = [];
  private myUserId = "";
  private myUsername = "";
  private trackTimer: ReturnType<typeof setInterval> | null = null;
  private latest = { x: 0, y: 0, z: 0, yaw: 0 };

  async start(userId: string, username: string) {
    if (this.channel) return;
    this.myUserId = userId;
    this.myUsername = username;
    this.channel = supabase.channel("world", {
      config: { presence: { key: userId } },
    });

    this.channel.on("presence", { event: "sync" }, () => {
      const state = this.channel!.presenceState() as Record<string, Array<RemotePlayer>>;
      const flat: RemotePlayer[] = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === this.myUserId) continue;
        const m = metas[metas.length - 1];
        if (m) flat.push(m);
      }
      this.current = flat;
      this.listeners.forEach((l) => l(flat));
    });

    await new Promise<void>((resolve) => {
      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });

    // Track at 10 Hz.
    this.trackTimer = setInterval(() => {
      this.channel?.track({
        id: this.myUserId,
        userId: this.myUserId,
        username: this.myUsername,
        ...this.latest,
        updatedAt: Date.now(),
      } as RemotePlayer);
    }, 100);
  }

  update(x: number, y: number, z: number, yaw: number) {
    this.latest = { x, y, z, yaw };
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.current);
    return () => this.listeners.delete(l);
  }

  async stop() {
    if (this.trackTimer) clearInterval(this.trackTimer);
    this.trackTimer = null;
    if (this.channel) await supabase.removeChannel(this.channel);
    this.channel = null;
  }
}

export const presence = new PresenceManager();
