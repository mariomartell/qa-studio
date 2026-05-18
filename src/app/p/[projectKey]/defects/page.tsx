import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Bug, Plus } from "lucide-react";

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

export default async function DefectsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const defects = await prisma.defect.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { links: true } } },
  });

  return (
    <>
      <PageHeader
        title="Defects"
        description={`${defects.length} defect${defects.length === 1 ? "" : "s"} in this project`}
        actions={
          <Link href={`/p/${projectKey}/defects/new`}>
            <Button size="sm" variant="primary">
              <Plus size={14} /> New defect
            </Button>
          </Link>
        }
      />

      {defects.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Bug size={32} />}
              title="No defects logged"
              description="File a defect manually, or open one straight from a failed run result."
              action={
                <Link href={`/p/${projectKey}/defects/new`}>
                  <Button variant="primary">
                    <Plus size={14} /> New defect
                  </Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-subtle)] text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
              <tr>
                <th className="text-left font-medium px-4 py-2">Title</th>
                <th className="text-left font-medium px-4 py-2">Severity</th>
                <th className="text-left font-medium px-4 py-2">Priority</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-right font-medium px-4 py-2">Links</th>
              </tr>
            </thead>
            <tbody>
              {defects.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-[var(--color-bg-subtle)]"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/p/${projectKey}/defects/${d.id}`}
                      className="font-medium hover:text-[var(--color-accent)]"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        (severityTone[
                          d.severity as keyof typeof severityTone
                        ] ?? "neutral") as
                          | "neutral"
                          | "info"
                          | "warn"
                          | "danger"
                      }
                      dot
                    >
                      {d.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        (severityTone[
                          d.priority as keyof typeof severityTone
                        ] ?? "neutral") as
                          | "neutral"
                          | "info"
                          | "warn"
                          | "danger"
                      }
                    >
                      {d.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        (statusTone[d.status as keyof typeof statusTone] ??
                          "neutral") as
                          | "neutral"
                          | "info"
                          | "warn"
                          | "success"
                          | "danger"
                      }
                      dot
                    >
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--color-fg-muted)]">
                    {d._count.links}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
