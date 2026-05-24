import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import {
  chunkArray,
  normalizeSourceRow,
} from "./prisma/import-helpers.js";

function resolveExcelFile() {
  const candidates = fs
    .readdirSync(process.cwd())
    .filter((name) => /\.xlsx$/i.test(name) && !name.startsWith("~$"))
    .sort();

  if (!candidates.length) {
    throw new Error("Aucun fichier Excel .xlsx trouvé.");
  }

  return candidates.includes("DataFBO-plus.xlsx")
    ? "DataFBO-plus.xlsx"
    : candidates[0];
}

const sourceFile = resolveExcelFile();
const workbook = xlsx.readFile(sourceFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

const validRows = rawRows
  .map((row) => normalizeSourceRow(row).normalized)
  .filter((row) => row.fbo_number && row.full_name && row.grade);

const chunksDir = path.join(process.cwd(), "prisma", "chunks");
fs.mkdirSync(chunksDir, { recursive: true });

const chunks = chunkArray(validRows, 5000);
chunks.forEach((chunk, index) => {
  const target = path.join(chunksDir, `fbo-import-${index + 1}.json`);
  fs.writeFileSync(target, JSON.stringify(chunk, null, 2), "utf8");
});

console.log(`✅ Conversion terminée : ${chunks.length} chunk(s) généré(s) depuis ${sourceFile}`);
