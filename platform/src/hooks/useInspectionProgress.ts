/**
 * Subscribe to async inspection pipeline progress (PASSO 10).
 * Data-only hook — no UI changes; triggers onAnalysisUpdate callback.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProcessingStep = {
  module?: string;
  status?: "pending" | "running" | "complete" | "failed";
  updated_at?: string;
  query?: string;
  error?: string;
};

export function useInspectionProgress(
  analysisId: string | null | undefined,
  onUpdate: () => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!analysisId) return;

    const channel = supabase
      .channel(`inspection-progress-${analysisId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inspection_analyses",
          filter: `id=eq.${analysisId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const step = row.processing_step as ProcessingStep | undefined;
          const progress = row.processing_progress as number | undefined;
          if (step?.status === "complete" || step?.status === "failed" || (progress != null && progress > 0)) {
            onUpdateRef.current();
          }
        },
      )
      .subscribe();

    // Fallback poll while research runs (Realtime may lag)
    const poll = setInterval(() => {
      void (async () => {
        const { data } = await (supabase as any)
          .from("inspection_analyses")
          .select("processing_status, processing_progress")
          .eq("id", analysisId)
          .maybeSingle();
        if (data?.processing_status === "processing" || data?.processing_status === "complete") {
          onUpdateRef.current();
        }
      })();
    }, 8000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [analysisId]);
}
