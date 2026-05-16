import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Game = lazy(() =>
  import("@/components/game/Game").then((m) => ({ default: m.Game })),
);

export const Route = createFileRoute("/")({
  ssr: false,
  component: GamePage,
});

function GamePage() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Game />
      </Suspense>
    </ClientOnly>
  );
}
