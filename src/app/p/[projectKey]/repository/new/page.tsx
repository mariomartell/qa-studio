import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { CaseForm } from "../../cases/_components/case-form";
import { createCase } from "../../cases/_actions";

interface PageProps {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<{ folder?: string }>;
}

export default async function NewCasePage({ params, searchParams }: PageProps) {
  const { projectKey } = await params;
  const { folder: defaultFolderId } = await searchParams;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const folders = await prisma.folder.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  async function action(formData: FormData) {
    "use server";
    await createCase(projectKey, formData);
  }

  return (
    <>
      <PageHeader title="New test case" />
      <CaseForm
        mode="create"
        projectKey={projectKey}
        folders={folders}
        defaultFolderId={defaultFolderId}
        onSubmit={action}
      />
    </>
  );
}
