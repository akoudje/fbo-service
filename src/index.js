import express from "express";
import cors from "cors";
import fboRoutes from "./routes/fbo.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/fbo", fboRoutes);

app.get("/", (req, res) => {
  res.json({ status: "FBO service running" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("FBO service running on port", PORT));