// fbo-service/prisma/update.js

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
        .map(normalizeRow)
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
