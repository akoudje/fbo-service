const express = require('express');
const { PrismaClient } = require('./generated/prisma');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// 📖 Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FBO Service API',
      version: '1.0.0',
      description: 'API REST pour gérer les FBO',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     FBO:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         fbo_number:
 *           type: string
 *           example: "FBO123"
 *         full_name:
 *           type: string
 *           example: "Junior Akoudje"
 *         grade:
 *           type: string
 *           example: "Manager"
 *         op_country:
 *           type: string
 *           nullable: true
 *           example: "Senegal"
 *         country:
 *           type: string
 *           nullable: true
 *           example: "Côte d’Ivoire"
 *         phone:
 *           type: string
 *           example: "+2250707070707"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-03-20T10:09:23.461Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2026-03-20T10:09:23.481Z"
 */

/**
 * @swagger
 * /fbo:
 *   post:
 *     summary: Créer un FBO
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FBO'
 *     responses:
 *       200:
 *         description: FBO créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FBO'
 */
app.post('/fbo', async (req, res) => {
  try {
    const fbo = await prisma.fBO.create({ data: req.body });
    res.json(fbo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /fbo:
 *   get:
 *     summary: Récupérer la liste de tous les FBO
 *     responses:
 *       200:
 *         description: Liste des FBO
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FBO'
 */
app.get('/fbo', async (req, res) => {
  try {
    const fbos = await prisma.fBO.findMany();
    res.json(fbos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /fbo/{number}:
 *   get:
 *     summary: Lire un FBO par numéro
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FBO trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FBO'
 */
app.get('/fbo/:number', async (req, res) => {
  const fbo = await prisma.fBO.findUnique({
    where: { fbo_number: req.params.number },
  });
  res.json(fbo);
});

/**
 * @swagger
 * /fbo/{number}:
 *   put:
 *     summary: Mettre à jour un FBO
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FBO'
 *     responses:
 *       200:
 *         description: FBO mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FBO'
 */
app.put('/fbo/:number', async (req, res) => {
  try {
    const fbo = await prisma.fBO.update({
      where: { fbo_number: req.params.number },
      data: req.body,
    });
    res.json(fbo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /fbo/{number}:
 *   delete:
 *     summary: Supprimer un FBO
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FBO supprimé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FBO'
 */
app.delete('/fbo/:number', async (req, res) => {
  try {
    const fbo = await prisma.fBO.delete({
      where: { fbo_number: req.params.number },
    });
    res.json(fbo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/**
 * @swagger
 * /fbo/check/{number}:
 *   get:
 *     summary: Vérifier l'existence d'un FBO et retourner son nom
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FBO trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   example: true
 *                 full_name:
 *                   type: string
 *                   example: "Cakpo Constantin Bikpe"
 */
app.get('/fbo/check/:number', async (req, res) => {
  const fbo = await prisma.fBO.findUnique({
    where: { fbo_number: req.params.number },
    select: { full_name: true },
  });

  if (fbo) {
    res.json({ exists: true, full_name: fbo.full_name });
  } else {
    res.json({ exists: false });
  }
});


app.listen(3000, () => {
  console.log('🚀 FBO service running on http://localhost:3000');
  console.log('📖 Swagger docs available at http://localhost:3000/api-docs');
});