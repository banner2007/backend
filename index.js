import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// Ruta principal
app.get("/", (req, res) => {
  res.json({ msg: "Backend funcionando en Render 🚀" });
});

// Ruta /time para probar
app.get("/time", (req, res) => {
  res.json({
    server_time: new Date().toISOString()
  });
});

// Puerto que Render inyecta automáticamente
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
