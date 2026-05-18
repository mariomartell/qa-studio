import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../../../_lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key } = await params;
  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const runs = await prisma.testRun.findMany({
    where: { projectId: project.id },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { cases: true } } },
  });

  return Response.json(runs.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    assignedTester: r.assignedTester,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    caseCount: r._count.cases,
  })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key } = await params;
  const body = await req.json();
  const { name, description, assignedTester, caseIds, folderNames } = body;

  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  // Resolve which cases to include
  let cases: { id: string }[] = [];
  if (Array.isArray(caseIds) && caseIds.length > 0) {
    cases = await prisma.testCase.findMany({
      where: { id: { in: caseIds }, projectId: project.id },
      select: { id: true },
    });
  } else if (Array.isArray(folderNames) && folderNames.length > 0) {
    cases = await prisma.testCase.findMany({
      where: { projectId: project.id, folder: { name: { in: folderNames } } },
      select: { id: true },
    });
  } else {
    // All cases in project
    cases = await prisma.testCase.findMany({
      where: { projectId: project.id },
      select: { id: true },
    });
  }

  const run = await prisma.testRun.create({
    data: {
      projectId: project.id,
      name,
      description: description ?? null,
      assignedTester: assignedTester ?? null,
      cases: {
        create: cases.map((c, i) => ({
          testCaseId: c.id,
          order: i,
          status: "Untested",
        })),
      },
    },
  });

  return Response.json({ id: run.id, name: run.name, caseCount: cases.length }, { status: 201 });
}
