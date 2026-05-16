import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

export function UsernameGate({ onReady }: { onReady: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip gate.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      if (session) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();
        if (prof?.username) onReady(prof.username);
      }
    })();
    return () => { active = false; };
  }, [onReady]);

  // Debounced availability check.
  useEffect(() => {
    if (!username) { setStatus("idle"); return; }
    if (!USERNAME_RE.test(username)) { setStatus("invalid"); return; }
    setStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .ilike("username", username)
        .maybeSingle();
      if (error && error.code !== "PGRST116") { setStatus("idle"); return; }
      setStatus(data ? "taken" : "available");
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const canSubmit = status === "available" && password.length >= 6 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const fakeEmail = `${username.toLowerCase()}@flairworld.game`;
    const { data, error: signErr } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: { data: { username } },
    });
    if (signErr) {
      // Maybe account already exists — try sign-in.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });
      if (signInErr) {
        setError(signInErr.message);
        setSubmitting(false);
        return;
      }
    }
    // Ensure profile row exists with this username (in case trigger lagged).
    const userId = data?.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId, username }, { onConflict: "id" });
    }
    onReady(username);
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1a3a6e_0%,_#0a1228_60%,_#05060d_100%)] px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-cyan-400/30 bg-black/50 p-8 shadow-[0_0_60px_rgba(56,189,248,0.25)] backdrop-blur">
        <div className="mb-1 text-xs uppercase tracking-[0.3em] text-cyan-300/80">The Gate Guard</div>
        <h1 className="text-2xl font-bold">"Traveler… what name shall I call you by?"</h1>
        <p className="mt-2 text-sm text-cyan-100/70">
          Choose your in-world name. Other travelers will see it floating above your head.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-cyan-200/70">Traveler name</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. nightwolf"
                maxLength={16}
                autoFocus
                className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-base outline-none focus:border-cyan-400/60"
              />
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 text-xs text-cyan-100/50">3–16 letters, numbers, underscore.</p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-cyan-200/70">Secret word</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-base outline-none focus:border-cyan-400/60"
            />
            <p className="mt-1 text-xs text-cyan-100/50">Used to return to your traveler later.</p>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full border border-cyan-400/50 bg-cyan-400/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition hover:bg-cyan-400/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Opening the gate…" : "Enter the world →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; color: string }> = {
    idle: { label: "", color: "" },
    checking: { label: "…", color: "text-cyan-200" },
    available: { label: "✓ free", color: "text-emerald-300" },
    taken: { label: "✕ taken", color: "text-red-300" },
    invalid: { label: "invalid", color: "text-amber-300" },
  };
  const v = map[status];
  if (!v.label) return <span className="w-16" />;
  return <span className={`w-16 text-right text-xs font-semibold ${v.color}`}>{v.label}</span>;
}
