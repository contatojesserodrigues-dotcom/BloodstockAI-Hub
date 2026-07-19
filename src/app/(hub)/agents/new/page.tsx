import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { AgentBuilderForm } from "@/components/agents/AgentBuilderForm";

export const dynamic = "force-dynamic";

export default async function AgentBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const template = params.template
    ? await prisma.agentTemplate.findUnique({ where: { slug: params.template } })
    : null;

  return (
    <Suspense fallback={<div className="glass h-96 animate-pulse rounded-2xl" />}>
      <AgentBuilderForm
        initialTemplate={
          template
            ? {
                name: template.name,
                role: template.role,
                description: template.description,
                capabilities: template.capabilities,
                integrations: template.integrations,
              }
            : null
        }
      />
    </Suspense>
  );
}
