import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { TerminalFeed } from "@/lib/dynamic-components";
import { PanelSkeleton } from "@/components/ui/loading-skeletons";

export default function TerminalPage() {
  return (
    <>
      <Header title="Live Terminal" subtitle="Real-time feed of all agent activity + Virtual Office sync" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          Virtual Office events stream here in green
        </span>
        <Link href="/office" className="text-xs text-blue-400 hover:underline">
          Open full Virtual Office →
        </Link>
      </div>
      <Suspense fallback={<PanelSkeleton className="h-[500px]" />}>
        <TerminalFeed live />
      </Suspense>
    </>
  );
}
