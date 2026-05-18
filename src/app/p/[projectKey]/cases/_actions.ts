"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function s(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(formData: FormData, key: string) {
  const v = s(formData, key);
  return v.length > 0 ? v : null;
}

export async function createCase(projectKey: string, formData: FormData) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const title = s(formData, "title");
  if (!title) throw new Error("title is required");

  const folderId = opt(formData, "folderId");
  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, projectId: project.id },
      select: { id: true },
    });
    if (!folder) throw new Error("invalid folder");
  }

  const created = await prisma.testCase.create({
    data: {
      projectId: project.id,
      folderId,
      title,
      description: opt(formData, "description"),
      expectedResult: opt(formData, "expectedResult"),
      priority: s(formData, "priority") || "Medium",
      type: s(formData, "type") || "Functional",
      status: s(formData, "status") || "Draft",
      tags: opt(formData, "tags"),
    },
  });

  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/cases/${created.id}`);
}

export async function updateCase(
  projectKey: string,
  caseId: string,
  formData: FormData,
) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const existing = await prisma.testCase.findFirst({
    where: { id: caseId, projectId: project.id },
    select: { id: true },
  });
  if (!existing) throw new Error("case not found in this project");

  const folderId = opt(formData, "folderId");
  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, projectId: project.id },
      select: { id: true },
    });
    if (!folder) throw new Error("invalid folder");
  }

  await prisma.testCase.update({
    where: { id: caseId },
    data: {
      folderId,
      title: s(formData, "title"),
      description: opt(formData, "description"),
      expectedResult: opt(formData, "expectedResult"),
      priority: s(formData, "priority") || "Medium",
      type: s(formData, "type") || "Functional",
      status: s(formData, "status") || "Draft",
      tags: opt(formData, "tags"),
    },
  });

  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/cases/${caseId}`);
}

export async function deleteCase(projectKey: string, caseId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const existing = await prisma.testCase.findFirst({
    where: { id: caseId, projectId: project.id },
    select: { id: true },
  });
  if (!existing) throw new Error("case not found in this project");

  await prisma.testCase.delete({ where: { id: caseId } });
  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/repository`);
}
