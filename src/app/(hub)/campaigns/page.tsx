import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/prisma";

export default async function CampaignsPage() {
  let campaigns: Awaited<ReturnType<typeof prisma.campaign.findMany>> = [];
  try {
    campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    // Supabase-only production — no local SQLite
  }

  return (
    <>
      <Header title="Campaigns" subtitle="Email campaigns and auction outreach" />
      <div className="space-y-4">
        {campaigns.map((c) => (
          <div key={c.id} className="glass glass-hover rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-bs-muted">Created {c.createdAt.toLocaleDateString()}</p>
              </div>
              <StatusBadge status={c.status === "active" ? "SENDING_APPROVED" : "WAITING_APPROVAL"} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div><p className="text-[11px] text-bs-muted">Sent</p><p className="text-lg font-light">{c.sent}</p></div>
              <div><p className="text-[11px] text-bs-muted">Opened</p><p className="text-lg font-light">{c.opened}</p></div>
              <div><p className="text-[11px] text-bs-muted">Replied</p><p className="text-lg font-light">{c.replied}</p></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
