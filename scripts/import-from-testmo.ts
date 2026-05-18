import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const prisma = new PrismaClient({ adapter: new PrismaLibSql(authToken ? { url, authToken } : { url }) });

// Folders that are children of another folder (name → parent name)
const PARENT_MAP: Record<string, string> = {
  "Medication List": "Medication",
};

const PRIORITY_MAP: Record<string, string> = {
  Critical: "Critical",
  High: "High",
  Normal: "Medium",
  Low: "Low",
};

function stripHtml(html: string): string {
  return html
    .replace(/<li>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<ol>|<ul>/gi, "")
    .replace(/<\/ol>|<\/ul>/gi, "")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "$1")
    .replace(/<em>(.*?)<\/em>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-from-testmo.ts <path-to-csv>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(csvPath), "utf-8").replace(/^﻿/, ""); // strip BOM
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true }) as Record<string, string>[];

  const project = await prisma.project.findUniqueOrThrow({ where: { key: "OGISO" } });

  // Clear existing
  await prisma.testCase.deleteMany({ where: { projectId: project.id } });
  await prisma.folder.deleteMany({ where: { projectId: project.id } });
  console.log("  Cleared existing folders and cases");

  // Build unique folder list from CSV (preserving order of first appearance)
  const folderNames: string[] = [];
  for (const row of records) {
    const name = row["Folder"]?.trim();
    if (name && !folderNames.includes(name)) folderNames.push(name);
  }

  // Create top-level folders first, then children
  const folderIdMap = new Map<string, string>(); // name → prisma id

  for (const name of folderNames.filter((n) => !PARENT_MAP[n])) {
    const f = await prisma.folder.create({ data: { projectId: project.id, name, order: 0 } });
    folderIdMap.set(name, f.id);
  }
  for (const name of folderNames.filter((n) => PARENT_MAP[n])) {
    const parentId = folderIdMap.get(PARENT_MAP[name]);
    const f = await prisma.folder.create({ data: { projectId: project.id, name, parentId, order: 0 } });
    folderIdMap.set(name, f.id);
  }
  console.log(`  Created ${folderIdMap.size} folders`);

  // Create test cases
  let count = 0;
  for (const row of records) {
    const title = row["Case"]?.trim();
    if (!title) continue;

    const folderName = row["Folder"]?.trim();
    const folderId = folderName ? (folderIdMap.get(folderName) ?? null) : null;
    const rawDesc = row["Description"]?.trim() ?? "";
    const rawExpected = row["Expected"]?.trim() ?? "";
    const rawTags = row["Tags"]?.trim() ?? "";
    const priority = PRIORITY_MAP[row["Priority"]?.trim()] ?? "Medium";

    await prisma.testCase.create({
      data: {
        projectId: project.id,
        folderId,
        title,
        description: rawDesc ? stripHtml(rawDesc) : null,
        expectedResult: rawExpected ? stripHtml(rawExpected) : null,
        tags: rawTags || null,
        priority,
      },
    });
    count++;
  }

  console.log(`  Created ${count} test cases`);
  console.log("✔ Import complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
