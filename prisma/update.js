// fbo-service/prisma/update.js

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { normalizeSourceRow } from "./import-helpers.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Mise à jour de la base FBO…");

  const chunksDir = path.join(process.cwd(), "prisma", "chunks");
  const files = fs.readdirSync(chunksDir).filter(f => f.endsWith(".json"));

  console.log(`📦 ${files.length} fichiers détectés :`, files);

  const batchSize = 1000;

  for (const file of files) {
    console.log(`\n📄 Lecture du fichier : ${file}`);

    const raw = JSON.parse(
      fs.readFileSync(path.join(chunksDir, file), "utf-8")
    );

    console.log(`➡️ ${raw.length} lignes trouvées`);

    // Import par batchs
    for (let i = 0; i < raw.length; i += batchSize) {
      const batch = raw.slice(i, i + batchSize);

      // createMany ne permet pas de mettre à jour → on utilise upsert
      const operations = batch
        .map((row) => normalizeSourceRow(row).normalized)
        .filter((row) => row.fbo_number && row.full_name && row.grade)
        .map((row) =>
        prisma.fBO.upsert({
          where: { fbo_number: row.fbo_number },
          update: {
            full_name: row.full_name,
            grade: row.grade,
            op_country: row.op_country,
            country: row.country,
            phone: row.phone,
            email: row.email,
          },
          create: {
            fbo_number: row.fbo_number,
            full_name: row.full_name,
            grade: row.grade,
            op_country: row.op_country,
            country: row.country,
            phone: row.phone,
            email: row.email,
          },
        })
      );

      await prisma.$transaction(operations);

      console.log(
        `   ✔️ Batch ${Math.floor(i / batchSize) + 1} traité (${batch.length} lignes)`
      );
    }
  }

  console.log("\n✅ Mise à jour FBO terminée !");
}

main()
  .catch((e) => console.error("❌ Erreur update:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
