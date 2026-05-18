"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PRIORITIES,
  DEFECT_STATUSES,
} from "@/lib/constants";

interface DefectFormProps {
  mode: "create" | "edit";
  projectKey: string;
  defectId?: string;
  initial?: {
    title: string;
    description: string | null;
    stepsToReproduce: string | null;
    expectedResult: string | null;
    actualResult: string | null;
    severity: string;
    priority: string;
    status: string;
  };
  // Hidden link fields, set when filing from a failed result.
  linkRunCaseId?: string;
  linkCaseId?: string;
  linkSessionId?: string;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function DefectForm({
  mode,
  projectKey,
  defectId,
  initial,
  linkRunCaseId,
  linkCaseId,
  linkSessionId,
  onSubmit,
}: DefectFormProps) {
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => onSubmit(fd));
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-4">
            <Field label="Title" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                autoFocus
                defaultValue={initial?.title ?? ""}
                placeholder="Short summary of the bug"
              />
            </Field>
            <Field label="Description" hint="(optional)" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={initial?.description ?? ""}
              />
            </Field>
            <Field
              label="Steps to reproduce"
              hint="numbered, one per line"
              htmlFor="stepsToReproduce"
            >
              <Textarea
                id="stepsToReproduce"
                name="stepsToReproduce"
                rows={6}
                defaultValue={initial?.stepsToReproduce ?? ""}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Expected result" htmlFor="expectedResult">
                <Textarea
                  id="expectedResult"
                  name="expectedResult"
                  rows={3}
                  defaultValue={initial?.expectedResult ?? ""}
                />
              </Field>
              <Field label="Actual result" htmlFor="actualResult">
                <Textarea
                  id="actualResult"
                  name="actualResult"
                  rows={3}
                  defaultValue={initial?.actualResult ?? ""}
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="p-4">
            <Field label="Severity" htmlFor="severity">
              <Select
                id="severity"
                name="severity"
                defaultValue={initial?.severity ?? "Medium"}
              >
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="priority">
              <Select
                id="priority"
                name="priority"
                defaultValue={initial?.priority ?? "Medium"}
              >
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select
                id="status"
                name="status"
                defaultValue={initial?.status ?? "Open"}
              >
                {DEFECT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {linkRunCaseId ? (
          <input type="hidden" name="linkRunCaseId" value={linkRunCaseId} />
        ) : null}
        {linkCaseId ? (
          <input type="hidden" name="linkCaseId" value={linkCaseId} />
        ) : null}
        {linkSessionId ? (
          <input type="hidden" name="linkSessionId" value={linkSessionId} />
        ) : null}

        <div className="flex gap-2 justify-end">
          <a
            href={
              defectId
                ? `/p/${projectKey}/defects/${defectId}`
                : `/p/${projectKey}/defects`
            }
          >
            <Button type="button" variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </a>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === "create" ? "Create defect" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
