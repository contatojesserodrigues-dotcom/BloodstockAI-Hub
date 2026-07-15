import { NextResponse } from "next/server";
import { CONSIGNOR_WORKFLOW, getAgentBySlug } from "@/lib/workflow";

export async function POST() {
  const steps = CONSIGNOR_WORKFLOW.map((step) => {
    const agent = getAgentBySlug(step.agentSlug);
    return {
      agent: agent?.name,
      action: step.action,
      delay: step.delay,
    };
  });
  return NextResponse.json({ workflow: "consignor-outreach", steps });
}
