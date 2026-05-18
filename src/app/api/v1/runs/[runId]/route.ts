import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../../_lib/auth";

type Params = { params: Promise<{ runId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { runId } = await params;
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      cases: {
        orderBy: { order: "asc" },
        include: {
          testCase: {
            select: { title: true, priority: true, folder: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });

  const counts = run.cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return Response.json({
    id: run.id,
    name: run.name,
    description: run.description,
    status: run.status,
    assignedTester: run.assignedTester,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    summary: counts,
    cases: run.cases.map((rc) => ({
      id: rc.id,
      title: rc.testCase.title,
      folder: rc.testCase.folder?.name ?? null,
      priority: rc.testCase.priority,
      status: rc.status,
      actualResult: rc.actualResult,
      executedAt: rc.executedAt,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { runId } = await params;
  const body = await req.json();
  const { status } = body;

  const run = await prisma.testRun.findUnique({ where: { id: runId } });
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });

  const VALID = ["InProgress", "Completed"];
  if (!VALID.includes(status)) {
    return Response.json({ error: `status must be one of: ${VALID.join(", ")}` }, { status: 400 });
  }

  const updated = await prisma.testRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: status === "Completed" ? new Date() : null,
    },
  });

  return Response.json({ id: updated.id, status: updated.status, completedAt: updated.completedAt });
}
