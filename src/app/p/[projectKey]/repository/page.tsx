import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { FolderTree } from "./_components/folder-tree";

const priorityTone = {
  Low: "neutral",
  Medium: "info",
  High: "warn",
  Critical: "danger",
} as const;

export default async function RepositoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { projectKey } = await params;
  const { folder: activeFolderId } = await searchParams;

  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });

  const [folders, cases, totalCases] = await Promise.all([
    prisma.folder.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        order: true,
        _count: { select: { testCases: true } },
      },
    }),
    prisma.testCase.findMany({
      where: {
        projectId: project.id,
        ...(activeFolderId ? { folderId: activeFolderId } : {}),
      },
      include: { folder: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.testCase.count({ where: { projectId: project.id } }),
  ]);

  const activeFolder = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)
    : null;

  return (
    <>
      <PageHeader
        title="Repository"
        description={
          activeFolder
            ? `${cases.length} case${cases.length === 1 ? "" : "s"} in ${activeFolder.name}`
            : `${totalCases} case${totalCases === 1 ? "" : "s"}`
        }
        actions={
          <Link
            href={`/p/${projectKey}/repository/new${activeFolderId ? `?folder=${activeFolderId}` : ""}`}
          >
            <Button size="sm" variant="primary">
              <Plus size={14} /> New case
            </Button>
          </Link>
        }
      />

      <div className="flex gap-5">
        <aside className="w-48 shrink-0">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-fg-muted)] px-2 mb-2">
            Folders
          </div>
          <FolderTree
            projectKey={projectKey}
            folders={folders}
            activeFolderId={activeFolderId ?? null}
            totalCases={totalCases}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {cases.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-[var(--color-fg-muted)] mb-3">
                {activeFolder
                  ? `No cases in "${activeFolder.name}" yet.`
                  : "No test cases yet."}
              </p>
              <Link
                href={`/p/${projectKey}/repository/new${activeFolderId ? `?folder=${activeFolderId}` : ""}`}
              >
                <Button size="sm" variant="primary">
                  <Plus size={14} /> New case
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-bg-subtle)] text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Title</th>
                    {!activeFolderId && (
                      <th className="text-left font-medium px-4 py-2.5">Folder</th>
                    )}
                    <th className="text-left font-medium px-4 py-2.5">Type</th>
                    <th className="text-left font-medium px-4 py-2.5">Priority</th>
                    <th className="text-left font-medium px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-[var(--color-bg-subtle)]">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/p/${projectKey}/cases/${c.id}`}
                          className="font-medium hover:text-[var(--color-accent)]"
                        >
                          {c.title}
                        </Link>
                      </td>
                      {!activeFolderId && (
                        <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">
                          {c.folder?.name ?? "—"}
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <Badge tone="neutral">{c.type}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={
                            (priorityTone[
                              c.priority as keyof typeof priorityTone
                            ] ?? "neutral") as "neutral" | "info" | "warn" | "danger"
                          }
                          dot
                        >
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={c.status === "Ready" ? "success" : "neutral"}
                          dot
                        >
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
