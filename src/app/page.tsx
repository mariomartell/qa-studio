import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus } from "lucide-react";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { folders: true, testRuns: true, defects: true } },
    },
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="h-9 w-9 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white text-base font-bold">
            Q
          </span>
          <div>
            <h1 className="text-xl font-semibold">QA Studio</h1>
            <p className="text-sm text-[var(--color-fg-muted)]">
              Manual test management workspace
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            Projects
          </h2>
          <Link href="/projects/new">
            <Button variant="primary" size="sm">
              <Plus size={14} />
              New project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon={<FolderKanban size={32} />}
                title="No projects yet"
                description="Create your first project to start managing test cases, runs, and defects."
                action={
                  <Link href="/projects/new">
                    <Button variant="primary">
                      <Plus size={14} /> New project
                    </Button>
                  </Link>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/p/${p.key}`} className="group block">
                <Card className="hover:border-[var(--color-border-strong)] transition-colors">
                  <CardBody>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-fg-muted)]">
                        {p.key}
                      </span>
                      <h3 className="text-sm font-semibold truncate group-hover:text-[var(--color-accent)]">
                        {p.name}
                      </h3>
                    </div>
                    {p.description ? (
                      <p className="text-sm text-[var(--color-fg-muted)] line-clamp-2 mb-3">
                        {p.description}
                      </p>
                    ) : null}
                    <div className="flex gap-4 text-xs text-[var(--color-fg-muted)]">
                      <span>{p._count.folders} folders</span>
                      <span>{p._count.testRuns} runs</span>
                      <span>{p._count.defects} defects</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
