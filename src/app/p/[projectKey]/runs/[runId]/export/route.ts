import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

function escapeCsv(val: string | null | undefined): string {
  const s = val ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectKey: string; runId: string }> },
) {
  const { projectKey, runId } = await params;

  const run = await prisma.testRun.findFirst({
    where: { id: runId, project: { key: projectKey } },
    include: {
      cases: {
        orderBy: { order: "asc" },
        include: {
          testCase: {
            select: {
              title: true,
              priority: true,
              folder: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!run) return new Response("Not found", { status: 404 });

  const rows: string[] = [
    ["#", "Test Case", "Folder", "Priority", "Status", "Actual Result"].map(escapeCsv).join(","),
  ];

  run.cases.forEach((rc, i) => {
    rows.push(
      [
        String(i + 1),
        rc.testCase.title,
        rc.testCase.folder?.name ?? "",
        rc.testCase.priority,
        rc.status,
        rc.actualResult ?? "",
      ]
        .map(escapeCsv)
        .join(","),
    );
  });

  const filename = `${run.name.replace(/[^a-z0-9]/gi, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new Response(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
