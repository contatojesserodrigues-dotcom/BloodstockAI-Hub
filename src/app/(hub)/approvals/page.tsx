import { prisma } from "@/lib/prisma";
import { ApprovalList } from "@/components/approvals/ApprovalList";

export const revalidate = 15;

export default async function ApprovalsPage() {
  const approvals = await prisma.approvalRequest.findMany({
    include: { agent: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const items = approvals.map((a) => ({
    id: a.id,
    agentSlug: a.agent.slug,
    type: a.type,
    title: a.title,
    description: a.description ?? undefined,
    preview: a.preview ?? undefined,
    riskLevel: a.riskLevel,
    status: a.status,
  }));

  return <ApprovalList initialItems={items} />;
}
