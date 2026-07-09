import { Header } from "@/components/layout/Header";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { PIPELINE_STAGES } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 30;

export default async function CRMPage() {
  const leads = await prisma.lead.groupBy({ by: ["stage"], _count: true, _sum: { value: true } });
  const pipelineData = PIPELINE_STAGES.map((s) => {
    const found = leads.find((l) => l.stage === s.key);
    return { stage: s.key, count: found?._count || 0, value: found?._sum.value || 0 };
  });

  const totalLeads = leads.reduce((s, l) => s + l._count, 0);
  const totalValue = leads.reduce((s, l) => s + (l._sum.value || 0), 0);
  const meetings = leads.find((l) => l.stage === "MEETING_BOOKED")?._count || 0;
  const replied = leads.find((l) => l.stage === "REPLIED")?._count || 0;
  const contacted = leads.find((l) => l.stage === "CONTACTED")?._count || 0;

  return (
    <>
      <Header title="CRM Pipeline" subtitle="HubSpot-style pipeline overview" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Leads", value: totalLeads },
          { label: "Pipeline Value", value: formatCurrency(totalValue) },
          { label: "Meetings Booked", value: meetings },
          { label: "Response Rate", value: contacted ? `${Math.round((replied / contacted) * 100)}%` : "0%" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider text-bs-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-light">{s.value}</p>
          </div>
        ))}
      </div>
      <PipelineBoard data={pipelineData} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium">Best Country</p>
          <p className="mt-2 text-xl font-light text-bs-accent">United Kingdom</p>
          <p className="text-xs text-bs-muted">42% of active pipeline</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium">Best Segment</p>
          <p className="mt-2 text-xl font-light text-bs-accent">Consignors</p>
          <p className="text-xs text-bs-muted">Highest conversion rate</p>
        </div>
      </div>
    </>
  );
}
