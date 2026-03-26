import express from "express";
import { prisma } from "../lib/prisma.js";
import { digitsOnly } from "../utils/format.js";

const router = express.Router();

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
      select: { full_name: true, phone: true, grade: true },
    });

    if (!fbo) return res.json({ exists: false });

    return res.json({
      exists: true,
      full_name: fbo.full_name,
      phone: fbo.phone || null,
      grade: fbo.grade,
    });
  } catch (err) {
    console.error("Erreur FBO:", err);
    return res.status(500).json({ error: "Erreur interne du service FBO" });
  }
});


export default router;
