// fbo-service/prisma/seed.js

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Nettoyage de la base FBO…");

  // 1. Vider la table
  await prisma.fBO.deleteMany({});
  console.log("✔️ Table FBO vidée");

  // 2. Réinitialiser l'auto-increment
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "FBO_id_seq" RESTART WITH 1;`);
  console.log("✔️ Auto-increment réinitialisé");

  // 3. Charger tous les fichiers JSON dans prisma/chunks
  const chunksDir = path.join(process.cwd(), "prisma", "chunks");
  const files = fs.readdirSync(chunksDir).filter(f => f.endsWith(".json"));

  console.log(`📦 ${files.length} fichiers détectés :`, files);

  const batchSize = 1000;

  for (const file of files) {
    console.log(`\n📄 Import du fichier : ${file}`);

    const raw = JSON.parse(
      fs.readFileSync(path.join(chunksDir, file), "utf-8")
    );

    console.log(`➡️ ${raw.length} lignes trouvées`);

    // Import par batchs
    for (let i = 0; i < raw.length; i += batchSize) {
      const batch = raw.slice(i, i + batchSize);

      await prisma.fBO.createMany({
        data: batch.map((fbo) => ({
          fbo_number: fbo.FBO_Number,
          full_name: fbo["Full Name"],
          grade: fbo.Grade,
          op_country: fbo.Op_Country,
          country: fbo.Country,
          phone: fbo.Phone,
        })),
        skipDuplicates: true,
      });

      console.log(
        `   ✔️ Batch ${Math.floor(i / batchSize) + 1} (${batch.length} lignes)`
      );
    }
  }

  console.log("\n✅ Import FBO terminé avec succès !");
}

main()
  .catch((e) => console.error("❌ Erreur seed:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
