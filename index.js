import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";

// Cargar variables de entorno (para desarrollo local)
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- Configuración de Middleware ---
// Habilita CORS y permite leer el cuerpo de la solicitud en formato JSON (CRUCIAL para POST).
app.use(cors()); 
app.use(express.json());

// --- Rutas (Endpoints) ---

// 1. Mensaje Principal (Ruta raíz)
app.get("/", (req, res) => {
    res.json({ msg: "Backend de Arbitraje de Criptomonedas funcionando. Desarrollado para Railway." }); 
});

// 2. 🧪 ENDPOINT: /ip (Temporal para obtener IP, puedes eliminarlo)
app.get("/ip", async (req, res) => {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        res.json({ 
            message: "Esta es la IP de Salida (Egress IP) de tu servicio Railway:", 
            egress_ip: data.ip 
        });
    } catch (err) {
        res.status(500).json({ error: "Error obteniendo la IP de salida", details: err.message });
    }
});

// 3. ✔ ENDPOINT: /binance/time
app.get("/binance/time", async (req, res) => {
    try {
        const response = await fetch("https://api.binance.com/api/v3/time");
        if (!response.ok) {
            throw new Error(`Error en la API de Binance: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Error obteniendo el tiempo de Binance", details: err.message }); 
    }
});

// 4. ✔ ENDPOINT: /binance/prices (GET)
app.get("/binance/prices", async (req, res) => {
    try {
        const symbolsParam = req.query.symbols;
        
        if (!symbolsParam) {
            return res.status(400).json({ error: "Falta el parámetro 'symbols'. Debe ser un array JSON de símbolos." });
        }
        
        const symbols = JSON.parse(symbolsParam); 
        const symbolsString = JSON.stringify(symbols);
        
        const url = `https://api.binance.com/api/v3/ticker/price?symbols=${symbolsString}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error en la API de Binance: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Error obteniendo los precios de Binance", details: err.message });
    }
});

// 5. ⚡ ENDPOINT: /binance/order (POST)
// Coloca una nueva orden (compra/venta) en Binance. Requiere firma.
app.post("/binance/order", async (req, res) => {
    try {
        const { symbol, side, quantity, type = 'MARKET' } = req.body; // type por defecto es MARKET

        const apiKey = process.env.BINANCE_API_KEY; 
        const secret = process.env.BINANCE_SECRET_KEY; 

        if (!apiKey || !secret) {
            return res.status(500).json({ error: "Faltan claves de API de Binance. Configure variables de entorno." });
        }
        
        // Parámetros obligatorios
        if (!symbol || !side || !quantity) {
             return res.status(400).json({ error: "Faltan parámetros obligatorios: symbol, side (BUY/SELL) y quantity." });
        }

        const timestamp = Date.now();
        // Construye el query string con los parámetros de la orden
        const queryParams = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}&timestamp=${timestamp}`;

        // Generación de la Firma HMAC SHA256
        const signature = crypto
            .createHmac("sha256", secret)
            .update(queryParams)
            .digest("hex");

        const url = `https://api.binance.com/api/v3/order?${queryParams}&signature=${signature}`;

        const response = await fetch(url, {
            method: 'POST', // Es una solicitud POST
            headers: { 
                "X-MBX-APIKEY": apiKey,
                'Content-Type': 'application/x-www-form-urlencoded' // Estándar para órdenes de Binance
            },
        });

        const data = await response.json(); 

        if (response.status !== 200) {
             // Retorna el error específico de Binance (ej: "Filter failure: MIN_NOTIONAL")
             return res.status(response.status).json({ 
                 error: "Error de la API de Binance al ejecutar la orden", 
                 binance_response: data 
             });
        }
        
        res.json(data); // Retorna la confirmación de la orden
    } catch (err) {
        res.status(500).json({ error: "Error interno al procesar la orden", details: err.message });
    }
});


// 6. ✔ ENDPOINT: /binance/account (GET)
// Obtiene el estado de la cuenta (Privado)
app.get("/binance/account", async (req, res) => {
    try {
        const apiKey = process.env.BINANCE_API_KEY; 
        const secret = process.env.BINANCE_SECRET_KEY; 

        if (!apiKey || !secret) {
            return res.status(500).json({ error: "Faltan claves de API de Binance. Configure variables de entorno." });
        }

        const timestamp = Date.now();
        const query = `timestamp=${timestamp}`; 

        const signature = crypto
            .createHmac("sha256", secret)
            .update(query)
            .digest("hex");

        const url = `https://api.binance.com/api/v3/account?${query}&signature=${signature}`;

        const response = await fetch(url, {
            headers: { 
                "X-MBX-APIKEY": apiKey 
            },
        });

        const data = await response.json(); 

        if (response.status !== 200) {
             return res.status(response.status).json({ 
                 error: "Error de la API de Binance al intentar obtener la cuenta", 
                 binance_response: data 
             });
        }
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Error interno llamando a Binance Account", details: err.message });
    }
});

// --- Iniciar servidor ---
app.listen(PORT, () => {
    console.log(`Servidor de Binance corriendo en puerto ${PORT}`);
});
