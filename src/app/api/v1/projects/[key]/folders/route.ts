import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../../../_lib/auth";

type Params = { params: Promise<{ key: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key } = await params;
  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const folders = await prisma.folder.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { testCases: true } },
      parent: { select: { name: true } },
    },
  });

  return Response.json(folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentFolder: f.parent?.name ?? null,
    caseCount: f._count.testCases,
  })));
}

export async function POST(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key } = await params;
  const body = await req.json();
  const { name, parentFolderName } = body;

  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  let parentId: string | null = null;
  if (parentFolderName) {
    const parent = await prisma.folder.findFirst({
      where: { name: parentFolderName, projectId: project.id },
    });
    if (!parent) return Response.json({ error: `Parent folder "${parentFolderName}" not found` }, { status: 400 });
    parentId = parent.id;
  }

  const folder = await prisma.folder.create({
    data: { projectId: project.id, name, parentId, order: 0 },
  });

  return Response.json({ id: folder.id, name: folder.name }, { status: 201 });
}
