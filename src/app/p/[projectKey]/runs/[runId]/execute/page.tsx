import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { ExecuteView } from "./_components/execute-view";
import { setRunCaseResult } from "../../_actions";

export default async function ExecuteRunPage({
  params,
}: {
  params: Promise<{ projectKey: string; runId: string }>;
}) {
  const { projectKey, runId } = await params;

  const run = await prisma.testRun.findFirst({
    where: { id: runId, project: { key: projectKey } },
    include: {
      cases: {
        orderBy: { order: "asc" },
        include: {
          testCase: {
            include: {
              steps: { orderBy: { order: "asc" } },
              folder: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!run) notFound();

  const firstUntested = run.cases.findIndex((c) => c.status === "Untested");
  const initialIndex = firstUntested === -1 ? 0 : firstUntested;

  async function setResultAction(
    runCaseId: string,
    status: string,
    actualResult: string,
  ) {
    "use server";
    const fd = new FormData();
    fd.set("status", status);
    fd.set("actualResult", actualResult);
    await setRunCaseResult(projectKey, runCaseId, fd);
  }

  return (
    <>
      <PageHeader
        title={`Executing · ${run.name}`}
        description={run.assignedTester ? `Tester: ${run.assignedTester}` : undefined}
      />
      <ExecuteView
        projectKey={projectKey}
        runId={runId}
        runName={run.name}
        cases={run.cases.map((rc) => ({
          id: rc.id,
          status: rc.status,
          actualResult: rc.actualResult,
          testCase: {
            id: rc.testCase.id,
            title: rc.testCase.title,
            description: rc.testCase.description,
            preconditions: rc.testCase.preconditions,
            expectedResult: rc.testCase.expectedResult,
            priority: rc.testCase.priority,
            type: rc.testCase.type,
            folderName: rc.testCase.folder?.name ?? null,
            steps: rc.testCase.steps.map((s) => ({
              id: s.id,
              order: s.order,
              action: s.action,
              expectedResult: s.expectedResult,
            })),
          },
        }))}
        initialIndex={initialIndex}
        setResultAction={setResultAction}
      />
    </>
  );
}
