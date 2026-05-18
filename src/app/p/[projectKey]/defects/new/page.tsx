import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { DefectForm } from "../_components/defect-form";
import { createDefect } from "../_actions";
import { Card, CardBody } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<{
    fromRunCase?: string;
    fromCase?: string;
    fromSession?: string;
  }>;
}

export default async function NewDefectPage({
  params,
  searchParams,
}: PageProps) {
  const { projectKey } = await params;
  const { fromRunCase, fromCase, fromSession } = await searchParams;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  let prefill: {
    title?: string;
    description?: string;
    stepsToReproduce?: string;
    expectedResult?: string;
    actualResult?: string;
    severity?: string;
    priority?: string;
  } = {};
  let sourceLabel: string | null = null;

  if (fromRunCase) {
    const rc = await prisma.testRunCase.findFirst({
      where: {
        id: fromRunCase,
        testRun: { projectId: project.id },
      },
      include: {
        testCase: true,
        testRun: { select: { name: true } },
      },
    });
    if (rc) {
      prefill = {
        title: `${rc.testCase.title} — fails`,
        stepsToReproduce: rc.testCase.description ?? "",
        expectedResult: rc.testCase.expectedResult ?? "",
        actualResult: rc.actualResult ?? "",
        severity: rc.testCase.priority,
        priority: rc.testCase.priority,
      };
      sourceLabel = `Filing from failure in run "${rc.testRun.name}"`;
    }
  } else if (fromCase) {
    const tc = await prisma.testCase.findFirst({
      where: { id: fromCase, projectId: project.id },
    });
    if (tc) {
      prefill = {
        title: `${tc.title} — bug`,
        stepsToReproduce: tc.description ?? "",
        expectedResult: tc.expectedResult ?? "",
        severity: tc.priority,
        priority: tc.priority,
      };
      sourceLabel = `Filing against test case "${tc.title}"`;
    }
  } else if (fromSession) {
    const sess = await prisma.exploratorySession.findFirst({
      where: { id: fromSession, projectId: project.id },
    });
    if (sess) {
      prefill = {
        title: `${sess.title} — finding`,
        description: sess.notes ?? "",
      };
      sourceLabel = `Filing from session "${sess.title}"`;
    }
  }

  async function action(formData: FormData) {
    "use server";
    await createDefect(projectKey, formData);
  }

  return (
    <>
      <PageHeader
        title="New defect"
        description={
          sourceLabel ?? "File a bug. Linkable to cases, run results, or sessions."
        }
      />

      {sourceLabel ? (
        <Card className="mb-4 bg-[var(--color-accent-bg-subtle)] border-[var(--color-accent)]">
          <CardBody>
            <p className="text-xs text-[var(--color-accent)]">
              Pre-filled from the linked failure. Steps and expected result come
              from the test case definition; review and tweak before saving.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <DefectForm
        mode="create"
        projectKey={projectKey}
        initial={{
          title: prefill.title ?? "",
          description: prefill.description ?? null,
          stepsToReproduce: prefill.stepsToReproduce ?? null,
          expectedResult: prefill.expectedResult ?? null,
          actualResult: prefill.actualResult ?? null,
          severity: prefill.severity ?? "Medium",
          priority: prefill.priority ?? "Medium",
          status: "Open",
        }}
        linkRunCaseId={fromRunCase}
        linkCaseId={fromCase}
        linkSessionId={fromSession}
        onSubmit={action}
      />
    </>
  );
}
