"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createFolder(projectKey: string, name: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  const last = await prisma.folder.findFirst({
    where: { projectId: project.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.folder.create({
    data: {
      projectId: project.id,
      name: name.trim(),
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath(`/p/${projectKey}/repository`);
}

export async function reorderFolders(
  projectKey: string,
  orderedIds: string[],
) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.folder.updateMany({
        where: { id, projectId: project.id },
        data: { order: index },
      }),
    ),
  );
  revalidatePath(`/p/${projectKey}/repository`);
}

export async function deleteFolder(projectKey: string, folderId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: projectKey },
  });
  await prisma.folder.deleteMany({
    where: { id: folderId, projectId: project.id },
  });
  revalidatePath(`/p/${projectKey}/repository`);
}
