import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ONBOARDING_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-crypto";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    accountType,
    name,
    industry,
    country,
    language,
    employeeCount,
    objectives,
    departments = [],
    customNeed,
  } = body as {
    accountType: "COMPANY" | "PERSONAL";
    name: string;
    industry?: string;
    country?: string;
    language?: string;
    employeeCount?: string;
    objectives?: string;
    departments?: string[];
    customNeed?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      type: accountType === "PERSONAL" ? "PERSONAL" : "COMPANY",
      industry: industry || null,
      country: country || null,
      language: language || "en",
      employeeCount: employeeCount || null,
      objectives: objectives || null,
      memberships: {
        create: {
          userEmail: session.email,
          role: "OWNER",
        },
      },
      workspaces: {
        create: {
          name: accountType === "PERSONAL" ? "Personal Workspace" : "Main Workspace",
        },
      },
      subscriptions: {
        create: { plan: "starter", status: "active" },
      },
    },
  });

  const templateWhere =
    industry === "Bloodstock / Equine"
      ? {
          OR: [
            { department: { in: departments } },
            { industryPack: "Bloodstock / Equine" },
          ],
        }
      : { department: { in: departments } };

  const templates = await prisma.agentTemplate.findMany({
    where: templateWhere,
  });

  for (const template of templates) {
    const baseSlug = `${slugify(template.slug)}-${org.id.slice(-6)}`;
    await prisma.agent.create({
      data: {
        slug: baseSlug,
        name: template.name,
        role: template.role,
        room: template.department,
        bio: template.description,
        tools: template.integrations || "[]",
        avatarColor: template.avatarColor,
        organizationId: org.id,
        templateId: template.id,
        objective: template.description,
        skills: template.capabilities,
        personality: "Professional, proactive, concise",
        permissions: JSON.stringify(["read", "draft", "research"]),
      },
    });
  }

  if (customNeed?.trim()) {
    const customSlug = `custom-${org.id.slice(-6)}-${Date.now().toString(36)}`;
    await prisma.agent.create({
      data: {
        slug: customSlug,
        name: "Custom Agent",
        role: "Custom AI Agent",
        room: "custom",
        bio: customNeed.trim(),
        tools: "[]",
        avatarColor: "#E600A0",
        organizationId: org.id,
        objective: customNeed.trim(),
        skills: JSON.stringify(["Custom configuration"]),
        personality: "Adaptive and helpful",
        permissions: JSON.stringify(["read", "draft"]),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorEmail: session.email,
      action: "onboarding.completed",
      meta: JSON.stringify({ departments, industry }),
    },
  });

  const response = NextResponse.json({ ok: true, redirect: "/dashboard", organizationId: org.id });
  response.cookies.set(ONBOARDING_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
