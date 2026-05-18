import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  FileText,
  PlayCircle,
  Compass,
  X as XIcon,
} from "lucide-react";
import { format } from "date-fns";
import { deleteDefect, unlinkDefectTarget } from "../_actions";

const severityTone = {
  Low: "neutral",
  Medium: "info",
  High: "warn",
  Critical: "danger",
} as const;

const statusTone = {
  Open: "danger",
  InProgress: "warn",
  ReadyForQA: "info",
  PassedQA: "success",
  FailedQA: "danger",
  Closed: "neutral",
} as const;

export default async function DefectDetailPage({
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
    include: {
      links: {
        include: {
          testCase: { select: { id: true, title: true } },
          runCase: {
            include: {
              testCase: { select: { id: true, title: true } },
              testRun: { select: { id: true, name: true } },
            },
          },
          session: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!defect) notFound();

  async function handleDelete() {
    "use server";
    await deleteDefect(projectKey, defectId);
  }
  async function handleUnlink(formData: FormData) {
    "use server";
    await unlinkDefectTarget(projectKey, defectId, formData);
  }

  return (
    <>
      <PageHeader
        title={defect.title}
        description={`Filed ${format(defect.createdAt, "MMM d, yyyy")}`}
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
            <Link href={`/p/${projectKey}/defects/${defectId}/edit`}>
              <Button size="sm" variant="primary">
                <Pencil size={14} /> Edit
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {defect.description ? (
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Description
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {defect.description}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {defect.stepsToReproduce ? (
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Steps to reproduce
                </h3>
                <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed">
                  {defect.stepsToReproduce}
                </pre>
              </CardBody>
            </Card>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Expected
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {defect.expectedResult ?? "—"}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Actual
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {defect.actualResult ?? "—"}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">
                Linked items ({defect.links.length})
              </h3>
            </div>
            {defect.links.length === 0 ? (
              <CardBody>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  Not linked to a test case, run result, or session.
                </p>
              </CardBody>
            ) : (
              <ul>
                {defect.links.map((link) => {
                  let href = "";
                  let icon: React.ReactNode = null;
                  let label: React.ReactNode = "Unknown";
                  if (link.runCase) {
                    href = `/p/${projectKey}/runs/${link.runCase.testRun.id}`;
                    icon = <PlayCircle size={14} className="text-[var(--color-fg-muted)]" />;
                    label = (
                      <>
                        <span className="text-[var(--color-fg-muted)]">
                          {link.runCase.testRun.name}
                        </span>
                        {" — "}
                        {link.runCase.testCase.title}
                      </>
                    );
                  } else if (link.testCase) {
                    href = `/p/${projectKey}/cases/${link.testCase.id}`;
                    icon = <FileText size={14} className="text-[var(--color-fg-muted)]" />;
                    label = link.testCase.title;
                  } else if (link.session) {
                    href = `/p/${projectKey}/exploratory`;
                    icon = <Compass size={14} className="text-[var(--color-fg-muted)]" />;
                    label = link.session.title;
                  }
                  return (
                    <li
                      key={link.id}
                      className="border-t first:border-t-0 flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-subtle)]"
                    >
                      <Link
                        href={href}
                        className="flex items-center gap-2 text-sm flex-1 truncate hover:text-[var(--color-accent)]"
                      >
                        {icon}
                        {label}
                      </Link>
                      <form action={handleUnlink}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <button
                          type="submit"
                          title="Unlink"
                          className="p-1 rounded hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                        >
                          <XIcon size={12} />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardBody className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Status
              </div>
              <Badge
                tone={
                  (statusTone[defect.status as keyof typeof statusTone] ??
                    "neutral") as
                    | "neutral"
                    | "info"
                    | "warn"
                    | "success"
                    | "danger"
                }
                dot
              >
                {defect.status}
              </Badge>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Severity
              </div>
              <Badge
                tone={
                  (severityTone[
                    defect.severity as keyof typeof severityTone
                  ] ?? "neutral") as "neutral" | "info" | "warn" | "danger"
                }
                dot
              >
                {defect.severity}
              </Badge>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                Priority
              </div>
              <Badge
                tone={
                  (severityTone[
                    defect.priority as keyof typeof severityTone
                  ] ?? "neutral") as "neutral" | "info" | "warn" | "danger"
                }
                dot
              >
                {defect.priority}
              </Badge>
            </div>
            <div className="pt-2 border-t text-xs text-[var(--color-fg-muted)]">
              Last updated {format(defect.updatedAt, "MMM d, yyyy")}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
