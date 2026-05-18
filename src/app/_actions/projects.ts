"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function s(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(formData: FormData, key: string) {
  const v = s(formData, key);
  return v.length > 0 ? v : null;
}

export async function createProject(formData: FormData) {
  const name = s(formData, "name");
  const key = s(formData, "key").toUpperCase();
  if (!name || !key) throw new Error("name and key are required");
  if (!/^[A-Z0-9]{2,10}$/.test(key)) {
    throw new Error("key must be 2-10 uppercase letters/numbers");
  }

  const existing = await prisma.project.findUnique({ where: { key } });
  if (existing) throw new Error(`a project with key "${key}" already exists`);

  const project = await prisma.project.create({
    data: { name, key, description: opt(formData, "description") },
  });

  revalidatePath("/", "layout");
  redirect(`/p/${project.key}`);
}

export async function updateProject(
  projectKey: string,
  formData: FormData,
) {
  const project = await prisma.project.findUnique({
    where: { key: projectKey },
  });
  if (!project) throw new Error("project not found");

  await prisma.project.update({
    where: { id: project.id },
    data: {
      name: s(formData, "name") || project.name,
      description: opt(formData, "description"),
    },
  });

  revalidatePath("/", "layout");
  redirect(`/p/${projectKey}`);
}
