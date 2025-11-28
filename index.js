import express from "express";
import cors from "cors";
import { getServerTime, getAccountInfo } from "./services/binance_service.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ msg: "Backend funcionando en Railway 🚀" });
});

// Binance server time
app.get("/binance/time", async (req, res) => {
  try {
    const data = await getServerTime();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Binance account
app.get("/binance/account", async (req, res) => {
  try {
    const data = await getAccountInfo();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// puerto RailWay
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
