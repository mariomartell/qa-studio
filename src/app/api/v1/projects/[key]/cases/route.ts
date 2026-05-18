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
  const { searchParams } = new URL(req.url);
  const folderName = searchParams.get("folder");

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const cases = await prisma.testCase.findMany({
    where: {
      projectId: project.id,
      ...(folderName ? { folder: { name: folderName } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { folder: { select: { name: true } } },
  });

  return Response.json(cases.map((c) => ({
    id: c.id,
    title: c.title,
    folder: c.folder?.name ?? null,
    priority: c.priority,
    status: c.status,
    tags: c.tags,
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
  const { title, description, expectedResult, priority, type, folderName, tags } = body;

  if (!title) return Response.json({ error: "title is required" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  let folderId: string | null = null;
  if (folderName) {
    const folder = await prisma.folder.findFirst({
      where: { name: folderName, projectId: project.id },
    });
    if (!folder) return Response.json({ error: `Folder "${folderName}" not found` }, { status: 400 });
    folderId = folder.id;
  }

  const created = await prisma.testCase.create({
    data: {
      projectId: project.id,
      folderId,
      title,
      description: description ?? null,
      expectedResult: expectedResult ?? null,
      priority: priority ?? "Medium",
      type: type ?? "Functional",
      tags: tags ?? null,
    },
  });

  return Response.json({ id: created.id, title: created.title }, { status: 201 });
}
