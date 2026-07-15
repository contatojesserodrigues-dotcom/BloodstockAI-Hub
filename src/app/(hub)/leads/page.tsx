import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listLeads } from "@/lib/db/conversations";
import { formatCurrency } from "@/lib/utils";

export default async function LeadsPage() {
  const { leads } = await listLeads(50);

  return (
    <>
      <Header title="Lead Database" subtitle="Companies, contacts and leads across UK, Ireland and global bloodstock markets" />
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bs-border text-left text-bs-muted">
              <th className="p-4 font-medium">Company</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Country</th>
              <th className="p-4 font-medium">Segment</th>
              <th className="p-4 font-medium">Stage</th>
              <th className="p-4 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-bs-muted">
                  No leads yet. Run a Tavily search from the Command Center.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-bs-border/50 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium">{lead.company_name}</td>
                  <td className="p-4 text-white/50">{lead.contact_name || "—"}</td>
                  <td className="p-4 text-white/50">{lead.email || "—"}</td>
                  <td className="p-4 text-white/50">{lead.country || "—"}</td>
                  <td className="p-4 text-white/50">{lead.segment || "—"}</td>
                  <td className="p-4"><StatusBadge status={lead.stage} /></td>
                  <td className="p-4">{formatCurrency(lead.value || 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
