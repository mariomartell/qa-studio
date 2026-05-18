import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { RunForm } from "./_components/run-form";
import { createRun } from "../_actions";

export default async function NewRunPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const [folders, unfiledCases] = await Promise.all([
    prisma.folder.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      include: {
        testCases: {
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, priority: true, status: true },
        },
      },
    }),
    prisma.testCase.findMany({
      where: { projectId: project.id, folderId: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, priority: true, status: true },
    }),
  ]);

  const groups = [
    ...(unfiledCases.length > 0
      ? [{ id: null as null, name: "Unfiled", cases: unfiledCases }]
      : []),
    ...folders.map((f) => ({ id: f.id, name: f.name, cases: f.testCases })),
  ];

  async function action(formData: FormData) {
    "use server";
    await createRun(projectKey, formData);
  }

  return (
    <>
      <PageHeader
        title="New test run"
        description="Pick cases to include. Ready cases are pre-selected."
      />
      <RunForm projectKey={projectKey} groups={groups} onSubmit={action} />
    </>
  );
}
