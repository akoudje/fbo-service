const xlsx = require("xlsx");
const fs = require("fs");

// Charger le fichier Excel
const workbook = xlsx.readFile("DataFBO.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Convertir en JSON
const data = xlsx.utils.sheet_to_json(sheet);

// Sauvegarder en fichier JSON
fs.writeFileSync("prisma/fbo.json", JSON.stringify(data, null, 2));

console.log("✅ Conversion terminée : prisma/fbo.json créé !");