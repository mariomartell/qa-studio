"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CaseItem {
  id: string;
  title: string;
  priority: string;
  status: string;
}

interface CaseGroup {
  id: string | null;
  name: string;
  cases: CaseItem[];
}

interface RunFormProps {
  projectKey: string;
  groups: CaseGroup[];
  onSubmit: (formData: FormData) => Promise<void>;
}

const priorityTone = {
  Low: "neutral",
  Medium: "info",
  High: "warn",
  Critical: "danger",
} as const;

export function RunForm({ projectKey, groups, onSubmit }: RunFormProps) {
  const allReadyCaseIds = groups.flatMap((g) =>
    g.cases.filter((c) => c.status === "Ready").map((c) => c.id),
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(allReadyCaseIds),
  );
  const [pending, startTransition] = useTransition();

  const totalCases = groups.reduce((n, g) => n + g.cases.length, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: CaseGroup, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of group.cases) {
        if (on) next.add(c.id);
        else next.delete(c.id);
      }
      return next;
    });
  }

  function groupState(group: CaseGroup): "all" | "some" | "none" {
    const ids = group.cases.map((c) => c.id);
    const picked = ids.filter((id) => selected.has(id)).length;
    if (picked === 0) return "none";
    if (picked === ids.length) return "all";
    return "some";
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("caseId");
    for (const id of selected) fd.append("caseId", id);
    startTransition(() => onSubmit(fd));
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1 h-fit">
        <div className="p-4">
          <Field label="Run name" htmlFor="name">
            <Input
              id="name"
              name="name"
              required
              autoFocus
              placeholder="e.g. RC1 — Regression"
            />
          </Field>
          <Field label="Tester" hint="(optional)" htmlFor="assignedTester">
            <Input
              id="assignedTester"
              name="assignedTester"
              placeholder="Your name"
            />
          </Field>
          <Field label="Description" hint="(optional)" htmlFor="description">
            <Textarea id="description" name="description" rows={3} />
          </Field>
          <div className="mt-4 pt-3 border-t text-sm">
            <div className="font-medium mb-1">Selection</div>
            <div className="text-[var(--color-fg-muted)]">
              {selected.size} of {totalCases} cases selected
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <a href={`/p/${projectKey}/runs`}>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </a>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || selected.size === 0}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Start run
            </Button>
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-3">
        {groups.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-[var(--color-fg-muted)]">
                No test cases yet. Add cases to the repository before starting a
                run.
              </p>
            </CardBody>
          </Card>
        ) : (
          groups.map((group) => {
            const state = groupState(group);
            return (
              <Card key={group.id ?? "__unfiled__"}>
                <div className="px-4 py-2.5 border-b flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      ref={(el) => {
                        if (el) el.indeterminate = state === "some";
                      }}
                      checked={state === "all"}
                      onChange={(e) => toggleGroup(group, e.target.checked)}
                    />
                    <span className="text-sm font-semibold">{group.name}</span>
                  </label>
                  <span className="text-xs text-[var(--color-fg-muted)]">
                    {group.cases.length} case{group.cases.length === 1 ? "" : "s"}
                  </span>
                </div>
                {group.cases.length === 0 ? (
                  <CardBody>
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      No cases in this folder.
                    </p>
                  </CardBody>
                ) : (
                  <ul>
                    {group.cases.map((c) => (
                      <li key={c.id} className="border-t first:border-t-0">
                        <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[var(--color-bg-subtle)]">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggle(c.id)}
                          />
                          <span className="text-sm flex-1 truncate">
                            {c.title}
                          </span>
                          <Badge
                            tone={
                              (priorityTone[
                                c.priority as keyof typeof priorityTone
                              ] ?? "neutral") as
                                | "neutral"
                                | "info"
                                | "warn"
                                | "danger"
                            }
                            dot
                          >
                            {c.priority}
                          </Badge>
                          <Badge
                            tone={c.status === "Ready" ? "success" : "neutral"}
                          >
                            {c.status}
                          </Badge>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })
        )}
      </div>
    </form>
  );
}
