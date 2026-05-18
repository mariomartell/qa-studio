import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { createProject } from "@/app/_actions/projects";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
          >
            ← All projects
          </Link>
        </div>
        <h1 className="text-xl font-semibold mb-1">New project</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mb-4">
          A project holds your suites, cases, runs, sessions, and defects.
        </p>

        <Card>
          <form action={createProject} className="p-4">
            <Field label="Name" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                autoFocus
                placeholder="e.g. Toolbox Apps QA"
              />
            </Field>
            <Field
              label="Key"
              hint="2-10 uppercase letters/numbers — used as a short prefix"
              htmlFor="key"
            >
              <Input
                id="key"
                name="key"
                required
                placeholder="e.g. TBX"
                pattern="[A-Za-z0-9]{2,10}"
                style={{ textTransform: "uppercase" }}
              />
            </Field>
            <Field label="Description" hint="(optional)" htmlFor="description">
              <Textarea id="description" name="description" rows={3} />
            </Field>
            <div className="flex gap-2 justify-end mt-2">
              <Link href="/">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Create project
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
