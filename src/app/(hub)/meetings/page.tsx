import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";

export default async function MeetingsPage() {
  let meetings: Awaited<ReturnType<typeof prisma.meeting.findMany>> = [];
  try {
    meetings = await prisma.meeting.findMany({ orderBy: { datetime: "asc" } });
  } catch {
    // Supabase-only production — no local SQLite
  }

  return (
    <>
      <Header title="Meetings" subtitle="Calendar and scheduled sales meetings" />
      <div className="space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="glass glass-hover flex items-center gap-4 rounded-2xl p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bs-accent/20">
              <Calendar className="h-5 w-5 text-bs-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{m.title}</p>
              <p className="text-sm text-bs-muted">{m.attendee}</p>
            </div>
            <div className="text-right">
              <p className="text-sm">{formatDate(m.datetime)}</p>
              <p className="text-xs text-bs-muted">{m.status}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
