import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const resultTone = {
  Passed: "success",
  Failed: "danger",
  Blocked: "warn",
  Skipped: "neutral",
  Untested: "neutral",
} as const;

export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectKey } = await params;
  const { tab = "active" } = await searchParams;

  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const runs = await prisma.testRun.findMany({
    where: { projectId: project.id },
    orderBy: { startedAt: "desc" },
    include: {
      cases: { select: { status: true } },
      _count: { select: { cases: true } },
    },
  });

  const activeRuns = runs.filter((r) => r.status === "InProgress");
  const closedRuns = runs.filter((r) => r.status === "Completed");
  const shown = tab === "closed" ? closedRuns : activeRuns;

  // Latest pass rate from most recent completed run
  const latestClosed = closedRuns[0];
  let latestPassPct = 0;
  if (latestClosed) {
    const total = latestClosed._count.cases || 1;
    const passed = latestClosed.cases.filter((c) => c.status === "Passed").length;
    latestPassPct = Math.round((passed / total) * 100);
  }

  return (
    <>
      <PageHeader
        title="Runs & results"
        actions={
          <Link href={`/p/${projectKey}/runs/new`}>
            <Button size="sm" variant="primary">
              <Plus size={14} /> New run
            </Button>
          </Link>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div
              className="relative w-14 h-14 shrink-0"
              style={{
                background: `conic-gradient(var(--color-accent) 0% ${activeRuns.length > 0 ? 100 : 0}%, var(--color-bg-subtle) 0%)`,
                borderRadius: "50%",
              }}
            >
              <div className="absolute inset-1.5 rounded-full bg-[var(--color-bg)] flex items-center justify-center">
                <span className="text-sm font-bold">{activeRuns.length}</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-0.5">
                Active runs
              </div>
              <div className="text-sm text-[var(--color-fg-muted)]">
                {activeRuns.length === 0
                  ? "No active runs"
                  : `${activeRuns.length} in progress`}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-4">
            <div
              className="relative w-14 h-14 shrink-0"
              style={{
                background: `conic-gradient(var(--color-success) 0% ${latestPassPct}%, var(--color-danger) ${latestPassPct}% 100%)`,
                borderRadius: "50%",
              }}
            >
              <div className="absolute inset-1.5 rounded-full bg-[var(--color-bg)] flex items-center justify-center">
                <span className="text-xs font-bold">{latestPassPct}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-0.5">
                Latest results
              </div>
              <div className="text-sm text-[var(--color-fg-muted)]">
                {latestClosed
                  ? `${latestPassPct}% successful · ${format(latestClosed.completedAt ?? latestClosed.startedAt, "MMM d")}`
                  : "No completed runs"}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-14 h-14 shrink-0 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center">
              <CheckCircle2 size={24} className="text-[var(--color-fg-muted)]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-0.5">
                Recently closed
              </div>
              <div className="text-2xl font-bold">{closedRuns.length}</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b mb-4">
        <Link
          href={`/p/${projectKey}/runs`}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab !== "closed"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
          ].join(" ")}
        >
          Active ({activeRuns.length})
        </Link>
        <Link
          href={`/p/${projectKey}/runs?tab=closed`}
          className={[
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "closed"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
          ].join(" ")}
        >
          Closed ({closedRuns.length})
        </Link>
      </div>

      {/* Run cards */}
      {shown.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <PlayCircle size={28} className="mx-auto mb-2 text-[var(--color-fg-muted)]" />
            <p className="text-sm text-[var(--color-fg-muted)] mb-3">
              {tab === "closed"
                ? "No completed runs yet."
                : "No active runs. Start a new run to begin testing."}
            </p>
            {tab !== "closed" && (
              <Link href={`/p/${projectKey}/runs/new`}>
                <Button variant="primary" size="sm">
                  <Plus size={14} /> New run
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const total = r._count.cases || 1;
            const counts = r.cases.reduce<Record<string, number>>((acc, c) => {
              acc[c.status] = (acc[c.status] ?? 0) + 1;
              return acc;
            }, {});
            const passed = counts["Passed"] ?? 0;
            const failed = counts["Failed"] ?? 0;
            const blocked = counts["Blocked"] ?? 0;
            const skipped = counts["Skipped"] ?? 0;
            const untested = counts["Untested"] ?? 0;
            const executed = total - untested;
            const pct = Math.round((executed / total) * 100);
            const passPct = Math.round((passed / total) * 100);

            return (
              <Card key={r.id} className="hover:border-[var(--color-border-strong)] transition-colors">
                <div className="px-4 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/p/${projectKey}/runs/${r.id}`}
                        className="font-semibold text-sm hover:text-[var(--color-accent)] truncate"
                      >
                        {r.name}
                      </Link>
                      <Badge
                        tone={r.status === "Completed" ? "success" : "info"}
                        dot
                      >
                        {r.status === "Completed" ? "Closed" : "Active"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-fg-muted)] mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {r.status === "Completed" && r.completedAt
                          ? `Completed ${format(r.completedAt, "MMM d")}`
                          : `Started ${format(r.startedAt, "MMM d")}`}
                      </span>
                      {r.assignedTester && (
                        <span>{r.assignedTester}</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                        <div
                          style={{ width: `${passPct}%` }}
                          className="h-full bg-[var(--color-success)] rounded-full transition-all"
                        />
                      </div>
                      <span className="text-xs tabular-nums text-[var(--color-fg-muted)] w-10 text-right">
                        {pct}%
                      </span>
                    </div>

                    {/* Result badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {passed > 0 && (
                        <Badge tone="success">{passed} Passed</Badge>
                      )}
                      {failed > 0 && (
                        <Badge tone="danger">{failed} Failed</Badge>
                      )}
                      {blocked > 0 && (
                        <Badge tone="warn">{blocked} Blocked</Badge>
                      )}
                      {skipped > 0 && (
                        <Badge tone="neutral">{skipped} Skipped</Badge>
                      )}
                      {untested > 0 && (
                        <Badge tone="neutral">{untested} Untested</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Link href={`/p/${projectKey}/runs/${r.id}`}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                    {r.status === "InProgress" && (
                      <Link href={`/p/${projectKey}/runs/${r.id}/execute`}>
                        <Button size="sm" variant="primary">
                          <PlayCircle size={13} /> Execute
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
