import { SEED_AGENTS, SEED_INTEGRATIONS } from "./seed-data.ts";
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
  await prisma.company.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.toolConnection.deleteMany();
  await prisma.providerConfig.deleteMany();

  for (const agent of SEED_AGENTS) {
    const created = await prisma.agent.create({
      data: {
        slug: agent.slug,
        name: agent.name,
        role: agent.role,
        room: agent.room,
        bio: agent.bio,
        status: agent.status,
        currentTask: agent.currentTask,
        lastAction: agent.lastAction,
        tools: JSON.stringify(agent.tools),
        avatarColor: agent.avatarColor,
      },
    });

    await prisma.agentLog.create({
      data: { agentId: created.id, message: agent.lastAction, level: "info" },
    });
  }

  const sophia = await prisma.agent.findUnique({ where: { slug: "sophia-bennett" } });
  const james = await prisma.agent.findUnique({ where: { slug: "james-carter" } });
  const victoria = await prisma.agent.findUnique({ where: { slug: "victoria-green" } });
  const oliver = await prisma.agent.findUnique({ where: { slug: "oliver-brooks" } });

  const companies = [
    { name: "Highclere Thoroughbred Racing", country: "UK", segment: "Consignor" },
    { name: "Coolmore Stud", country: "Ireland", segment: "Stud Farm" },
    { name: "Tattersalls", country: "UK", segment: "Auction House" },
    { name: "Goffs", country: "Ireland", segment: "Auction House" },
    { name: "Darley Stud", country: "UK", segment: "Stud Farm" },
  ];

  for (const c of companies) {
    await prisma.company.create({ data: c });
  }

  const stages = ["NEW_LEAD", "RESEARCHED", "CONTACT_DRAFTED", "CONTACTED", "OPENED", "REPLIED", "MEETING_BOOKED", "PROPOSAL_SENT", "WON"] as const;
  const segments = ["Consignor", "Stud Farm", "Trainer", "Bloodstock Agent", "Owner"];
  const countries = ["UK", "Ireland", "USA", "Australia", "France"];

  for (let i = 0; i < 50; i++) {
    await prisma.lead.create({
      data: {
        name: `Lead ${i + 1} - ${segments[i % segments.length]}`,
        email: `contact${i + 1}@example.com`,
        company: companies[i % companies.length].name,
        country: countries[i % countries.length],
        segment: segments[i % segments.length],
        stage: stages[i % stages.length],
        value: 5000 + i * 1200,
        source: i % 2 === 0 ? "Apollo" : "Clay",
      },
    });
  }

  for (const stage of stages) {
    const count = await prisma.lead.count({ where: { stage } });
    if (count > 0) {
      await prisma.cRMDeal.create({
        data: {
          title: `${stage.replace(/_/g, " ")} Pipeline`,
          value: count * 15000,
          stage,
          owner: "Oliver Brooks",
        },
      });
    }
  }

  if (sophia) {
    const draft = await prisma.emailDraft.create({
      data: {
        agentId: sophia.id,
        subject: "BloodstockAI x Tattersalls October Sale - Partnership Opportunity",
        body: "Dear [Name],\n\nI hope this finds you well ahead of the upcoming Tattersalls October Sale. At BloodstockAI, we help consignors and bloodstock professionals streamline lead research, CRM and personalized outreach...\n\nWould you be open to a brief call next week?\n\nBest regards,\nBloodstockAI Team",
        recipient: "contact@highclere-racing.co.uk",
        status: "PENDING",
      },
    });

    await prisma.approvalRequest.create({
      data: {
        agentId: sophia.id,
        type: "Email Draft",
        title: "Auction outreach - 12 consignor leads",
        description: "Personalized emails for UK/Ireland consignors identified by James Carter",
        preview: draft.body,
        riskLevel: "low",
        emailDraftId: draft.id,
      },
    });

    await prisma.approvalRequest.create({
      data: {
        agentId: sophia.id,
        type: "Email Draft",
        title: "Follow-up for opened-but-no-reply leads",
        description: "3 leads opened initial email but did not respond",
        preview: "Hi [Name], I wanted to follow up on my previous note regarding BloodstockAI...",
        riskLevel: "low",
      },
    });
  }

  if (oliver) {
    await prisma.approvalRequest.create({
      data: {
        agentId: oliver.id,
        type: "CRM Update",
        title: "Move 5 deals to Meeting Booked",
        description: "HubSpot pipeline update based on Ethan Walker warm lead flags",
        preview: "Deals: Highclere Racing, Coolmore Outreach, Goffs Partnership, Darley Stud, Irish Consignor Batch",
        riskLevel: "medium",
      },
    });
  }

  if (victoria) {
    await prisma.approvalRequest.create({
      data: {
        agentId: victoria.id,
        type: "Partnership Message",
        title: "Australian stud farm partnership proposal",
        description: "Draft partnership outreach to 2 AU stud farms",
        preview: "Dear [Name], BloodstockAI is exploring strategic partnerships with leading stud farms in Australia...",
        riskLevel: "medium",
      },
    });
  }

  await prisma.meeting.createMany({
    data: [
      { title: "BloodstockAI Demo - Highclere Racing", attendee: "Sales Team", datetime: new Date("2026-07-15T14:00:00"), status: "scheduled" },
      { title: "Partnership Call - Coolmore Stud", attendee: "Victoria Green", datetime: new Date("2026-07-17T10:00:00"), status: "scheduled" },
      { title: "Weekly Pipeline Review", attendee: "Ethan Walker", datetime: new Date("2026-07-12T09:00:00"), status: "scheduled" },
    ],
  });

  await prisma.campaign.createMany({
    data: [
      { name: "Tattersalls October Outreach", status: "pending_approval", sent: 0, opened: 0, replied: 0 },
      { name: "UK Consignor Nurture Sequence", status: "active", sent: 48, opened: 22, replied: 8 },
      { name: "Irish Stud Farm Partnership", status: "draft", sent: 0, opened: 0, replied: 0 },
    ],
  });

  for (const integration of SEED_INTEGRATIONS) {
    await prisma.toolConnection.create({
      data: {
        provider: integration.id,
        label: integration.label,
        connected: "connected" in integration ? integration.connected : ["hubspot", "apollo", "clay"].includes(integration.id),
      },
    });
  }

  console.log("BloodstockAI HUB seeded successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
