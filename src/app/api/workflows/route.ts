import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function orgIdForUser(email: string) {
  const membership = await prisma.membership.findFirst({
    where: { userEmail: email },
    orderBy: { createdAt: "asc" },
  });
  return membership?.orgId ?? null;
}

export async function GET() {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await orgIdForUser(session.email);
  const workflows = await prisma.workflow.findMany({
    where: orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ workflows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const orgId = await orgIdForUser(session.email);
  const graph = typeof body.graph === "string" ? body.graph : JSON.stringify(body.graph || {});

  const created = await prisma.workflow.create({
    data: {
      name: String(body.name || "Untitled workflow"),
      engine: body.engine === "n8n" ? "n8n" : "native",
      trigger: body.trigger ? String(body.trigger) : null,
      actions: body.actions ? String(body.actions) : null,
      graph,
      organizationId: orgId,
      enabled: true,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const graph = typeof body.graph === "string" ? body.graph : JSON.stringify(body.graph || {});

  const updated = await prisma.workflow.update({
    where: { id: String(body.id) },
    data: {
      name: String(body.name || "Untitled workflow"),
      engine: body.engine === "n8n" ? "n8n" : "native",
      trigger: body.trigger ? String(body.trigger) : null,
      actions: body.actions ? String(body.actions) : null,
      graph,
    },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
