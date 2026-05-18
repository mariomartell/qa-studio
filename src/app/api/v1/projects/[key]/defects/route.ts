import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../../../_lib/auth";

type Params = { params: Promise<{ key: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const defects = await prisma.defect.findMany({
    where: { projectId: project.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(defects);
}

export async function POST(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key } = await params;
  const body = await req.json();
  const { title, description, stepsToReproduce, expectedResult, actualResult, severity, priority } = body;

  if (!title) return Response.json({ error: "title is required" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const defect = await prisma.defect.create({
    data: {
      projectId: project.id,
      title,
      description: description ?? null,
      stepsToReproduce: stepsToReproduce ?? null,
      expectedResult: expectedResult ?? null,
      actualResult: actualResult ?? null,
      severity: severity ?? "Medium",
      priority: priority ?? "Medium",
    },
  });

  return Response.json({ id: defect.id, title: defect.title }, { status: 201 });
}
