"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PRIORITIES, CASE_TYPES, CASE_STATUSES } from "@/lib/constants";

interface Folder {
  id: string;
  name: string;
}

interface CaseFormProps {
  mode: "create" | "edit";
  projectKey: string;
  folders: Folder[];
  initial?: {
    id: string;
    title: string;
    description: string | null;
    expectedResult: string | null;
    priority: string;
    type: string;
    status: string;
    tags: string | null;
    folderId: string | null;
  };
  defaultFolderId?: string;
  onSubmit: (formData: FormData) => Promise<void>;
}

const DESCRIPTION_PLACEHOLDER = `Write the test instructions here. For step-by-step cases:

1. Open Project > New
2. Fill in name and customer
3. Save the project
4. Open the Cost Codes tab

You can use plain text or numbered lines — whatever's easiest to read during execution.`;

export function CaseForm({
  mode,
  projectKey,
  folders,
  initial,
  defaultFolderId,
  onSubmit,
}: CaseFormProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => onSubmit(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <div className="p-4">
            <Field label="Name" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                defaultValue={initial?.title ?? ""}
                placeholder="Case name"
                autoFocus
              />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                defaultValue={initial?.description ?? ""}
                rows={12}
                placeholder={DESCRIPTION_PLACEHOLDER}
              />
            </Field>
            <Field label="Expected result" htmlFor="expectedResult">
              <Textarea
                id="expectedResult"
                name="expectedResult"
                defaultValue={initial?.expectedResult ?? ""}
                rows={4}
                placeholder="What should happen if the test passes?"
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="p-4">
            <Field label="Folder" hint="(optional)" htmlFor="folderId">
              <Select
                id="folderId"
                name="folderId"
                defaultValue={initial?.folderId ?? defaultFolderId ?? ""}
              >
                <option value="">— None (unfiled) —</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
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
            <Field label="Type" htmlFor="type">
              <Select
                id="type"
                name="type"
                defaultValue={initial?.type ?? "Functional"}
              >
                {CASE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select
                id="status"
                name="status"
                defaultValue={initial?.status ?? "Draft"}
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tags" hint="comma-separated" htmlFor="tags">
              <Input
                id="tags"
                name="tags"
                defaultValue={initial?.tags ?? ""}
                placeholder="regression, smoke"
              />
            </Field>
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <a
            href={
              initial
                ? `/p/${projectKey}/cases/${initial.id}`
                : `/p/${projectKey}/repository`
            }
            className="inline-flex"
          >
            <Button type="button" variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </a>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === "create" ? "Add case" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
