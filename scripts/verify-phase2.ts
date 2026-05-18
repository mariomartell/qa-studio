// Exercises the Phase 2 mutations end-to-end at the Prisma layer.
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

  // Pick a failed run case to "file" against
  const failedRc = await prisma.testRunCase.findFirst({
    where: {
      status: "Failed",
      testRun: { projectId: project.id },
    },
    include: {
      testCase: { include: { steps: { orderBy: { order: "asc" } } } },
      testRun: { select: { id: true, name: true } },
    },
  });
  if (!failedRc) throw new Error("no failed run case in seed");
  console.log("✔ found failed run case:", failedRc.testCase.title);

  // Compose the prefill the same way new/page.tsx does
  const stepsText = failedRc.testCase.steps
    .map((s) =>
      s.expectedResult
        ? `${s.order}. ${s.action}\n   → expected: ${s.expectedResult}`
        : `${s.order}. ${s.action}`,
    )
    .join("\n");

  // Create defect with link
  const defect = await prisma.defect.create({
    data: {
      projectId: project.id,
      title: `${failedRc.testCase.title} — fails`,
      stepsToReproduce: stepsText,
      expectedResult: failedRc.testCase.expectedResult,
      actualResult: failedRc.actualResult,
      severity: failedRc.testCase.priority,
      priority: failedRc.testCase.priority,
      status: "Open",
      links: { create: [{ testRunCaseId: failedRc.id }] },
    },
    include: { links: true },
  });
  console.log("✔ created defect:", defect.id);
  console.log("  - links:", defect.links.length);
  console.log("  - stepsToReproduce length:", defect.stepsToReproduce?.length);

  // Read back with the same shape the detail page uses
  const round = await prisma.defect.findUniqueOrThrow({
    where: { id: defect.id },
    include: {
      links: {
        include: {
          runCase: {
            include: {
              testCase: { select: { title: true } },
              testRun: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  const link = round.links[0];
  if (link.runCase?.testRun.name !== failedRc.testRun.name) {
    throw new Error("link did not round-trip with the right run");
  }
  console.log("✔ link round-trips with run:", link.runCase.testRun.name);

  // Update status → Closed
  await prisma.defect.update({
    where: { id: defect.id },
    data: { status: "Closed" },
  });
  const updated = await prisma.defect.findUniqueOrThrow({
    where: { id: defect.id },
  });
  if (updated.status !== "Closed") throw new Error("status update failed");
  console.log("✔ status update worked");

  // Cleanup
  await prisma.defect.delete({ where: { id: defect.id } });
  console.log("✔ cleaned up");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
