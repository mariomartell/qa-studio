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
import { RunResultsClient } from "./_components/run-results-client";


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
          testCase: {
            select: {
              id: true,
              title: true,
              description: true,
              expectedResult: true,
              priority: true,
              tags: true,
              folder: { select: { name: true } },
            },
          },
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

      <RunResultsClient
        projectKey={projectKey}
        runId={runId}
        cases={run.cases.map((rc) => ({
          id: rc.id,
          order: rc.order,
          status: rc.status,
          actualResult: rc.actualResult,
          executedAt: rc.executedAt?.toISOString() ?? null,
          testCase: {
            id: rc.testCase.id,
            title: rc.testCase.title,
            description: rc.testCase.description,
            expectedResult: rc.testCase.expectedResult,
            priority: rc.testCase.priority,
            tags: rc.testCase.tags,
            folderName: rc.testCase.folder?.name ?? null,
          },
        }))}
      />
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
