import { ApprovalList } from "@/components/approvals/ApprovalList";
import { listApprovals } from "@/lib/db/approvals";

export const revalidate = 10;

export default async function ApprovalsPage() {
  const { approvals } = await listApprovals(30);

  const items = approvals.map((a) => ({
    id: a.id,
    agentSlug: a.agent_name.toLowerCase().replace(/\s+/g, "-"),
    type: a.action_type,
    title: a.subject || `${a.action_type} — ${a.company}`,
    description: a.full_message ?? undefined,
    preview: a.message_preview ?? undefined,
    riskLevel: a.risk_level || "medium",
    status: a.status.toUpperCase(),
  }));

  return <ApprovalList initialItems={items} />;
}
