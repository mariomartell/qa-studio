import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Compass, Plus } from "lucide-react";
import { format } from "date-fns";

export default async function ExploratoryPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const sessions = await prisma.exploratorySession.findMany({
    where: { projectId: project.id },
    orderBy: { startedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Exploratory Sessions"
        description="Charter-driven, less structured testing."
        actions={
          <Button size="sm" variant="primary" disabled>
            <Plus size={14} /> New session
          </Button>
        }
      />

      {sessions.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Compass size={32} />}
              title="No sessions yet"
              description="Start a charter-driven session to capture exploratory findings."
              action={
                <Button variant="primary" disabled>
                  <Plus size={14} /> New session
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                {s.charter ? (
                  <p className="text-sm text-[var(--color-fg-muted)] line-clamp-2 mb-2">
                    {s.charter}
                  </p>
                ) : null}
                <div className="flex gap-3 text-xs text-[var(--color-fg-muted)]">
                  {s.productModule ? <span>{s.productModule}</span> : null}
                  {s.timeboxMinutes ? (
                    <span>{s.timeboxMinutes}m timebox</span>
                  ) : null}
                  <span>{format(s.startedAt, "MMM d")}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-[var(--color-fg-muted)] mt-6">
        Full session workflow lands in Phase 3.
      </p>
    </>
  );
}
