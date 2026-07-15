import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { TerminalFeed } from "@/lib/dynamic-components";
import { PanelSkeleton } from "@/components/ui/loading-skeletons";

export default function TerminalPage() {
  return (
    <>
      <Header title="Live Terminal" subtitle="Real-time feed of all agent activity" />
      <Suspense fallback={<PanelSkeleton className="h-[500px]" />}>
        <TerminalFeed live />
      </Suspense>
    </>
  );
}
