import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../../../../_lib/auth";

type Params = { params: Promise<{ key: string; caseId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key, caseId } = await params;
  const tc = await prisma.testCase.findFirst({
    where: { id: caseId, project: { key: key.toUpperCase() } },
    include: { folder: { select: { name: true } } },
  });
  if (!tc) return Response.json({ error: "Test case not found" }, { status: 404 });

  return Response.json({
    id: tc.id,
    title: tc.title,
    description: tc.description,
    expectedResult: tc.expectedResult,
    priority: tc.priority,
    status: tc.status,
    tags: tc.tags,
    folder: tc.folder?.name ?? null,
    createdAt: tc.createdAt,
    updatedAt: tc.updatedAt,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key, caseId } = await params;
  const body = await req.json();
  const { title, description, expectedResult, priority, tags, folderName } = body;

  const tc = await prisma.testCase.findFirst({
    where: { id: caseId, project: { key: key.toUpperCase() } },
  });
  if (!tc) return Response.json({ error: "Test case not found" }, { status: 404 });

  let folderId: string | null | undefined = undefined;
  if (folderName !== undefined) {
    if (folderName === null) {
      folderId = null;
    } else {
      const folder = await prisma.folder.findFirst({
        where: { name: folderName, projectId: tc.projectId },
      });
      if (!folder) return Response.json({ error: `Folder "${folderName}" not found` }, { status: 400 });
      folderId = folder.id;
    }
  }

  const updated = await prisma.testCase.update({
    where: { id: caseId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(expectedResult !== undefined && { expectedResult }),
      ...(priority !== undefined && { priority }),
      ...(tags !== undefined && { tags }),
      ...(folderId !== undefined && { folderId }),
      updatedAt: new Date(),
    },
  });

  return Response.json({ id: updated.id, title: updated.title, updatedAt: updated.updatedAt });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { key, caseId } = await params;
  const tc = await prisma.testCase.findFirst({
    where: { id: caseId, project: { key: key.toUpperCase() } },
  });
  if (!tc) return Response.json({ error: "Test case not found" }, { status: 404 });

  await prisma.testCase.delete({ where: { id: caseId } });
  return new Response(null, { status: 204 });
}
