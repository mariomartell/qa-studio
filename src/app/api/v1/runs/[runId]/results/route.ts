import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "../../../_lib/auth";

// POST /api/v1/runs/:runId/results
// Body: { results: [{ title?: string, id?: string, status: string, actualResult?: string }] }
// Matches by runCase id if provided, otherwise fuzzy-matches by title.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const { runId } = await params;
  const body = await req.json();
  const results: { id?: string; title?: string; status: string; actualResult?: string }[] =
    body.results ?? [];

  if (!Array.isArray(results) || results.length === 0) {
    return Response.json({ error: "results array is required" }, { status: 400 });
  }

  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      cases: { include: { testCase: { select: { id: true, title: true } } } },
    },
  });
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });

  const VALID = new Set(["Passed", "Failed", "Blocked", "Skipped", "Untested"]);
  const updated: string[] = [];
  const notFound: string[] = [];

  for (const r of results) {
    if (!VALID.has(r.status)) {
      return Response.json({ error: `Invalid status "${r.status}"` }, { status: 400 });
    }

    let runCase = r.id
      ? run.cases.find((c) => c.id === r.id)
      : run.cases.find(
          (c) => c.testCase.title.toLowerCase() === (r.title ?? "").toLowerCase(),
        );

    if (!runCase) {
      notFound.push(r.id ?? r.title ?? "?");
      continue;
    }

    await prisma.testRunCase.update({
      where: { id: runCase.id },
      data: { status: r.status, actualResult: r.actualResult ?? null, executedAt: new Date() },
    });
    updated.push(runCase.id);
  }

  return Response.json({ updated: updated.length, notFound });
}
