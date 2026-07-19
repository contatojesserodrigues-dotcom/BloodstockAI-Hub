import { NextResponse } from "next/server";
import { registerUser, createSessionToken, SESSION_MAX_AGE, COOKIE_NAME } from "@/lib/auth";
import { ONBOARDING_COOKIE } from "@/lib/auth-crypto";
import { prisma } from "@/lib/prisma";
import { getCatalogAgent } from "@/lib/agent-catalog";
import {
  AGENT_MONTHLY_USD,
  INTEGRATION_SETUP_FEE_USD,
  PREMIUM_SUPPORT_MONTHLY_USD,
  estimateSignupQuote,
} from "@/lib/pricing";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      accountType,
      companyName,
      industry,
      country,
      language,
      employeeCount,
      objectives,
      agentIds = [],
      premiumSupport = false,
    } = body as {
      email: string;
      password: string;
      name?: string;
      accountType: "COMPANY" | "PERSONAL";
      companyName: string;
      industry?: string;
      country?: string;
      language?: string;
      employeeCount?: string;
      objectives?: string;
      agentIds?: string[];
      premiumSupport?: boolean;
    };

    if (!email?.trim() || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Valid email and password (min 8 characters) are required." },
        { status: 400 }
      );
    }
    if (!companyName?.trim()) {
      return NextResponse.json({ error: "Company / workspace name is required." }, { status: 400 });
    }
    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json({ error: "Select at least one AI agent." }, { status: 400 });
    }

    const user = await registerUser({
      email,
      password,
      name: name || companyName,
    });

    const quote = estimateSignupQuote({
      agentCount: agentIds.length,
      premiumSupport: Boolean(premiumSupport),
    });

    const org = await prisma.organization.create({
      data: {
        name: companyName.trim(),
        type: accountType === "PERSONAL" ? "PERSONAL" : "COMPANY",
        industry: industry || null,
        country: country || null,
        language: language || "en",
        employeeCount: employeeCount || null,
        objectives: objectives || null,
        memberships: {
          create: { userEmail: user.email, role: "OWNER" },
        },
        workspaces: {
          create: {
            name: accountType === "PERSONAL" ? "Personal Workspace" : "Main Workspace",
          },
        },
        subscriptions: {
          create: {
            plan: premiumSupport ? "premium" : "starter",
            status: "active",
          },
        },
      },
    });

    for (const agentId of agentIds) {
      const catalog = getCatalogAgent(agentId);
      if (!catalog) continue;
      const slug = `${slugify(catalog.id)}-${org.id.slice(-6)}`;
      await prisma.agent.create({
        data: {
          slug,
          name: catalog.name,
          role: catalog.role,
          room: catalog.departmentId,
          bio: catalog.description,
          tools: JSON.stringify([]),
          avatarColor: "#6A0DAD",
          organizationId: org.id,
          objective: catalog.description,
          skills: JSON.stringify(catalog.functions),
          personality: "Professional, proactive, concise",
          permissions: JSON.stringify(["read", "draft", "research"]),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorEmail: user.email,
        action: "signup.completed",
        meta: JSON.stringify({
          agentIds,
          premiumSupport,
          quote,
          pricing: {
            agentMonthlyUsd: AGENT_MONTHLY_USD,
            setupFeeUsd: INTEGRATION_SETUP_FEE_USD,
            premiumMonthlyUsd: PREMIUM_SUPPORT_MONTHLY_USD,
          },
        }),
      },
    });

    const token = await createSessionToken(user.email);
    const response = NextResponse.json({
      ok: true,
      redirect: "/dashboard",
      quote,
      organizationId: org.id,
    });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    response.cookies.set(ONBOARDING_COOKIE, "1", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
