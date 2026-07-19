import { PrismaClient } from "@prisma/client";
import { AGENT_TEMPLATE_SEEDS } from "./agent-templates.ts";

const prisma = new PrismaClient();

async function main() {
  await prisma.agentTemplate.deleteMany();
  for (const t of AGENT_TEMPLATE_SEEDS) {
    await prisma.agentTemplate.create({ data: t });
  }
  console.log("Seeded templates:", await prisma.agentTemplate.count());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
