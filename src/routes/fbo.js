import express from "express";
import { prisma } from "../lib/prisma.js";
import { digitsOnly } from "../utils/format.js";

const router = express.Router();

router.get("/check/:numero", async (req, res) => {
  try {
    const raw = req.params.numero;
    const numero = digitsOnly(raw);

    if (numero.length !== 12) {
      return res.status(400).json({ error: "Numéro FBO invalide" });
    }

    const fbo = await prisma.fBO.findUnique({
      where: { fbo_number: numero },
      select: { full_name: true, grade: true }
    });

    if (!fbo) return res.json({ exists: false });

    return res.json({
      exists: true,
      full_name: fbo.full_name,
      grade: fbo.grade
    });
  } catch (err) {
    console.error("Erreur FBO:", err);
    return res.status(500).json({ error: "Erreur interne du service FBO" });
  }
});


export default router;