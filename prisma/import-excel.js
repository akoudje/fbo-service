import "dotenv/config";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  chunkArray,
  ensureReportFileName,
  normalizeSourceRow,
} from "./import-helpers.js";

const prisma = new PrismaClient();
const BATCH_SIZE = 500;

function parseArgs(argv) {
  const args = { reset: false, file: null, dryRun: false };
  for (const token of argv) {
    if (token === "--reset") args.reset = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (!args.file) args.file = token;
  }
  return args;
}

function resolveExcelFile(inputFile) {
  if (inputFile) {
    return path.isAbsolute(inputFile)
      ? inputFile
      : path.resolve(process.cwd(), inputFile);
  }

  const candidates = fs
    .readdirSync(process.cwd())
    .filter((name) => /\.xlsx$/i.test(name) && !name.startsWith("~$"))
    .map((name) => ({
      name,
      fullPath: path.join(process.cwd(), name),
      mtimeMs: fs.statSync(path.join(process.cwd(), name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!candidates.length) {
    throw new Error("Aucun fichier Excel .xlsx trouvé dans fbo-service.");
  }

  return candidates[0].fullPath;
}

function buildImportPlan(rawRows) {
  const seen = new Set();
  const validRows = [];
  const rejected = [];
  const duplicates = [];
  const invalidPhones = [];
  const stats = {
    totalRows: rawRows.length,
    importedRows: 0,
    updatedRows: 0,
    createdRows: 0,
    rejectedRows: 0,
    duplicateFboRows: 0,
    ciPhonesNormalized: 0,
    ciPhonesInvalid: 0,
    bfaPhonesNormalized: 0,
    bfaPhonesInvalid: 0,
    nonCiPhonesPreserved: 0,
    emailsInvalidOrMissing: 0,
    birthDatesImported: 0,
  };

  rawRows.forEach((row, index) => {
    const item = normalizeSourceRow(row);
    const line = index + 2;
    const fboNumber = item.normalized.fbo_number;

    if (!fboNumber || !item.normalized.full_name || !item.normalized.grade) {
      rejected.push({
        line,
        fbo_number: fboNumber || null,
        reason: "Colonnes obligatoires manquantes (FBO ID, Name, Member Level).",
      });
      stats.rejectedRows += 1;
      return;
    }

    if (seen.has(fboNumber)) {
      duplicates.push({
        line,
        fbo_number: fboNumber,
        reason: "Doublon FBO ID dans le fichier source.",
      });
      stats.duplicateFboRows += 1;
      return;
    }
    seen.add(fboNumber);

    if (item.phoneInfo.status === "normalized" && item.phoneInfo.country === "BFA") {
      stats.bfaPhonesNormalized += 1;
    } else if (item.phoneInfo.status === "normalized") {
      stats.ciPhonesNormalized += 1;
    }
    if (item.phoneInfo.status === "invalid") {
      if (item.phoneInfo.country === "BFA") stats.bfaPhonesInvalid += 1;
      else stats.ciPhonesInvalid += 1;
      // On n'écarte plus le FBO pour un téléphone illisible : mieux vaut le
      // créer/mettre à jour sans téléphone (à corriger manuellement plus
      // tard) que de perdre un nouveau membre ou de manquer sa mise à jour
      // de grade. Le téléphone existant en base n'est jamais écrasé par ce
      // null (voir COALESCE dans bulkUpsertRows).
      invalidPhones.push({
        line,
        fbo_number: fboNumber,
        reason: item.phoneInfo.reason,
      });
      item.normalized.phone = null;
    }
    if (item.phoneInfo.status === "preserved") stats.nonCiPhonesPreserved += 1;
    if (!item.normalized.email && row?.Email) stats.emailsInvalidOrMissing += 1;
    if (item.normalized.birth_date) stats.birthDatesImported += 1;

    validRows.push({
      line,
      ...item.normalized,
    });
  });

  return {
    validRows,
    duplicates,
    rejected,
    invalidPhones,
    stats,
  };
}

async function resetTable() {
  await prisma.fBO.deleteMany({});
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "FBO_id_seq" RESTART WITH 1;`);
}

async function bulkUpsertRows(rows) {
  if (!rows.length) return;

  const values = Prisma.join(
    rows.map(({ line, ...row }) =>
      Prisma.sql`(
        ${row.fbo_number},
        ${row.full_name},
        ${row.grade},
        ${row.op_country},
        ${row.country},
        ${row.phone},
        ${row.email},
        ${row.birth_date},
        CURRENT_TIMESTAMP
      )`,
    ),
  );

  await prisma.$executeRaw`
    INSERT INTO "FBO" (
      "fbo_number",
      "full_name",
      "grade",
      "op_country",
      "country",
      "phone",
      "email",
      "birth_date",
      "updated_at"
    )
    VALUES ${values}
    ON CONFLICT ("fbo_number") DO UPDATE SET
      "full_name" = EXCLUDED."full_name",
      "grade" = EXCLUDED."grade",
      "op_country" = EXCLUDED."op_country",
      "country" = EXCLUDED."country",
      "phone" = COALESCE(EXCLUDED."phone", "FBO"."phone"),
      "email" = COALESCE(EXCLUDED."email", "FBO"."email"),
      "birth_date" = COALESCE(EXCLUDED."birth_date", "FBO"."birth_date"),
      "updated_at" = CURRENT_TIMESTAMP
  `;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bulkUpsertRowsWithRetry(rows, batchLabel, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await bulkUpsertRows(rows);
      return;
    } catch (error) {
      if (attempt >= maxAttempts) throw error;

      console.warn(
        `   ⚠️ Batch ${batchLabel} échoué (${error.code || error.name || "erreur"}), tentative ${attempt + 1}/${maxAttempts}`,
      );
      await prisma.$disconnect().catch(() => {});
      await sleep(Math.min(5000 * attempt, 30000));
    }
  }
}

async function importRows(rows, { reset = false, dryRun = false } = {}) {
  const chunks = chunkArray(rows, BATCH_SIZE);
  const stats = { createdRows: 0, updatedRows: 0 };

  if (reset && !dryRun) {
    await resetTable();
  }

  for (let i = 0; i < chunks.length; i += 1) {
    const batch = chunks[i];
    if (dryRun) {
      stats.createdRows += batch.length;
      continue;
    }

    if (reset) {
      await prisma.fBO.createMany({
        data: batch.map(({ line, ...data }) => data),
        skipDuplicates: true,
      });
      stats.createdRows += batch.length;
    } else {
      await bulkUpsertRowsWithRetry(batch, `${i + 1}/${chunks.length}`);
      stats.updatedRows += batch.length;
    }

    console.log(
      `   ✔️ Batch ${i + 1}/${chunks.length} traité (${batch.length} lignes)`,
    );
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceFile = resolveExcelFile(args.file);

  console.log("🔄 Import FBO depuis Excel…");
  console.log(`📄 Source : ${path.basename(sourceFile)}`);
  console.log(`🧭 Mode : ${args.reset ? "RESET COMPLET" : "MISE À JOUR"}${args.dryRun ? " (dry-run)" : ""}`);

  const workbook = xlsx.readFile(sourceFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`➡️ ${rawRows.length} lignes lues`);

  const plan = buildImportPlan(rawRows);
  const importStats = await importRows(plan.validRows, args);

  const report = {
    sourceFile,
    mode: args.reset ? "reset" : "update",
    dryRun: args.dryRun,
    generatedAt: new Date().toISOString(),
    stats: {
      ...plan.stats,
      importedRows: plan.validRows.length,
      createdRows: importStats.createdRows,
      updatedRows: importStats.updatedRows,
    },
    rejected: plan.rejected,
    duplicates: plan.duplicates,
    invalidPhones: plan.invalidPhones,
  };

  const reportsDir = path.join(process.cwd(), "prisma", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, ensureReportFileName(sourceFile));
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n📊 Résumé import FBO");
  console.log(`   - Lignes valides importables : ${plan.validRows.length}`);
  console.log(`   - Lignes rejetées (champs obligatoires manquants) : ${plan.rejected.length}`);
  console.log(`   - Doublons FBO ID : ${plan.duplicates.length}`);
  console.log(`   - Téléphones illisibles importés sans téléphone : ${plan.invalidPhones.length}`);
  console.log(`   - Téléphones CI normalisés : ${plan.stats.ciPhonesNormalized}`);
  console.log(`   - Téléphones CI invalides : ${plan.stats.ciPhonesInvalid}`);
  console.log(`   - Téléphones BFA normalisés : ${plan.stats.bfaPhonesNormalized}`);
  console.log(`   - Téléphones BFA invalides : ${plan.stats.bfaPhonesInvalid}`);
  console.log(`   - Dates de naissance importées : ${plan.stats.birthDatesImported}`);
  console.log(`   - Rapport : ${reportPath}`);
  console.log("\n✅ Import terminé.");
}

main()
  .catch((error) => {
    console.error("❌ Erreur import-excel:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
