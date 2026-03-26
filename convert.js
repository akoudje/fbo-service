import xlsx from "xlsx";
import fs from "fs";

// Charger le fichier Excel
const workbook = xlsx.readFile("DataFBO-5.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Convertir en JSON
const raw = xlsx.utils.sheet_to_json(sheet);

// Nettoyage optionnel : enlever les lignes vides
const data = raw.filter((row) => row.FBO_Number);

// Sauvegarder en JSON
fs.writeFileSync("prisma/fbo-5.json", JSON.stringify(data, null, 2));

console.log("✅ Conversion terminée : prisma/fbo.json créé !");
