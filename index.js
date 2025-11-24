import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ msg: "Backend funcionando en Render 🚀" });
});

/*
 * ENDPOINT: /binance/time
 * Verifica conexión con Binance
 */
app.get("/binance/time", async (req, res) => {
  try {
    const response = await fetch("https://api.binance.com/api/v3/time");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
 * ENDPOINT: /binance/account
 * Balance + info de la cuenta
 */
app.get("/binance/account", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const secret = process.env.BINANCE_SECRET;

  if (!apiKey || !secret)
    return res.status(400).json({ error: "Faltan claves en Render" });

  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(query)
    .digest("hex");

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * PUERTO DEL SERVIDOR
 */
app.listen(10000, () => console.log("Servidor funcionando en Render 🔥"));
