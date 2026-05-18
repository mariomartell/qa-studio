// Exercises the same Prisma flow that the server actions use,
// to confirm mutations are wired end-to-end.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const prisma = new PrismaClient({ adapter: new PrismaLibSql(authToken ? { url, authToken } : { url }) });

async function main() {
  const project = await prisma.project.findUniqueOrThrow({
    where: { key: "TBX" },
  });

  // 1) Create a folder
  const folder = await prisma.folder.create({
    data: { projectId: project.id, name: `Smoke Folder ${Date.now()}` },
  });
  console.log("✔ created folder", folder.id);

  // 2) Create a case in that folder
  const tc = await prisma.testCase.create({
    data: {
      projectId: project.id,
      folderId: folder.id,
      title: "Smoke: end-to-end create + run flow",
      description: "Steps:\n1. Open the app\n2. Click a project",
      priority: "High",
      type: "Smoke",
      status: "Ready",
    },
  });
  console.log("✔ created case", tc.id);

  // 3) Create a run including that case
  const run = await prisma.testRun.create({
    data: {
      projectId: project.id,
      name: "Smoke run (verify-actions)",
      assignedTester: "automation",
      status: "InProgress",
      cases: { create: [{ testCaseId: tc.id, order: 0, status: "Untested" }] },
    },
    include: { cases: true },
  });
  console.log("✔ created run", run.id, "with", run.cases.length, "case(s)");

  // 4) Mark its single case as Passed
  const rc = run.cases[0];
  await prisma.testRunCase.update({
    where: { id: rc.id },
    data: {
      status: "Passed",
      actualResult: "Worked as expected.",
      executedAt: new Date(),
      executedBy: "automation",
    },
  });
  console.log("✔ marked run case as Passed");

  // 5) Re-read and confirm
  const after = await prisma.testRunCase.findUnique({ where: { id: rc.id } });
  if (after?.status !== "Passed" || after.actualResult !== "Worked as expected.") {
    throw new Error("verification failed");
  }
  console.log("✔ DB reflects the update — final status:", after.status);

  // 6) Cleanup
  await prisma.testRun.delete({ where: { id: run.id } });
  await prisma.testCase.delete({ where: { id: tc.id } });
  await prisma.folder.delete({ where: { id: folder.id } });
  console.log("✔ cleaned up");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
