import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Reset ──────────────────────────────────────────────────────
  await prisma.defectLink.deleteMany();
  await prisma.defect.deleteMany();
  await prisma.testRunCase.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testStep.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.exploratorySession.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();

  // ── Projects ───────────────────────────────────────────────────
  const toolbox = await prisma.project.create({
    data: {
      key: "TBX",
      name: "Toolbox Apps QA",
      description:
        "QA for the Toolbox Apps suite of Business Central extensions (APM, ISD, CRM, dashboards).",
    },
  });

  const wrench = await prisma.project.create({
    data: {
      key: "WRN",
      name: "WrenchNode QA",
      description: "QA for WrenchNode rental and service management.",
    },
  });

  // ── Milestones ─────────────────────────────────────────────────
  const tbxRelease = await prisma.milestone.create({
    data: {
      projectId: toolbox.id,
      name: "Toolbox 2026.06 Release",
      description: "June 2026 stability release across all Toolbox modules.",
      dueDate: new Date("2026-06-15"),
      status: "Active",
    },
  });

  await prisma.milestone.create({
    data: {
      projectId: wrench.id,
      name: "WrenchNode Q3 Launch",
      description: "Q3 launch of the new rental dashboard.",
      dueDate: new Date("2026-08-01"),
      status: "Active",
    },
  });

  // ── Toolbox folders ────────────────────────────────────────────
  const folderSpecs = ["APM", "ISD", "CRM", "Financial Dashboard", "Rental Dashboard", "Sales Dashboard"];
  const tbxFolders: Record<string, string> = {};
  for (let i = 0; i < folderSpecs.length; i++) {
    const f = await prisma.folder.create({
      data: { projectId: toolbox.id, name: folderSpecs[i], order: i },
    });
    tbxFolders[folderSpecs[i]] = f.id;
  }

  // ── Test cases (Toolbox) ───────────────────────────────────────
  type CaseSpec = {
    folder: string;
    title: string;
    description?: string;
    preconditions?: string;
    expectedResult?: string;
    priority: "Low" | "Medium" | "High" | "Critical";
    type: "Functional" | "Regression" | "Smoke" | "Exploratory" | "UI" | "DataValidation";
    status: "Draft" | "Ready" | "Deprecated";
    tags?: string;
    steps: { action: string; expected?: string }[];
  };

  function buildDescription(c: CaseSpec) {
    const parts: string[] = [];
    if (c.description) parts.push(c.description, "");
    if (c.preconditions) parts.push("Preconditions:", c.preconditions, "");
    parts.push("Steps:");
    c.steps.forEach((s, i) => { parts.push(`${i + 1}. ${s.action}`); });
    return parts.join("\n");
  }

  function buildExpected(c: CaseSpec) {
    const lines: string[] = [];
    if (c.expectedResult) lines.push(c.expectedResult);
    const perStep = c.steps.filter((s) => s.expected).map((s, i) => `${i + 1}. ${s.expected}`).join("\n");
    if (perStep) { if (lines.length) lines.push(""); lines.push("Per step:", perStep); }
    return lines.join("\n") || undefined;
  }

  const cases: CaseSpec[] = [
    {
      folder: "APM",
      title: "Create project with default cost code structure",
      description: "Verify a new APM project inherits the configured default cost code structure.",
      preconditions: "User has 'APM Project Manager' role; default structure is configured.",
      expectedResult: "Project is created with all default cost codes present and editable.",
      priority: "High", type: "Functional", status: "Ready", tags: "apm,project,setup",
      steps: [
        { action: "Open APM > Projects and click New", expected: "New project card appears" },
        { action: "Enter project name 'Pilot 001' and customer", expected: "Fields accept input" },
        { action: "Save the project", expected: "Project list refreshes with Pilot 001" },
        { action: "Open the project's Cost Codes tab", expected: "All default cost codes are listed in order" },
      ],
    },
    {
      folder: "APM",
      title: "WIP recognition posts to correct GL account",
      description: "WIP recognition should post to the GL account configured for the project's cost type.",
      preconditions: "Project has at least one timesheet posted; WIP setup is complete.",
      expectedResult: "GL entries appear in the configured WIP account with correct amount and dimensions.",
      priority: "Critical", type: "Functional", status: "Ready", tags: "apm,wip,gl",
      steps: [
        { action: "Open the project and run WIP recognition", expected: "Recognition runs without error" },
        { action: "Drill into the resulting GL entries", expected: "Entries hit the configured WIP account" },
        { action: "Verify dimensions are inherited from the project", expected: "Dimensions match project setup" },
      ],
    },
    {
      folder: "APM",
      title: "Edit project name does not break existing time entries",
      priority: "Medium", type: "Regression", status: "Ready", tags: "apm,regression",
      steps: [
        { action: "Rename an existing project with posted time entries", expected: "Save succeeds" },
        { action: "Open the project's posted time entries", expected: "All entries still show the renamed project" },
      ],
    },
    {
      folder: "ISD",
      title: "Create service item and assign to customer",
      preconditions: "Service item template exists.",
      expectedResult: "Service item is created and visible on customer's service tab.",
      priority: "High", type: "Functional", status: "Ready", tags: "isd,service-item",
      steps: [
        { action: "Open ISD > Service Items and click New", expected: "Form opens" },
        { action: "Fill serial number, model, and customer", expected: "Fields accept input" },
        { action: "Save", expected: "Item appears in the list and on the customer card" },
      ],
    },
    {
      folder: "ISD",
      title: "Return a service item updates inventory location",
      priority: "Medium", type: "Functional", status: "Ready", tags: "isd,return,inventory",
      steps: [
        { action: "Open an active service item", expected: "Item details load" },
        { action: "Click Return and select target location", expected: "Return dialog opens" },
        { action: "Confirm return", expected: "Item shows as Returned; inventory moves to selected location" },
      ],
    },
    {
      folder: "CRM",
      title: "Convert lead to deal preserves contact information",
      priority: "High", type: "Functional", status: "Ready", tags: "crm,lead,deal",
      steps: [
        { action: "Open an existing lead", expected: "Lead detail page loads" },
        { action: "Click Convert to Deal", expected: "Conversion dialog appears" },
        { action: "Confirm conversion", expected: "New deal has same contact, company, and notes" },
      ],
    },
    {
      folder: "CRM",
      title: "Salesperson filter persists across navigation",
      priority: "Low", type: "UI", status: "Draft", tags: "crm,filter,ux",
      steps: [
        { action: "Filter CRM list by salesperson 'JKE'", expected: "List filters down" },
        { action: "Navigate to a deal and back to the list", expected: "Filter remains applied" },
      ],
    },
    {
      folder: "Financial Dashboard",
      title: "Revenue tile matches GL revenue total for current period",
      priority: "Critical", type: "DataValidation", status: "Ready", tags: "financial,dashboard,reconciliation",
      steps: [
        { action: "Open Financial Dashboard", expected: "Dashboard loads with current period" },
        { action: "Read the Revenue tile value", expected: "Tile displays a value" },
        { action: "Run the GL revenue report for the same period", expected: "Report total matches the tile to the cent" },
      ],
    },
    {
      folder: "Financial Dashboard",
      title: "Change period selector refreshes all tiles",
      priority: "High", type: "Functional", status: "Ready", tags: "financial,dashboard",
      steps: [
        { action: "Open Financial Dashboard for current month", expected: "Tiles load" },
        { action: "Change period to previous quarter", expected: "All tiles refresh with previous-quarter data" },
      ],
    },
    {
      folder: "Rental Dashboard",
      title: "Active rentals count matches Rental Contract list",
      priority: "High", type: "DataValidation", status: "Ready", tags: "rental,dashboard",
      steps: [
        { action: "Open Rental Dashboard", expected: "Dashboard loads" },
        { action: "Note the Active Rentals tile value", expected: "Tile shows a number" },
        { action: "Open Rental Contracts filtered to 'Active'", expected: "Count matches the tile" },
      ],
    },
    {
      folder: "Rental Dashboard",
      title: "Late returns highlighted in red",
      priority: "Medium", type: "UI", status: "Ready", tags: "rental,ux,visual",
      steps: [
        { action: "Open Rental Dashboard with a rental past return date", expected: "Late rental row is highlighted red" },
      ],
    },
    {
      folder: "Sales Dashboard",
      title: "Pipeline funnel shows correct conversion percentages",
      priority: "High", type: "DataValidation", status: "Ready", tags: "sales,dashboard",
      steps: [
        { action: "Open Sales Dashboard", expected: "Funnel loads" },
        { action: "Hover each funnel stage", expected: "Tooltip shows count and conversion % to next stage" },
        { action: "Cross-check counts with the Deals list", expected: "Counts match" },
      ],
    },
    {
      folder: "Sales Dashboard",
      title: "Salesperson leaderboard sorts by closed-won revenue",
      priority: "Medium", type: "Functional", status: "Ready", tags: "sales,dashboard,leaderboard",
      steps: [
        { action: "Open Sales Dashboard", expected: "Leaderboard visible" },
        { action: "Click the Revenue column", expected: "Sorts descending by closed-won revenue" },
      ],
    },
    {
      folder: "APM",
      title: "Smoke: APM module loads under 3 seconds",
      priority: "High", type: "Smoke", status: "Ready", tags: "smoke,perf",
      steps: [
        { action: "Open the APM home page from a cold session", expected: "Page becomes interactive within 3 seconds" },
      ],
    },
    {
      folder: "CRM",
      title: "Exploratory: try to break the deal-stage drag-drop",
      priority: "Low", type: "Exploratory", status: "Draft", tags: "crm,exploratory",
      steps: [
        { action: "Drag deals rapidly between stages", expected: "No deals are lost; final state matches drop target" },
      ],
    },
  ];

  const caseIds: string[] = [];
  for (const c of cases) {
    const created = await prisma.testCase.create({
      data: {
        projectId: toolbox.id,
        folderId: tbxFolders[c.folder],
        title: c.title,
        description: buildDescription(c),
        expectedResult: buildExpected(c),
        priority: c.priority,
        type: c.type,
        status: c.status,
        tags: c.tags,
      },
    });
    caseIds.push(created.id);
  }

  // ── WrenchNode (smaller seed) ──────────────────────────────────
  const wrenchRentalFolder = await prisma.folder.create({
    data: { projectId: wrench.id, name: "Rental Core", order: 0 },
  });
  await prisma.testCase.create({
    data: {
      projectId: wrench.id,
      folderId: wrenchRentalFolder.id,
      title: "Create rental contract with daily pricing",
      priority: "High",
      type: "Functional",
      status: "Ready",
      tags: "rental,pricing",
      description: "Steps:\n1. Create a rental contract with daily rate $50\n2. Set duration to 5 days",
      expectedResult: "Contract is created. Total displays $250.",
    },
  });

  // ── Test runs ──────────────────────────────────────────────────
  const completedRun = await prisma.testRun.create({
    data: {
      projectId: toolbox.id,
      milestoneId: tbxRelease.id,
      name: "Toolbox 2026.06 RC1 — Regression",
      description: "Pre-release regression pass on RC1 build.",
      assignedTester: "Mario",
      status: "Completed",
      startedAt: new Date("2026-05-10T09:00:00Z"),
      completedAt: new Date("2026-05-12T17:00:00Z"),
      cases: {
        create: caseIds.slice(0, 8).map((id, i) => ({
          testCaseId: id,
          order: i,
          status: i === 1 ? "Failed" : i === 3 ? "Blocked" : i === 5 ? "Failed" : "Passed",
          actualResult:
            i === 1 ? "WIP entries posted to the wrong GL account (5300 instead of configured 5310)."
            : i === 3 ? "Cannot reach Return dialog — modal fails to open on Chrome 132."
            : i === 5 ? "Notes field was lost during conversion — only contact and company carried over."
            : "Behaves as expected.",
          executedBy: "Mario",
          executedAt: new Date(`2026-05-1${i % 3}T14:00:00Z`),
        })),
      },
    },
  });

  await prisma.testRun.create({
    data: {
      projectId: toolbox.id,
      milestoneId: tbxRelease.id,
      name: "Toolbox 2026.06 RC2 — Smoke",
      description: "Smoke test after fixes for RC1 failures.",
      assignedTester: "Mario",
      status: "InProgress",
      startedAt: new Date("2026-05-15T08:00:00Z"),
      cases: {
        create: caseIds.slice(0, 5).map((id, i) => ({
          testCaseId: id,
          order: i,
          status: i < 2 ? "Passed" : "Untested",
          actualResult: i < 2 ? "Passed on RC2 build." : null,
          executedBy: i < 2 ? "Mario" : null,
          executedAt: i < 2 ? new Date("2026-05-16T10:00:00Z") : null,
        })),
      },
    },
  });

  // ── Defects ────────────────────────────────────────────────────
  const completedRunCases = await prisma.testRunCase.findMany({
    where: { testRunId: completedRun.id, status: "Failed" },
  });

  const wipDefect = await prisma.defect.create({
    data: {
      projectId: toolbox.id,
      title: "APM WIP recognition posts to wrong GL account",
      description: "WIP recognition is ignoring the per-cost-type GL mapping and falling back to the default WIP account.",
      stepsToReproduce: "1. Open project with custom WIP GL mapping.\n2. Run WIP recognition.\n3. Drill into GL entries.",
      expectedResult: "GL entries hit the configured WIP account (5310).",
      actualResult: "GL entries hit the default WIP account (5300).",
      severity: "Critical", priority: "Critical", status: "InProgress",
      links: completedRunCases[0] ? { create: { testRunCaseId: completedRunCases[0].id } } : undefined,
    },
  });

  await prisma.defect.create({
    data: {
      projectId: toolbox.id,
      title: "ISD Return dialog fails to open in Chrome 132",
      description: "The Return modal does not render. Console shows a hydration mismatch warning.",
      stepsToReproduce: "Open an active ISD service item, click Return.",
      expectedResult: "Return modal opens.",
      actualResult: "Nothing happens; console error logged.",
      severity: "High", priority: "High", status: "Open",
      links: completedRunCases[1] ? { create: { testRunCaseId: completedRunCases[1].id } } : undefined,
    },
  });

  await prisma.defect.create({
    data: {
      projectId: toolbox.id,
      title: "CRM lead→deal conversion loses notes",
      description: "Notes are not copied to the new deal record.",
      stepsToReproduce: "Convert any lead with notes to a deal.",
      expectedResult: "New deal contains the lead's notes.",
      actualResult: "Notes field on the deal is empty.",
      severity: "Medium", priority: "High", status: "ReadyForQA",
      links: completedRunCases[2] ? { create: { testRunCaseId: completedRunCases[2].id } } : undefined,
    },
  });

  await prisma.defect.create({
    data: {
      projectId: toolbox.id,
      title: "Rental Dashboard late-return highlight uses pink instead of red",
      description: "Subtle UI regression after Tailwind upgrade.",
      severity: "Low", priority: "Low", status: "Closed",
    },
  });

  // ── Exploratory session ────────────────────────────────────────
  await prisma.exploratorySession.create({
    data: {
      projectId: toolbox.id,
      title: "Stress test: rapid deal stage drag-drop",
      charter: "Find race conditions and lost updates when many deals are moved quickly.",
      productModule: "CRM",
      timeboxMinutes: 45,
      notes: "Tried 50 deals in 2 minutes. One deal appeared in two stages briefly after a slow network hiccup but resolved on refresh. No data loss observed.",
      summary: "No reproducible loss of data. Minor visual flicker logged in CRM defect backlog.",
      areasTested: "drag-drop,crm,deals",
      completedAt: new Date("2026-05-09T11:00:00Z"),
    },
  });

  console.log("✔ Seed complete");
  console.log(`  ${await prisma.project.count()} projects`);
  console.log(`  ${await prisma.folder.count()} folders`);
  console.log(`  ${await prisma.testCase.count()} test cases`);
  console.log(`  ${await prisma.testRun.count()} test runs`);
  console.log(`  ${await prisma.defect.count()} defects`);
  console.log(`  ${await prisma.exploratorySession.count()} exploratory sessions`);
  console.log(`  ${wipDefect.id} ← sample defect id`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
