import { Header } from "@/components/layout/Header";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { getLiveAgent } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Target, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function CEOPage() {
  const evelyn = (await getLiveAgent("evelyn-stone"))!;
  const [deals, leads, pendingApprovals] = await Promise.all([
    prisma.cRMDeal.aggregate({ _sum: { value: true }, _count: true }),
    prisma.lead.count(),
    prisma.approvalRequest.count({ where: { status: "PENDING" } }),
  ]);

  const recommendations = [
    { icon: CheckCircle2, text: "Approve 12 consignor outreach emails from Sophia Bennett - high-intent UK/Ireland segment.", type: "action" },
    { icon: TrendingUp, text: "Pipeline up 18% this week. 3 deals moved to Meeting Booked.", type: "positive" },
    { icon: Target, text: "Focus on Tattersalls October Sale prospects - Liam Foster identified 24 warm targets.", type: "info" },
    { icon: AlertCircle, text: `${pendingApprovals} actions awaiting approval before agents can proceed.`, type: "warning" },
  ];

  return (
    <>
      <Header title="CEO Dashboard" subtitle="Executive intelligence by Evelyn Stone" />

      <div className="mb-6 flex items-center gap-4 glass rounded-2xl p-5">
        <AgentAvatar name={evelyn.name} color={evelyn.avatarColor} size="lg" />
        <div>
          <p className="text-lg font-medium">{evelyn.name}</p>
          <p className="text-sm text-bs-muted">{evelyn.role}</p>
          <p className="mt-2 text-sm text-white/50">{evelyn.currentTask}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pipeline Value", value: formatCurrency(deals._sum.value || 0) },
          { label: "Active Deals", value: deals._count },
          { label: "Total Leads", value: leads },
          { label: "Pending Approvals", value: pendingApprovals },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider text-bs-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-light">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-medium">Daily Executive Summary</h2>
        <p className="mb-6 text-sm leading-relaxed text-white/60">
          Good morning Jesse. The UK/Ireland consignor workflow is 80% complete. James Carter identified 50 leads,
          Emma Collins completed research dossiers, and Oliver Brooks synced CRM records. Sophia Bennett has 12 email
          drafts awaiting your approval before any outreach is sent. Pipeline value stands at {formatCurrency(deals._sum.value || 0)} with
          strong momentum in the consignor segment.
        </p>
        <h3 className="mb-3 text-sm font-medium text-white/70">Recommended Decisions</h3>
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-bs-border p-4">
              <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-bs-accent" />
              <p className="text-sm text-white/60">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
