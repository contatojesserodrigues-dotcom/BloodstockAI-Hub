import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    role,
    objective,
    personality,
    skills = [],
    tools = [],
    knowledgeSources,
    templateSlug,
  } = body as {
    name: string;
    role: string;
    objective: string;
    personality?: string;
    skills?: string[];
    tools?: string[];
    knowledgeSources?: string;
    templateSlug?: string | null;
  };

  if (!name?.trim() || !role?.trim() || !objective?.trim()) {
    return NextResponse.json({ error: "Name, role, and objective are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: { userEmail: session.email },
    orderBy: { createdAt: "asc" },
  });

  const template = templateSlug
    ? await prisma.agentTemplate.findUnique({ where: { slug: templateSlug } })
    : null;

  const slug = `${slugify(name)}-${Date.now().toString(36)}`;

  const agent = await prisma.agent.create({
    data: {
      slug,
      name: name.trim(),
      role: role.trim(),
      room: template?.department || "custom",
      bio: objective.trim(),
      tools: JSON.stringify(tools),
      avatarColor: template?.avatarColor || "#6A0DAD",
      organizationId: membership?.orgId || null,
      templateId: template?.id || null,
      objective: objective.trim(),
      personality: personality || null,
      skills: JSON.stringify(skills),
      permissions: JSON.stringify(["read", "draft", "research"]),
      knowledgeSources: knowledgeSources || null,
    },
  });

  return NextResponse.json({ ok: true, slug: agent.slug, id: agent.id });
}
