import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { DefectForm } from "../../_components/defect-form";
import { updateDefect } from "../../_actions";

export default async function EditDefectPage({
  params,
}: {
  params: Promise<{ projectKey: string; defectId: string }>;
}) {
  const { projectKey, defectId } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const defect = await prisma.defect.findFirst({
    where: { id: defectId, projectId: project.id },
  });
  if (!defect) notFound();

  async function action(formData: FormData) {
    "use server";
    await updateDefect(projectKey, defectId, formData);
  }

  return (
    <>
      <PageHeader title={`Edit · ${defect.title}`} />
      <DefectForm
        mode="edit"
        projectKey={projectKey}
        defectId={defectId}
        initial={{
          title: defect.title,
          description: defect.description,
          stepsToReproduce: defect.stepsToReproduce,
          expectedResult: defect.expectedResult,
          actualResult: defect.actualResult,
          severity: defect.severity,
          priority: defect.priority,
          status: defect.status,
        }}
        onSubmit={action}
      />
    </>
  );
}
