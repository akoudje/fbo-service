import express from "express";
import { prisma } from "../lib/prisma.js";
import { digitsOnly } from "../utils/format.js";

const router = express.Router();

function normalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isBurkinaFasoCountry(value) {
  return ["burkina faso", "burkina", "bfa", "bf"].includes(normalizeLabel(value));
}

function normalizeBurkinaPhone(rawPhone) {
  let phone = digitsOnly(rawPhone);
  if (!phone) return null;

  if (phone.startsWith("00226")) {
    phone = phone.slice(5);
  } else if (phone.startsWith("226") && phone.length > 8) {
    phone = phone.slice(3);
  }

  while (phone.startsWith("00") && phone.length > 8) {
    phone = phone.slice(2);
  }

  return phone.length === 8 ? phone : rawPhone || null;
}

router.get("/check/:numero", async (req, res) => {
  try {
    const raw = req.params.numero;
    const numero = digitsOnly(raw);
    const numeroDashed = `${numero.slice(0, 3)}-${numero.slice(3, 6)}-${numero.slice(6, 9)}-${numero.slice(9, 12)}`;

    if (numero.length !== 12) {
      return res.status(400).json({ error: "Numéro FBO invalide" });
    }

    const fbo = await prisma.fBO.findFirst({
      where: {
        OR: [{ fbo_number: numero }, { fbo_number: numeroDashed }],
      },
      select: {
        full_name: true,
        phone: true,
        email: true,
        grade: true,
        country: true,
        op_country: true,
      },
    });

    if (!fbo) return res.json({ exists: false });

    const isBfa = isBurkinaFasoCountry(fbo.country) || isBurkinaFasoCountry(fbo.op_country);

    return res.json({
      exists: true,
      full_name: fbo.full_name,
      phone: isBfa ? normalizeBurkinaPhone(fbo.phone) : fbo.phone || null,
      email: fbo.email || null,
      grade: fbo.grade,
    });
  } catch (err) {
    console.error("Erreur FBO:", err);
    return res.status(500).json({ error: "Erreur interne du service FBO" });
  }
});


export default router;
