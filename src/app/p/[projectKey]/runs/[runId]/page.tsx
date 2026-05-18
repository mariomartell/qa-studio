import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle2, RefreshCcw, Trash2, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { completeRun, reopenRun, deleteRun } from "../_actions";

const resultTone = {
  Passed: "success",
  Failed: "danger",
  Blocked: "warn",
  Skipped: "neutral",
  Untested: "neutral",
} as const;

export default async function RunOverviewPage({
  params,
}: {
  params: Promise<{ projectKey: string; runId: string }>;
}) {
  const { projectKey, runId } = await params;

  const run = await prisma.testRun.findFirst({
    where: { id: runId, project: { key: projectKey } },
    include: {
      cases: {
        orderBy: { order: "asc" },
        include: {
          testCase: { select: { id: true, title: true, priority: true } },
        },
      },
    },
  });
  if (!run) notFound();

  const total = run.cases.length;
  const counts = run.cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const executed = total - (counts["Untested"] ?? 0);
  const pct = total === 0 ? 0 : Math.round((executed / total) * 100);

  async function handleComplete() {
    "use server";
    await completeRun(projectKey, runId);
  }
  async function handleReopen() {
    "use server";
    await reopenRun(projectKey, runId);
  }
  async function handleDelete() {
    "use server";
    await deleteRun(projectKey, runId);
  }

  return (
    <>
      <PageHeader
        title={run.name}
        description={run.description ?? undefined}
        actions={
          <>
            <Link href={`/p/${projectKey}/runs/${runId}/print`} target="_blank">
              <Button size="sm" variant="ghost">
                <Printer size={14} /> Print / PDF
              </Button>
            </Link>
            <Link href={`/p/${projectKey}/runs/${runId}/export`}>
              <Button size="sm" variant="ghost">
                <Download size={14} /> CSV
              </Button>
            </Link>
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
            {run.status === "Completed" ? (
              <form action={handleReopen}>
                <Button type="submit" size="sm" variant="secondary">
                  <RefreshCcw size={14} /> Reopen
                </Button>
              </form>
            ) : (
              <>
                <form action={handleComplete}>
                  <Button type="submit" size="sm" variant="secondary">
                    <CheckCircle2 size={14} /> Mark complete
                  </Button>
                </form>
                <Link href={`/p/${projectKey}/runs/${runId}/execute`}>
                  <Button size="sm" variant="primary">
                    <PlayCircle size={14} />{" "}
                    {executed === 0 ? "Start executing" : "Continue"}
                  </Button>
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="grid lg:grid-cols-4 gap-3 mb-6">
        <SummaryTile
          label="Status"
          value={run.status}
          tone={run.status === "Completed" ? "success" : "info"}
        />
        <SummaryTile label="Progress" value={`${executed}/${total}`} sub={`${pct}%`} />
        <SummaryTile label="Tester" value={run.assignedTester ?? "—"} />
        <SummaryTile
          label="Started"
          value={format(run.startedAt, "MMM d, yyyy")}
        />
      </div>

      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Results</h2>
          <div className="flex gap-1.5">
            {(["Passed", "Failed", "Blocked", "Skipped", "Untested"] as const).map((k) =>
              counts[k] ? (
                <Badge
                  key={k}
                  tone={resultTone[k]}
                  dot
                >
                  {counts[k]} {k}
                </Badge>
              ) : null,
            )}
          </div>
        </div>
        <ul>
          {run.cases.map((rc, i) => (
            <li
              key={rc.id}
              className="border-t first:border-t-0 px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-subtle)]"
            >
              <span className="font-mono text-xs text-[var(--color-fg-subtle)] w-8 shrink-0">
                {i + 1}
              </span>
              <Link
                href={`/p/${projectKey}/cases/${rc.testCase.id}`}
                className="text-sm flex-1 truncate hover:text-[var(--color-accent)]"
              >
                {rc.testCase.title}
              </Link>
              {rc.status === "Failed" && (
                <Link
                  href={`/p/${projectKey}/defects/new?fromRunCase=${rc.id}`}
                  className="text-xs text-[var(--color-danger)] hover:underline shrink-0"
                >
                  File defect →
                </Link>
              )}
              <Badge tone={resultTone[rc.status as keyof typeof resultTone]} dot>
                {rc.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "info";
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
          {label}
        </div>
        <div className="text-lg font-semibold">
          {tone ? <Badge tone={tone} dot>{value}</Badge> : value}
        </div>
        {sub ? (
          <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">
            {sub}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
