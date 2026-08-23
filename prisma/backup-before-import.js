// fbo-service/prisma/backup-before-import.js
// Sauvegarde complète de la table FBO avant un import, au même format que les
// sauvegardes précédentes dans prisma/backups/.

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = { label: "backup" };
  for (const token of argv) {
    if (!token.startsWith("--")) args.label = token;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log("🔄 Sauvegarde de la table FBO…");
  const rows = await prisma.fBO.findMany({ orderBy: { id: "asc" } });
  console.log(`➡️ ${rows.length} lignes lues`);

  const backupsDir = path.join(process.cwd(), "prisma", "backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const backupPath = path.join(
    backupsDir,
    `fbo-backup-before-${args.label}-${stamp}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), "utf8");

  console.log(`✅ Sauvegarde écrite : ${backupPath}`);
}

main()
  .catch((error) => {
    console.error("❌ Erreur backup:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
