import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <>
      <Header title="Lead Database" subtitle="All researched and prospect leads" />
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bs-border text-left text-bs-muted">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Company</th>
              <th className="p-4 font-medium">Country</th>
              <th className="p-4 font-medium">Segment</th>
              <th className="p-4 font-medium">Stage</th>
              <th className="p-4 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-bs-border/50 hover:bg-white/[0.02]">
                <td className="p-4 font-medium">{lead.name}</td>
                <td className="p-4 text-white/50">{lead.company}</td>
                <td className="p-4 text-white/50">{lead.country}</td>
                <td className="p-4 text-white/50">{lead.segment}</td>
                <td className="p-4"><StatusBadge status={lead.stage} /></td>
                <td className="p-4">{formatCurrency(lead.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
