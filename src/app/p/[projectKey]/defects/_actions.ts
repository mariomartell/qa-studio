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

export async function createDefect(projectKey: string, formData: FormData) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const title = s(formData, "title");
  if (!title) throw new Error("title is required");

  // Optional link to an existing run case / case / session.
  const linkRunCaseId = opt(formData, "linkRunCaseId");
  const linkCaseId = opt(formData, "linkCaseId");
  const linkSessionId = opt(formData, "linkSessionId");

  // Validate any link target is in this project
  if (linkRunCaseId) {
    const rc = await prisma.testRunCase.findFirst({
      where: {
        id: linkRunCaseId,
        testRun: { projectId: project.id },
      },
      select: { id: true },
    });
    if (!rc) throw new Error("invalid run case link");
  }
  if (linkCaseId) {
    const c = await prisma.testCase.findFirst({
      where: { id: linkCaseId, projectId: project.id },
      select: { id: true },
    });
    if (!c) throw new Error("invalid case link");
  }
  if (linkSessionId) {
    const s = await prisma.exploratorySession.findFirst({
      where: { id: linkSessionId, projectId: project.id },
      select: { id: true },
    });
    if (!s) throw new Error("invalid session link");
  }

  const defect = await prisma.defect.create({
    data: {
      projectId: project.id,
      title,
      description: opt(formData, "description"),
      stepsToReproduce: opt(formData, "stepsToReproduce"),
      expectedResult: opt(formData, "expectedResult"),
      actualResult: opt(formData, "actualResult"),
      severity: s(formData, "severity") || "Medium",
      priority: s(formData, "priority") || "Medium",
      status: s(formData, "status") || "Open",
      links: {
        create: [
          ...(linkRunCaseId ? [{ testRunCaseId: linkRunCaseId }] : []),
          ...(linkCaseId ? [{ testCaseId: linkCaseId }] : []),
          ...(linkSessionId ? [{ sessionId: linkSessionId }] : []),
        ],
      },
    },
  });

  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/defects/${defect.id}`);
}

export async function updateDefect(
  projectKey: string,
  defectId: string,
  formData: FormData,
) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const existing = await prisma.defect.findFirst({
    where: { id: defectId, projectId: project.id },
    select: { id: true },
  });
  if (!existing) throw new Error("defect not found");

  await prisma.defect.update({
    where: { id: defectId },
    data: {
      title: s(formData, "title") || undefined,
      description: opt(formData, "description"),
      stepsToReproduce: opt(formData, "stepsToReproduce"),
      expectedResult: opt(formData, "expectedResult"),
      actualResult: opt(formData, "actualResult"),
      severity: s(formData, "severity") || undefined,
      priority: s(formData, "priority") || undefined,
      status: s(formData, "status") || undefined,
    },
  });

  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/defects/${defectId}`);
}

export async function deleteDefect(projectKey: string, defectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const existing = await prisma.defect.findFirst({
    where: { id: defectId, projectId: project.id },
    select: { id: true },
  });
  if (!existing) throw new Error("defect not found");

  await prisma.defect.delete({ where: { id: defectId } });
  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/defects`);
}

export async function unlinkDefectTarget(
  projectKey: string,
  defectId: string,
  formData: FormData,
) {
  const linkId = s(formData, "linkId");
  const link = await prisma.defectLink.findFirst({
    where: { id: linkId, defectId },
    select: { id: true },
  });
  if (!link) return;
  await prisma.defectLink.delete({ where: { id: linkId } });
  revalidatePath(`/p/${projectKey}/defects/${defectId}`);
}
