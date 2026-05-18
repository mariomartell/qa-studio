import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, PlayCircle, FileText, Compass } from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const [folderCount, caseCount, inProgress, openDefects, runs] =
    await Promise.all([
      prisma.folder.count({ where: { projectId: project.id } }),
      prisma.testCase.count({ where: { projectId: project.id } }),
      prisma.testRun.count({
        where: { projectId: project.id, status: "InProgress" },
      }),
      prisma.defect.count({
        where: { projectId: project.id, status: { notIn: ["Closed"] } },
      }),
      prisma.testRun.findMany({
        where: { projectId: project.id },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: {
          cases: { select: { status: true } },
          _count: { select: { cases: true } },
        },
      }),
    ]);

  const tiles = [
    { label: "Folders", value: folderCount },
    { label: "Test Cases", value: caseCount },
    { label: "Active Runs", value: inProgress },
    { label: "Open Defects", value: openDefects },
  ];

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <>
            <Link href={`/p/${projectKey}/repository/new`}>
              <Button size="sm" variant="secondary">
                <FileText size={14} /> New case
              </Button>
            </Link>
            <Button size="sm" variant="secondary" disabled title="Phase 3">
              <Compass size={14} /> New session
            </Button>
            <Link href={`/p/${projectKey}/runs/new`}>
              <Button size="sm" variant="primary">
                <Plus size={14} /> New run
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardBody>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                {t.label}
              </div>
              <div className="text-2xl font-semibold">{t.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent test runs</h2>
              <Link
                href={`/p/${projectKey}/runs`}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                View all →
              </Link>
            </div>
            {runs.length === 0 ? (
              <CardBody>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  No runs yet.
                </p>
              </CardBody>
            ) : (
              <ul>
                {runs.map((r) => {
                  const total = r._count.cases || 1;
                  const counts = r.cases.reduce<Record<string, number>>(
                    (acc, c) => {
                      acc[c.status] = (acc[c.status] ?? 0) + 1;
                      return acc;
                    },
                    {},
                  );
                  const passed = counts["Passed"] ?? 0;
                  const failed = counts["Failed"] ?? 0;
                  const blocked = counts["Blocked"] ?? 0;
                  const skipped = counts["Skipped"] ?? 0;
                  const untested = counts["Untested"] ?? 0;

                  return (
                    <li
                      key={r.id}
                      className="border-b last:border-b-0 hover:bg-[var(--color-bg-subtle)]"
                    >
                      <Link
                        href={`/p/${projectKey}/runs/${r.id}`}
                        className="px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <PlayCircle
                              size={14}
                              className="text-[var(--color-fg-muted)] shrink-0"
                            />
                            <span className="text-sm font-medium truncate">
                              {r.name}
                            </span>
                            <Badge
                              tone={r.status === "Completed" ? "success" : "info"}
                              dot
                            >
                              {r.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                            {r.assignedTester ?? "Unassigned"} · {total} cases
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {passed > 0 && <Badge tone="success">{passed}P</Badge>}
                          {failed > 0 && <Badge tone="danger">{failed}F</Badge>}
                          {blocked > 0 && <Badge tone="warn">{blocked}B</Badge>}
                          {skipped > 0 && <Badge tone="neutral">{skipped}S</Badge>}
                          {untested > 0 && <Badge tone="neutral">{untested}·</Badge>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">Release readiness</h2>
          </div>
          <CardBody>
            <p className="text-sm text-[var(--color-fg-muted)]">
              Coming in Phase 3 — milestone pass rate, blocking defects,
              outstanding cases.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
