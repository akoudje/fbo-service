const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const data = JSON.parse(fs.readFileSync('./prisma/fbo.json', 'utf-8'));

  for (const fbo of data) {
    try {
      await prisma.fBO.create({
        data: {
          fbo_number: fbo.FBO_Number,
          full_name: fbo["Full Name"],   // clé avec espace
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
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });