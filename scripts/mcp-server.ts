#!/usr/bin/env node
/**
 * QA Studio MCP Server
 * Run: npx tsx scripts/mcp-server.ts
 * Then add to Claude Code's MCP config (see README or run with --help)
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const prisma = new PrismaClient({
  adapter: new PrismaLibSql(authToken ? { url, authToken } : { url }),
});

const server = new McpServer({ name: "qa-studio", version: "1.0.0" });

// ── Projects ────────────────────────────────────────────────────────────────

server.tool("list_projects", "List all QA Studio projects", {}, async () => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { testCases: true, folders: true } } },
  });
  return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
});

// ── Folders ─────────────────────────────────────────────────────────────────

server.tool(
  "list_folders",
  "List folders in a project",
  { projectKey: z.string().describe("Project key e.g. OGISO") },
  async ({ projectKey }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };
    const folders = await prisma.folder.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { testCases: true } }, parent: { select: { name: true } } },
    });
    return { content: [{ type: "text", text: JSON.stringify(folders, null, 2) }] };
  },
);

// ── Test Cases ───────────────────────────────────────────────────────────────

server.tool(
  "list_cases",
  "List test cases in a project, optionally filtered by folder name",
  {
    projectKey: z.string().describe("Project key e.g. OGISO"),
    folderName: z.string().optional().describe("Filter by folder name"),
    limit: z.number().optional().describe("Max results (default 50)"),
  },
  async ({ projectKey, folderName, limit = 50 }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };
    const cases = await prisma.testCase.findMany({
      where: {
        projectId: project.id,
        ...(folderName ? { folder: { name: folderName } } : {}),
      },
      take: limit,
      orderBy: { createdAt: "asc" },
      include: { folder: { select: { name: true } } },
    });
    return { content: [{ type: "text", text: JSON.stringify(cases, null, 2) }] };
  },
);

server.tool(
  "get_case",
  "Get full details of a single test case by ID",
  { caseId: z.string().describe("Test case ID") },
  async ({ caseId }) => {
    const tc = await prisma.testCase.findUnique({
      where: { id: caseId },
      include: { folder: { select: { name: true } }, project: { select: { key: true } } },
    });
    if (!tc) return { content: [{ type: "text", text: "Test case not found" }] };
    return { content: [{ type: "text", text: JSON.stringify(tc, null, 2) }] };
  },
);

server.tool(
  "create_case",
  "Create a new test case in a project",
  {
    projectKey: z.string().describe("Project key e.g. OGISO"),
    title: z.string().describe("Test case title"),
    description: z.string().optional().describe("Description / steps"),
    expectedResult: z.string().optional().describe("Expected result"),
    folderName: z.string().optional().describe("Folder name to place the case in"),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
    tags: z.string().optional().describe("Comma-separated tags"),
  },
  async ({ projectKey, title, description, expectedResult, folderName, priority, tags }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };

    let folderId: string | null = null;
    if (folderName) {
      const folder = await prisma.folder.findFirst({
        where: { name: folderName, projectId: project.id },
      });
      if (!folder) return { content: [{ type: "text", text: `Folder "${folderName}" not found` }] };
      folderId = folder.id;
    }

    const tc = await prisma.testCase.create({
      data: { projectId: project.id, folderId, title, description, expectedResult, priority, tags },
    });
    return { content: [{ type: "text", text: `Created test case: ${tc.id}\n${JSON.stringify(tc, null, 2)}` }] };
  },
);

server.tool(
  "update_case",
  "Update an existing test case",
  {
    caseId: z.string().describe("Test case ID"),
    title: z.string().optional(),
    description: z.string().optional(),
    expectedResult: z.string().optional(),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
    tags: z.string().optional(),
  },
  async ({ caseId, ...data }) => {
    const tc = await prisma.testCase.update({
      where: { id: caseId },
      data: { ...data, updatedAt: new Date() },
    });
    return { content: [{ type: "text", text: `Updated: ${JSON.stringify(tc, null, 2)}` }] };
  },
);

// ── Runs ─────────────────────────────────────────────────────────────────────

server.tool(
  "list_runs",
  "List test runs in a project",
  {
    projectKey: z.string().describe("Project key e.g. OGISO"),
    status: z.enum(["InProgress", "Completed"]).optional().describe("Filter by status"),
  },
  async ({ projectKey, status }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };
    const runs = await prisma.testRun.findMany({
      where: { projectId: project.id, ...(status ? { status } : {}) },
      orderBy: { startedAt: "desc" },
      include: { _count: { select: { cases: true } } },
    });
    return { content: [{ type: "text", text: JSON.stringify(runs, null, 2) }] };
  },
);

server.tool(
  "get_run",
  "Get full run details including all case results",
  { runId: z.string().describe("Run ID") },
  async ({ runId }) => {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: {
        cases: {
          orderBy: { order: "asc" },
          include: { testCase: { select: { title: true, priority: true, folder: { select: { name: true } } } } },
        },
      },
    });
    if (!run) return { content: [{ type: "text", text: "Run not found" }] };
    return { content: [{ type: "text", text: JSON.stringify(run, null, 2) }] };
  },
);

server.tool(
  "create_run",
  "Create a new test run. Optionally scope to specific folders or case IDs.",
  {
    projectKey: z.string().describe("Project key e.g. OGISO"),
    name: z.string().describe("Run name"),
    description: z.string().optional(),
    assignedTester: z.string().optional(),
    folderNames: z.array(z.string()).optional().describe("Include only cases from these folders"),
    caseIds: z.array(z.string()).optional().describe("Include only these specific case IDs"),
  },
  async ({ projectKey, name, description, assignedTester, folderNames, caseIds }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };

    let cases: { id: string }[];
    if (caseIds?.length) {
      cases = await prisma.testCase.findMany({ where: { id: { in: caseIds }, projectId: project.id }, select: { id: true } });
    } else if (folderNames?.length) {
      cases = await prisma.testCase.findMany({ where: { projectId: project.id, folder: { name: { in: folderNames } } }, select: { id: true } });
    } else {
      cases = await prisma.testCase.findMany({ where: { projectId: project.id }, select: { id: true } });
    }

    const run = await prisma.testRun.create({
      data: {
        projectId: project.id,
        name,
        description,
        assignedTester,
        cases: { create: cases.map((c, i) => ({ testCaseId: c.id, order: i, status: "Untested" })) },
      },
    });
    return { content: [{ type: "text", text: `Created run ${run.id} with ${cases.length} cases.\n${JSON.stringify(run, null, 2)}` }] };
  },
);

server.tool(
  "submit_results",
  "Submit test results for a run. Match by case title or runCase ID.",
  {
    runId: z.string().describe("Run ID"),
    results: z.array(z.object({
      id: z.string().optional().describe("RunCase ID (preferred)"),
      title: z.string().optional().describe("Test case title (fallback)"),
      status: z.enum(["Passed", "Failed", "Blocked", "Skipped"]),
      actualResult: z.string().optional(),
    })).describe("Array of results to submit"),
  },
  async ({ runId, results }) => {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { cases: { include: { testCase: { select: { title: true } } } } },
    });
    if (!run) return { content: [{ type: "text", text: "Run not found" }] };

    const updated: string[] = [];
    const notFound: string[] = [];

    for (const r of results) {
      const rc = r.id
        ? run.cases.find((c) => c.id === r.id)
        : run.cases.find((c) => c.testCase.title.toLowerCase() === (r.title ?? "").toLowerCase());

      if (!rc) { notFound.push(r.id ?? r.title ?? "?"); continue; }

      await prisma.testRunCase.update({
        where: { id: rc.id },
        data: { status: r.status, actualResult: r.actualResult ?? null, executedAt: new Date() },
      });
      updated.push(rc.id);
    }

    return { content: [{ type: "text", text: `Updated ${updated.length} cases. Not found: ${notFound.length > 0 ? notFound.join(", ") : "none"}` }] };
  },
);

// ── Defects ──────────────────────────────────────────────────────────────────

server.tool(
  "list_defects",
  "List defects in a project",
  {
    projectKey: z.string().describe("Project key e.g. OGISO"),
    status: z.string().optional().describe("Filter by status e.g. Open, Resolved"),
  },
  async ({ projectKey, status }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };
    const defects = await prisma.defect.findMany({
      where: { projectId: project.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return { content: [{ type: "text", text: JSON.stringify(defects, null, 2) }] };
  },
);

server.tool(
  "create_defect",
  "File a defect in a project",
  {
    projectKey: z.string().describe("Project key e.g. OGISO"),
    title: z.string().describe("Defect title"),
    description: z.string().optional(),
    stepsToReproduce: z.string().optional(),
    expectedResult: z.string().optional(),
    actualResult: z.string().optional(),
    severity: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
  },
  async ({ projectKey, title, description, stepsToReproduce, expectedResult, actualResult, severity, priority }) => {
    const project = await prisma.project.findUnique({ where: { key: projectKey.toUpperCase() } });
    if (!project) return { content: [{ type: "text", text: `Project "${projectKey}" not found` }] };
    const defect = await prisma.defect.create({
      data: { projectId: project.id, title, description, stepsToReproduce, expectedResult, actualResult, severity, priority },
    });
    return { content: [{ type: "text", text: `Created defect ${defect.id}\n${JSON.stringify(defect, null, 2)}` }] };
  },
);

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => { console.error(e); process.exit(1); });
