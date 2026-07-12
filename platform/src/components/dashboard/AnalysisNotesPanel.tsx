import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  storageKey: string;
  title?: string;
  placeholder?: string;
};

export function AnalysisNotesPanel({
  storageKey,
  title = "Your Observations",
  placeholder = "Add private notes for this analysis — sale room impressions, physical notes, budget limits, vet comments…",
}: Props) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bsai-notes:${storageKey}`);
      if (saved) setNotes(saved);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(`bsai-notes:${storageKey}`, notes);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [notes, storageKey]);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="h-4 w-4 text-secondary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={placeholder}
          className="min-h-[120px] resize-y text-sm bg-background/50"
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Saved locally on this device. Include these notes when reviewing PDFs or sharing with your team.
        </p>
      </CardContent>
    </Card>
  );
}
