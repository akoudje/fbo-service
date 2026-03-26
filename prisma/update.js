// fbo-service/prisma/update.js

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

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
      const operations = batch.map((fbo) =>
        prisma.fBO.upsert({
          where: { fbo_number: fbo.FBO_Number },
          update: {
            full_name: fbo["Full Name"],
            grade: fbo.Grade,
            op_country: fbo.Op_Country,
            country: fbo.Country,
            phone: fbo.Phone,
          },
          create: {
            fbo_number: fbo.FBO_Number,
            full_name: fbo["Full Name"],
            grade: fbo.Grade,
            op_country: fbo.Op_Country,
            country: fbo.Country,
            phone: fbo.Phone,
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
