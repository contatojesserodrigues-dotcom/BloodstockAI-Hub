import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await getSession();
  const membership = session?.email
    ? await prisma.membership.findFirst({ where: { userEmail: session.email } })
    : null;
  const docs = membership
    ? await prisma.knowledgeDocument.findMany({
        where: { organizationId: membership.orgId },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <>
      <Header title="Knowledge Base" subtitle="Documents and memories available to your agents" />
      <div className="glass rounded-2xl p-8 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-bs-accent" />
        <p className="mt-3 text-sm text-bs-muted">
          {docs.length === 0
            ? "No documents yet. Upload knowledge sources from Agent Builder or Settings (Phase 2 storage)."
            : `${docs.length} document(s) in your organization.`}
        </p>
        {docs.length > 0 && (
          <ul className="mt-6 space-y-2 text-left">
            {docs.map((d) => (
              <li key={d.id} className="rounded-xl border border-bs-border px-4 py-3 text-sm">
                {d.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
