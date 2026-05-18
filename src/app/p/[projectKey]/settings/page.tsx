import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { updateProject, deleteProject } from "@/app/_actions/projects";
import { DeleteProjectButton } from "./_components/delete-project-button";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) notFound();

  async function update(formData: FormData) {
    "use server";
    await updateProject(projectKey, formData);
  }

  return (
    <>
      <PageHeader title="Project settings" />

      <div className="max-w-xl space-y-6">
        {/* Edit details */}
        <Card>
          <form action={update}>
            <CardBody className="space-y-4">
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" defaultValue={project.name} required />
              </Field>
              <Field label="Key" hint="Cannot be changed" htmlFor="key">
                <Input id="key" name="key" value={project.key} disabled />
              </Field>
              <Field label="Description" hint="(optional)" htmlFor="description">
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={project.description ?? ""}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  Save changes
                </Button>
              </div>
            </CardBody>
          </form>
        </Card>

        {/* Danger zone */}
        <Card className="border-[var(--color-danger)]">
          <CardBody>
            <h3 className="text-sm font-semibold text-[var(--color-danger)] mb-1">
              Danger zone
            </h3>
            <p className="text-sm text-[var(--color-fg-muted)] mb-3">
              Permanently delete <strong>{project.name}</strong> and all its
              folders, cases, runs, defects, and sessions. This cannot be undone.
            </p>
            <DeleteProjectButton
              projectKey={projectKey}
              projectName={project.name}
              deleteAction={deleteProject}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
