// fbo-service/prisma/seed.js

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function pickFirst(row, keys = []) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeRow(fbo) {
  const phone = pickFirst(fbo, ["Phone", "Phone ", "phone", "mobile", "Mobile"]);
  const rawEmail = pickFirst(fbo, [
    "Email",
    "E-mail",
    "email",
    "Mail",
    "mail",
    "Email Address",
    "email_address",
  ]);

  return {
    fbo_number: String(fbo.FBO_Number || "").trim(),
    full_name: String(fbo["Full Name"] || "").trim(),
    grade: String(fbo.Grade || "").trim(),
    op_country: pickFirst(fbo, ["Op_Country", "op_country"]),
    country: pickFirst(fbo, ["Country", "country"]),
    phone: phone || null,
    email: normalizeEmail(rawEmail),
  };
}

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
        data: batch
          .map(normalizeRow)
          .filter((row) => row.fbo_number && row.full_name && row.grade),
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
