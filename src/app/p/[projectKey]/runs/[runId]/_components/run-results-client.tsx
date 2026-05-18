"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const resultTone = {
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

export interface RunCaseSummary {
  id: string;
  order: number;
  status: string;
  actualResult: string | null;
  executedAt: string | null;
  testCase: {
    id: string;
    title: string;
    description: string | null;
    expectedResult: string | null;
    priority: string;
    tags: string | null;
    folderName: string | null;
  };
}

interface Props {
  projectKey: string;
  runId: string;
  cases: RunCaseSummary[];
}

export function RunResultsClient({ projectKey, runId, cases }: Props) {
  const [selected, setSelected] = useState<RunCaseSummary | null>(null);

  return (
    <div className="flex gap-4">
      {/* Case list */}
      <Card className="flex-1 min-w-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Results</h2>
          <StatusSummary cases={cases} />
        </div>
        <ul>
          {cases.map((rc, i) => (
            <li key={rc.id} className="border-t first:border-t-0">
              <button
                type="button"
                onClick={() => setSelected(rc.id === selected?.id ? null : rc)}
                className={[
                  "w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-subtle)] transition-colors",
                  rc.id === selected?.id ? "bg-[var(--color-accent-bg-subtle)]" : "",
                ].join(" ")}
              >
                <span className="font-mono text-xs text-[var(--color-fg-subtle)] w-8 shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm flex-1 truncate text-left">
                  {rc.testCase.title}
                </span>
                {rc.status === "Failed" && (
                  <Link
                    href={`/p/${projectKey}/defects/new?fromRunCase=${rc.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-[var(--color-danger)] hover:underline shrink-0"
                  >
                    File defect →
                  </Link>
                )}
                <Badge tone={resultTone[rc.status as keyof typeof resultTone]} dot>
                  {rc.status}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Side panel */}
      {selected && (
        <div className="w-96 shrink-0">
          <Card className="sticky top-4">
            {/* Panel header */}
            <div className="px-4 py-3 border-b flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-fg-muted)] mb-0.5">
                  {selected.testCase.folderName ?? "—"}
                </p>
                <h3 className="text-sm font-semibold leading-snug">
                  {selected.testCase.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] mt-0.5 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-3 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {/* Meta row */}
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  tone={resultTone[selected.status as keyof typeof resultTone]}
                  dot
                >
                  {selected.status}
                </Badge>
                <Badge
                  tone={
                    (priorityTone[selected.testCase.priority as keyof typeof priorityTone] ??
                      "neutral") as "neutral" | "info" | "warn" | "danger"
                  }
                >
                  {selected.testCase.priority}
                </Badge>
                {selected.testCase.tags
                  ?.split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
              </div>

              {/* Description */}
              {selected.testCase.description && (
                <div>
                  <SectionLabel>Description</SectionLabel>
                  <p className="text-sm whitespace-pre-wrap text-[var(--color-fg)]">
                    {selected.testCase.description}
                  </p>
                </div>
              )}

              {/* Expected */}
              {selected.testCase.expectedResult && (
                <div>
                  <SectionLabel>Expected</SectionLabel>
                  <p className="text-sm whitespace-pre-wrap text-[var(--color-fg)]">
                    {selected.testCase.expectedResult}
                  </p>
                </div>
              )}

              {/* Actual result / notes */}
              {selected.actualResult && (
                <div>
                  <SectionLabel>Actual result / notes</SectionLabel>
                  <p className="text-sm whitespace-pre-wrap text-[var(--color-fg)]">
                    {selected.actualResult}
                  </p>
                </div>
              )}

              {/* File defect link for failures */}
              {selected.status === "Failed" && (
                <Link
                  href={`/p/${projectKey}/defects/new?fromRunCase=${selected.id}`}
                  className="flex items-center gap-1 text-xs text-[var(--color-danger)] hover:underline"
                >
                  <ExternalLink size={11} /> File defect from this failure
                </Link>
              )}

              {/* Open full case */}
              <Link
                href={`/p/${projectKey}/cases/${selected.testCase.id}`}
                className="flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] hover:underline"
              >
                <ExternalLink size={11} /> Open case in repository
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
      {children}
    </div>
  );
}

function StatusSummary({ cases }: { cases: RunCaseSummary[] }) {
  const counts = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div className="flex gap-1.5">
      {(["Passed", "Failed", "Blocked", "Skipped", "Untested"] as const).map((k) =>
        counts[k] ? (
          <Badge key={k} tone={resultTone[k]} dot>
            {counts[k]} {k}
          </Badge>
        ) : null,
      )}
    </div>
  );
}
