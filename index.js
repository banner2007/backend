import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// Mensaje principal
app.get("/", (req, res) => {
  res.json({ msg: "Backend funcionando en Render 🚀" });
});

//
// ✔ ENDPOINT: /binance/time
// Obtiene el servidor de tiempo de Binance
//
app.get("/binance/time", async (req, res) => {
  try {
    const response = await fetch("https://api.binance.com/api/v3/time");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo el tiempo de Binance" });
  }
});

//
// ✔ ENDPOINT: /binance/account
// Requiere API KEY y SECRET configuradas en Render:
// BINANCE_API_KEY
// BINANCE_API_SECRET
//
app.get("/binance/account", async (req, res) => {
  try {
    const apiKey = process.env.BINANCE_API_KEY;
    const secret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !secret) {
      return res.status(500).json({ error: "Faltan API keys en Render" });
    }

    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;

    const signature = crypto
      .createHmac("sha256", secret)
      .update(query)
      .digest("hex");

    const url = `https://api.binance.com/api/v3/account?${query}&signature=${signature}`;

    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error llamando a Binance Account" });
  }
});

//
// ✔ Iniciar servidor
//
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
