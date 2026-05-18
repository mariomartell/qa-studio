import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Bug } from "lucide-react";
import { deleteCase } from "../_actions";

const priorityTone = {
  Low: "neutral",
  Medium: "info",
  High: "warn",
  Critical: "danger",
} as const;

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ projectKey: string; caseId: string }>;
}) {
  const { projectKey, caseId } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const testCase = await prisma.testCase.findFirst({
    where: { id: caseId, projectId: project.id },
    include: {
      folder: { select: { name: true } },
      steps: { orderBy: { order: "asc" } },
      _count: { select: { testRunCases: true, defectLinks: true } },
    },
  });
  if (!testCase) notFound();

  async function handleDelete() {
    "use server";
    await deleteCase(projectKey, caseId);
  }

  return (
    <>
      <PageHeader
        title={testCase.title}
        description={testCase.folder?.name ?? "Unfiled"}
        actions={
          <>
            <form action={handleDelete}>
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="text-[var(--color-danger)]"
              >
                <Trash2 size={14} /> Delete
              </Button>
            </form>
            <Link href={`/p/${projectKey}/defects/new?fromCase=${caseId}`}>
              <Button size="sm" variant="secondary">
                <Bug size={14} /> File defect
              </Button>
            </Link>
            <Link href={`/p/${projectKey}/cases/${caseId}/edit`}>
              <Button size="sm" variant="primary">
                <Pencil size={14} /> Edit
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Description
              </h3>
              {testCase.description ? (
                <p className="text-sm whitespace-pre-wrap">
                  {testCase.description}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-fg-muted)] italic">
                  No description yet.
                </p>
              )}
            </CardBody>
          </Card>

          {testCase.expectedResult ? (
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Expected
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {testCase.expectedResult}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {testCase.preconditions ? (
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Preconditions{" "}
                  <span className="text-[var(--color-fg-subtle)] font-normal normal-case tracking-normal">
                    (legacy)
                  </span>
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {testCase.preconditions}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {testCase.steps.length > 0 ? (
            <Card>
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">
                  Steps{" "}
                  <span className="text-xs font-normal text-[var(--color-fg-subtle)]">
                    (legacy — {testCase.steps.length})
                  </span>
                </h3>
              </div>
              <ol className="divide-y">
                {testCase.steps.map((step) => (
                  <li key={step.id} className="px-4 py-3 flex gap-3">
                    <span className="font-mono text-xs text-[var(--color-fg-subtle)] pt-0.5 w-6 shrink-0">
                      {step.order}
                    </span>
                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-0.5">
                          Action
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {step.action}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-0.5">
                          Expected
                        </div>
                        <div className="text-sm text-[var(--color-fg-muted)] whitespace-pre-wrap">
                          {step.expectedResult ?? "—"}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardBody className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Status
              </div>
              <Badge
                tone={testCase.status === "Ready" ? "success" : "neutral"}
                dot
              >
                {testCase.status}
              </Badge>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Priority
              </div>
              <Badge
                tone={
                  (priorityTone[
                    testCase.priority as keyof typeof priorityTone
                  ] ?? "neutral") as "neutral" | "info" | "warn" | "danger"
                }
                dot
              >
                {testCase.priority}
              </Badge>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Type
              </div>
              <Badge tone="neutral">{testCase.type}</Badge>
            </div>
            {testCase.folder && (
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Folder
                </div>
                <span className="text-sm">{testCase.folder.name}</span>
              </div>
            )}
            {testCase.tags ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {testCase.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <Badge key={t} tone="accent">
                        {t}
                      </Badge>
                    ))}
                </div>
              </div>
            ) : null}
            <div className="pt-2 border-t text-xs text-[var(--color-fg-muted)]">
              Used in {testCase._count.testRunCases} run
              {testCase._count.testRunCases === 1 ? "" : "s"} ·{" "}
              {testCase._count.defectLinks} defect link
              {testCase._count.defectLinks === 1 ? "" : "s"}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
