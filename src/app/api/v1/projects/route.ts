import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../_lib/auth";

export async function GET(req: NextRequest) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { testCases: true, folders: true } } },
  });

  return Response.json(projects);
}
