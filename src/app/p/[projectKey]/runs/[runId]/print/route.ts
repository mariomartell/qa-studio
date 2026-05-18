import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

const STATUS_COLOR: Record<string, string> = {
  Passed: "#22c55e",
  Failed: "#ef4444",
  Blocked: "#f59e0b",
  Skipped: "#94a3b8",
  Untested: "#cbd5e1",
};

function donutSvg(counts: Record<string, number>, total: number) {
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * r;

  const statuses = ["Passed", "Failed", "Blocked", "Skipped", "Untested"];
  const segments: { color: string; pct: number }[] = statuses
    .map((s) => ({ color: STATUS_COLOR[s], pct: (counts[s] ?? 0) / (total || 1) }))
    .filter((s) => s.pct > 0);

  let offset = 0;
  const paths = segments.map(({ color, pct }) => {
    const dash = pct * circumference;
    const gap = circumference - dash;
    const svg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="28"
      stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${-offset * circumference}"
      transform="rotate(-90 ${cx} ${cy})" />`;
    offset += pct;
    return svg;
  });

  const passed = counts["Passed"] ?? 0;
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);

  return `<svg width="200" height="200" viewBox="0 0 200 200">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="28"/>
    ${paths.join("\n")}
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="22" font-weight="700" fill="#0f172a">${pct}%</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="#64748b">Pass rate</text>
  </svg>`;
}

function statusBadge(status: string) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  const text = status === "Untested" ? "#64748b" : "white";
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;background:${color};color:${text}">${status}</span>`;
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

  if (!run) {
    return new Response("Not found", { status: 404 });
  }

  const total = run.cases.length;
  const counts = run.cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const passed = counts["Passed"] ?? 0;
  const failed = counts["Failed"] ?? 0;
  const others = total - passed - failed;
  const passPct = total === 0 ? 0 : Math.round((passed / total) * 100);
  const failPct = total === 0 ? 0 : Math.round((failed / total) * 100);
  const otherPct = 100 - passPct - failPct;

  // Group cases by folder
  const groups = new Map<string, typeof run.cases>();
  for (const rc of run.cases) {
    const key = rc.testCase.folder?.name ?? "Unfiled";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rc);
  }

  const groupsHtml = [...groups.entries()]
    .map(([folderName, cases]) => `
      <div style="margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="display:inline-block;width:14px;height:14px;background:#f59e0b;border-radius:2px"></span>
          <span style="font-size:15px;font-weight:700;color:#0f172a">${folderName}</span>
          <span style="font-size:13px;color:#64748b">(${cases.length})</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0">
              <th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:600">Test</th>
              <th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:600;width:100px">Priority</th>
              <th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:600;width:100px">Status</th>
            </tr>
          </thead>
          <tbody>
            ${cases.map((rc) => `
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:8px 12px;color:#1e293b">${rc.testCase.title}</td>
                <td style="padding:8px 12px;color:#64748b">${rc.testCase.priority}</td>
                <td style="padding:8px 12px">${statusBadge(rc.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `).join("");

  const legendHtml = ["Passed", "Failed", "Blocked", "Skipped", "Untested"]
    .map((s) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${STATUS_COLOR[s]}"></span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#0f172a">${counts[s] ?? 0} ${s}</div>
          <div style="font-size:11px;color:#64748b">${total === 0 ? 0 : Math.round(((counts[s] ?? 0) / total) * 100)}% set to ${s}</div>
        </div>
      </div>
    `).join("");

  const metaRows = [
    ["Run ID", run.id.slice(0, 8)],
    ["Project", projectKey.toUpperCase()],
    ["Status", run.status],
    ["Tester", run.assignedTester ?? "—"],
    ["Started", format(run.startedAt, "MM/dd/yyyy")],
    run.completedAt ? ["Completed", format(run.completedAt, "MM/dd/yyyy")] : null,
  ]
    .filter(Boolean)
    .map(
      (row) => `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 16px;font-weight:600;color:#64748b;font-size:13px;width:140px">${row![0]}</td>
        <td style="padding:8px 16px;color:#1e293b;font-size:13px">${row![1]}</td>
      </tr>
    `,
    )
    .join("");

  const printedAt = format(new Date(), "MM/dd/yy, h:mm a");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${run.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: white; color: #0f172a; }
    .page { max-width: 860px; margin: 0 auto; padding: 32px 24px; }
    .header-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .run-title { font-size: 22px; font-weight: 700; }
    .run-id { font-size: 14px; color: #64748b; margin-left: 8px; }
    @media print {
      @page { margin: 16mm; size: A4; }
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .print-btn { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600; }
    .print-btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Print toolbar -->
    <div class="no-print" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:20px">
      <button class="print-btn" onclick="window.print()">Save as PDF / Print</button>
    </div>

    <!-- Print header (visible when printing) -->
    <div style="display:none" class="print-header">
      <span style="font-size:11px;color:#64748b">${printedAt}</span>
      <span style="font-size:11px;color:#64748b">${run.name} — QA Studio</span>
    </div>

    <!-- Run title -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <h1 style="font-size:20px;font-weight:700">
        ${run.name}
        <span style="font-size:14px;font-weight:400;color:#64748b;margin-left:8px">— ID: ${run.id.slice(0, 8)}</span>
      </h1>
    </div>

    <!-- Summary -->
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:48px;margin-bottom:20px">
        <div style="flex-shrink:0">${donutSvg(counts, total)}</div>
        <div style="flex:1">${legendHtml}</div>
      </div>
      <!-- Stats bar -->
      <div style="display:flex;gap:8px">
        <div style="flex:${passPct || 1};background:#22c55e;border-radius:4px;padding:8px 12px;color:white;font-size:13px;font-weight:600;min-width:0">
          <span style="font-size:15px">${passPct}%</span>
          <span style="margin-left:8px;opacity:.9">${passed} successful</span>
        </div>
        ${failed > 0 ? `<div style="flex:${failPct || 1};background:#ef4444;border-radius:4px;padding:8px 12px;color:white;font-size:13px;font-weight:600;min-width:0">
          <span style="font-size:15px">${failPct}%</span>
          <span style="margin-left:8px;opacity:.9">${failed} failure${failed !== 1 ? "s" : ""}</span>
        </div>` : ""}
        ${others > 0 ? `<div style="flex:${otherPct || 1};background:#94a3b8;border-radius:4px;padding:8px 12px;color:white;font-size:13px;font-weight:600;min-width:0">
          <span style="font-size:15px">${otherPct}%</span>
          <span style="margin-left:8px;opacity:.9">${others} other${others !== 1 ? "s" : ""}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Metadata -->
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:32px">
      <table style="width:100%;border-collapse:collapse">${metaRows}</table>
    </div>

    <!-- Cases by folder -->
    ${groupsHtml}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;color:#94a3b8">Printed ${printedAt}</span>
      <span style="font-size:12px;font-weight:700;color:#6366f1">QA Studio</span>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
