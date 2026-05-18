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

export async function createRun(projectKey: string, formData: FormData) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const name = s(formData, "name");
  if (!name) throw new Error("name is required");

  const caseIds = formData.getAll("caseId").map(String).filter(Boolean);
  if (caseIds.length === 0) throw new Error("select at least one case");

  const validCases = await prisma.testCase.findMany({
    where: { id: { in: caseIds }, projectId: project.id },
    select: { id: true },
  });
  if (validCases.length !== caseIds.length) {
    throw new Error("invalid case selection");
  }

  const run = await prisma.testRun.create({
    data: {
      projectId: project.id,
      name,
      description: opt(formData, "description"),
      assignedTester: opt(formData, "assignedTester"),
      status: "InProgress",
      cases: {
        create: caseIds.map((cid, i) => ({
          testCaseId: cid,
          order: i,
          status: "Untested",
        })),
      },
    },
  });

  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/runs/${run.id}/execute`);
}

export async function deleteRun(projectKey: string, runId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const run = await prisma.testRun.findFirst({
    where: { id: runId, projectId: project.id },
    select: { id: true },
  });
  if (!run) throw new Error("run not found");
  await prisma.testRun.delete({ where: { id: runId } });
  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/runs`);
}

export async function setRunCaseResult(
  projectKey: string,
  runCaseId: string,
  formData: FormData,
) {
  const status = s(formData, "status");
  const actualResult = opt(formData, "actualResult");
  const allowed = ["Untested", "Passed", "Failed", "Blocked", "Skipped"];
  if (!allowed.includes(status)) throw new Error("invalid status");

  const runCase = await prisma.testRunCase.findFirst({
    where: { id: runCaseId, testRun: { project: { key: projectKey } } },
    select: { id: true, testRunId: true },
  });
  if (!runCase) throw new Error("run case not found");

  await prisma.testRunCase.update({
    where: { id: runCaseId },
    data: {
      status,
      actualResult,
      executedAt: status === "Untested" ? null : new Date(),
      executedBy: status === "Untested" ? null : "Local user",
    },
  });

  revalidatePath(`/p/${projectKey}/runs/${runCase.testRunId}`);
  revalidatePath(`/p/${projectKey}/runs/${runCase.testRunId}/execute`);
  revalidatePath(`/p/${projectKey}`);
}

export async function completeRun(projectKey: string, runId: string) {
  const run = await prisma.testRun.findFirst({
    where: { id: runId, project: { key: projectKey } },
    select: { id: true },
  });
  if (!run) throw new Error("run not found");
  await prisma.testRun.update({
    where: { id: runId },
    data: { status: "Completed", completedAt: new Date() },
  });
  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/runs/${runId}`);
}

export async function reopenRun(projectKey: string, runId: string) {
  await prisma.testRun.update({
    where: { id: runId },
    data: { status: "InProgress", completedAt: null },
  });
  revalidatePath(`/p/${projectKey}`, "layout");
  redirect(`/p/${projectKey}/runs/${runId}/execute`);
}
