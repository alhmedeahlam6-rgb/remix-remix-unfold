let lastCapturedError: unknown = undefined;

if (typeof globalThis !== "undefined") {
  const g = globalThis as { addEventListener?: (t: string, l: (e: any) => void) => void };
  g.addEventListener?.("error", (e: any) => {
    lastCapturedError = e?.error ?? e?.message ?? e;
  });
  g.addEventListener?.("unhandledrejection", (e: any) => {
    lastCapturedError = e?.reason ?? e;
  });
}

export function captureError(error: unknown): void {
  lastCapturedError = error;
}

export function consumeLastCapturedError(): unknown {
  const e = lastCapturedError;
  lastCapturedError = undefined;
  return e;
}
