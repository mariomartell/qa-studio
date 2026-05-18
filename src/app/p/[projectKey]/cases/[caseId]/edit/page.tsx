import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { CaseForm } from "../../_components/case-form";
import { updateCase } from "../../_actions";

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ projectKey: string; caseId: string }>;
}) {
  const { projectKey, caseId } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const [testCase, folders] = await Promise.all([
    prisma.testCase.findFirst({
      where: { id: caseId, projectId: project.id },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    prisma.folder.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!testCase) notFound();

  // Legacy migration: if case has no description but has step rows, surface them as description.
  let initialDescription = testCase.description;
  const legacyStepsAsText = testCase.steps
    .map((s) =>
      s.expectedResult
        ? `${s.order}. ${s.action}\n   → expected: ${s.expectedResult}`
        : `${s.order}. ${s.action}`,
    )
    .join("\n");
  if (!initialDescription && legacyStepsAsText) {
    initialDescription = legacyStepsAsText;
  }
  if (testCase.preconditions) {
    initialDescription = `Preconditions: ${testCase.preconditions}\n\n${initialDescription ?? ""}`;
  }

  async function action(formData: FormData) {
    "use server";
    await updateCase(projectKey, caseId, formData);
  }

  return (
    <>
      <PageHeader title={`Edit · ${testCase.title}`} />
      <CaseForm
        mode="edit"
        projectKey={projectKey}
        folders={folders}
        initial={{
          id: testCase.id,
          title: testCase.title,
          description: initialDescription,
          expectedResult: testCase.expectedResult,
          priority: testCase.priority,
          type: testCase.type,
          status: testCase.status,
          tags: testCase.tags,
          folderId: testCase.folderId,
        }}
        onSubmit={action}
      />
    </>
  );
}
