import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/app-shell/sidebar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;

  const [project, projects] = await Promise.all([
    prisma.project.findUnique({ where: { key: projectKey } }),
    prisma.project.findMany({
      select: { id: true, key: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        projectKey={project.key}
        projectName={project.name}
        projects={projects}
      />
      <main className="flex-1 px-8 py-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
