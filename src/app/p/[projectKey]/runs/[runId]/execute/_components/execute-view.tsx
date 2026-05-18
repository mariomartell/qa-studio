"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Octagon,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea, Label } from "@/components/ui/input";

interface Step {
  id: string;
  order: number;
  action: string;
  expectedResult: string | null;
}

interface RunCase {
  id: string;
  status: string;
  actualResult: string | null;
  testCase: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    expectedResult: string | null;
    priority: string;
    type: string;
    folderName: string | null;
    steps: Step[];
  };
}

interface ExecuteViewProps {
  projectKey: string;
  runId: string;
  runName: string;
  cases: RunCase[];
  initialIndex: number;
  setResultAction: (
    runCaseId: string,
    status: string,
    actualResult: string,
  ) => Promise<void>;
}

const statusTone = {
  Passed: "success",
  Failed: "danger",
  Blocked: "warn",
  Skipped: "neutral",
  Untested: "neutral",
} as const;

const priorityTone = {
  Low: "neutral",
  Medium: "info",
  High: "warn",
  Critical: "danger",
} as const;

const STATUS_FILTERS = ["All", "Untested", "Passed", "Failed", "Blocked", "Skipped"] as const;

export function ExecuteView({
  projectKey,
  runId,
  runName,
  cases,
  initialIndex,
  setResultAction,
}: ExecuteViewProps) {
  const router = useRouter();
  const [index, setIndex] = useState(initialIndex);
  const current = cases[index];
  const [notes, setNotes] = useState(current?.actualResult ?? "");
  const [pending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [folderFilter, setFolderFilter] = useState<string>("All");

  // Unique folders from cases
  const folders = useMemo(() => {
    const names = cases
      .map((c) => c.testCase.folderName)
      .filter((n): n is string => n !== null);
    return [...new Set(names)].sort();
  }, [cases]);

  const priorities = useMemo(() => {
    const ps = cases.map((c) => c.testCase.priority);
    return [...new Set(ps)];
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (priorityFilter !== "All" && c.testCase.priority !== priorityFilter) return false;
      if (folderFilter !== "All" && c.testCase.folderName !== folderFilter) return false;
      return true;
    });
  }, [cases, statusFilter, priorityFilter, folderFilter]);

  const hasFilters = statusFilter !== "All" || priorityFilter !== "All" || folderFilter !== "All";

  function clearFilters() {
    setStatusFilter("All");
    setPriorityFilter("All");
    setFolderFilter("All");
  }

  function goTo(i: number) {
    if (i < 0 || i >= cases.length) return;
    setIndex(i);
    setNotes(cases[i].actualResult ?? "");
  }

  function goToCase(caseIndex: number) {
    goTo(caseIndex);
  }

  function record(status: string) {
    if (!current) return;
    startTransition(async () => {
      await setResultAction(current.id, status, notes);
      router.refresh();
      const nextIndex = findNext(cases, index, status);
      if (nextIndex !== null) goTo(nextIndex);
    });
  }

  if (!current) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[var(--color-fg-muted)]">
            This run has no cases.
          </p>
        </CardBody>
      </Card>
    );
  }

  const counts = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const executed = cases.length - (counts["Untested"] ?? 0);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Left: case detail */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="px-4 py-2.5 border-b flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={`/p/${projectKey}/runs/${runId}`}
                className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
              >
                ← {runName}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-fg-muted)] tabular-nums">
                {index + 1} / {cases.length}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => goTo(index + 1)}
                disabled={index === cases.length - 1}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
          <CardBody>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-base font-semibold flex-1">
                {current.testCase.title}
              </h2>
              <div className="flex gap-1.5 shrink-0">
                <Badge
                  tone={
                    (priorityTone[
                      current.testCase.priority as keyof typeof priorityTone
                    ] ?? "neutral") as "neutral" | "info" | "warn" | "danger"
                  }
                  dot
                >
                  {current.testCase.priority}
                </Badge>
                <Badge tone="neutral">{current.testCase.type}</Badge>
              </div>
            </div>
            {current.testCase.folderName && (
              <div className="text-xs text-[var(--color-fg-muted)] mb-3">
                {current.testCase.folderName}
              </div>
            )}

            {current.testCase.description ? (
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Description
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {current.testCase.description}
                </p>
              </div>
            ) : null}

            {current.testCase.preconditions ? (
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Preconditions{" "}
                  <span className="text-[var(--color-fg-subtle)] normal-case tracking-normal">
                    (legacy)
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {current.testCase.preconditions}
                </p>
              </div>
            ) : null}

            {current.testCase.steps.length > 0 && (
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Steps{" "}
                  <span className="text-[var(--color-fg-subtle)] normal-case tracking-normal">
                    (legacy)
                  </span>
                </div>
                <ol className="border rounded-md divide-y">
                  {current.testCase.steps.map((step) => (
                    <li key={step.id} className="px-3 py-2 grid sm:grid-cols-2 gap-3">
                      <div>
                        <span className="font-mono text-xs text-[var(--color-fg-subtle)] mr-2">
                          {step.order}.
                        </span>
                        <span className="text-sm whitespace-pre-wrap">
                          {step.action}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-fg-muted)] whitespace-pre-wrap">
                        {step.expectedResult ?? ""}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {current.testCase.expectedResult ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                  Expected
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {current.testCase.expectedResult}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* Right: result controls + filtered case list */}
      <div className="space-y-4">
        {/* Record result */}
        <Card>
          <CardBody>
            <div className="mb-3">
              <Label htmlFor="actualResult">Actual result / notes</Label>
              <Textarea
                id="actualResult"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What actually happened? Paste any error messages here."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => record("Passed")}
                disabled={pending}
                className="bg-[var(--color-success)] text-white hover:opacity-90"
              >
                <CheckCircle2 size={14} /> Pass
              </Button>
              <Button
                type="button"
                onClick={() => record("Failed")}
                disabled={pending}
                variant="danger"
              >
                <XCircle size={14} /> Fail
              </Button>
              <Button
                type="button"
                onClick={() => record("Blocked")}
                disabled={pending}
                className="bg-[var(--color-warn)] text-white hover:opacity-90"
              >
                <Octagon size={14} /> Block
              </Button>
              <Button
                type="button"
                onClick={() => record("Skipped")}
                disabled={pending}
                variant="secondary"
              >
                <SkipForward size={14} /> Skip
              </Button>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
              <span>
                Current:{" "}
                <Badge
                  tone={statusTone[current.status as keyof typeof statusTone]}
                  dot
                >
                  {current.status}
                </Badge>
              </span>
              {pending ? (
                <Loader2 size={12} className="animate-spin inline" />
              ) : null}
            </div>
            {current.status === "Failed" && (
              <div className="mt-3">
                <Link
                  href={`/p/${projectKey}/defects/new?fromRunCase=${current.id}`}
                  className="block w-full text-center text-xs px-2 py-1.5 rounded-md border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                >
                  File defect from this failure
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Progress + filter */}
        <Card>
          <div className="px-4 py-2.5 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                Progress {executed}/{cases.length}
              </h3>
              <span className="text-xs text-[var(--color-fg-muted)]">
                {filteredCases.length !== cases.length
                  ? `${filteredCases.length} shown`
                  : ""}
              </span>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1 mb-2">
              {STATUS_FILTERS.map((s) => {
                const count = s === "All" ? cases.length : (counts[s] ?? 0);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={[
                      "px-1.5 py-0.5 text-xs rounded border transition-colors",
                      statusFilter === s
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                        : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                    ].join(" ")}
                  >
                    {s} {count > 0 && s !== "All" ? `(${count})` : ""}
                  </button>
                );
              })}
            </div>

            {/* Priority + Folder selects */}
            <div className="flex gap-1.5">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 text-xs px-1.5 py-1 border rounded-md bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                <option value="All">All priorities</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {folders.length > 0 && (
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="flex-1 text-xs px-1.5 py-1 border rounded-md bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  <option value="All">All folders</option>
                  {folders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] border rounded-md"
                  title="Clear filters"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Case list */}
          <ul className="max-h-96 overflow-y-auto">
            {filteredCases.length === 0 ? (
              <li className="px-3 py-4 text-xs text-center text-[var(--color-fg-muted)]">
                No cases match the current filter.
              </li>
            ) : (
              filteredCases.map((rc) => {
                const realIndex = cases.findIndex((c) => c.id === rc.id);
                return (
                  <li
                    key={rc.id}
                    className={`border-t first:border-t-0 ${
                      realIndex === index ? "bg-[var(--color-accent-bg-subtle)]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => goToCase(realIndex)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-bg-subtle)] flex items-center gap-2"
                    >
                      <span className="font-mono text-[var(--color-fg-subtle)] w-6 shrink-0">
                        {realIndex + 1}
                      </span>
                      <span className="flex-1 truncate">{rc.testCase.title}</span>
                      <Badge
                        tone={statusTone[rc.status as keyof typeof statusTone]}
                        dot
                      >
                        {rc.status[0]}
                      </Badge>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function findNext(cases: RunCase[], from: number, justRecorded: string): number | null {
  const view = cases.map((c, i) =>
    i === from ? { ...c, status: justRecorded } : c,
  );
  for (let i = from + 1; i < view.length; i++) {
    if (view[i].status === "Untested") return i;
  }
  for (let i = 0; i < from; i++) {
    if (view[i].status === "Untested") return i;
  }
  return null;
}
