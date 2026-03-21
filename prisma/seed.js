// fbo-service/prisma/seed.js

import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync("./prisma/fbo.json", "utf-8"));

  for (const fbo of data) {
    try {
      await prisma.fBO.create({
        data: {
          fbo_number: fbo.FBO_Number,
          full_name: fbo["Full Name"],
          grade: fbo.Grade,
          op_country: fbo.Op_Country,
          country: fbo.Country,
          phone: fbo.Phone,
        },
      });
    } catch (err) {
      console.error(`❌ Erreur pour ${fbo.FBO_Number}:`, err.message);
    }
  }

  console.log("✅ Données FBO insérées avec succès !");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
