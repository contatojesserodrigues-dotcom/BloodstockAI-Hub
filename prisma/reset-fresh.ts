import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.conversation.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.emailDraft.deleteMany();
  await prisma.agentLog.deleteMany();
  await prisma.agentTask.deleteMany();
  await prisma.cRMDeal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.campaign.deleteMany();

  const agents = await prisma.agent.findMany();

  if (agents.length === 0) {
    console.log("No agents found — run npm run db:setup first.");
    return;
  }

  for (const agent of agents) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: "IDLE",
        currentTask: "Standing by for commands",
        lastAction: "Dashboard reset — ready to start fresh",
      },
    });

    await prisma.agentLog.create({
      data: {
        agentId: agent.id,
        message: "Operations Hub reset. Awaiting first command.",
        level: "info",
      },
    });
  }

  console.log("Dashboard reset complete:");
  console.log(`  Agents: ${agents.length} (all IDLE)`);
  console.log("  Leads: 0");
  console.log("  Pending approvals: 0");
  console.log("  Pipeline deals: 0");
  console.log("  Terminal logs: fresh start");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
