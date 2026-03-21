import express from "express";
import { prisma } from "../lib/prisma.js";
import { digitsOnly } from "../utils/format.js";

const router = express.Router();


// Nettoyage du numéro FBO
function digitsOnly(v = "") {
  return String(v).replace(/\D/g, "");
}

router.get("/check/:numero", async (req, res) => {
  try {
    const raw = req.params.numero;
    const numero = digitsOnly(raw);

    if (numero.length !== 12) {
      return res.status(400).json({
        error: "Numéro FBO invalide",
      });
    }

    // Recherche dans la base
    const fbo = await prisma.fbo.findUnique({
      where: { numeroFbo: numero },
    });

    if (!fbo) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      full_name: fbo.nomComplet,
    });
  } catch (err) {
    console.error("Erreur FBO:", err);
    return res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

export default router;