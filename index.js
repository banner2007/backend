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
// CRUCIAL: Habilita CORS para permitir llamadas desde tu aplicación de Google AI Studio.
app.use(cors()); 
app.use(express.json());

// --- Rutas (Endpoints) ---

// 1. Mensaje Principal (Ruta raíz)
app.get("/", (req, res) => {
    res.json({ msg: "Backend de Arbitraje de Criptomonedas funcionando. Desarrollado para Railway." }); 
});

// 2. 🧪 ENDPOINT: /ip
// Obtiene la IP de salida (Egress IP) de Railway
// ¡USAR SOLO UNA VEZ PARA OBTENER LA IP! Luego puedes eliminar este endpoint.
app.get("/ip", async (req, res) => {
    try {
        // Llama a un servicio que devuelve la IP de quien lo llama
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
// Obtiene el servidor de tiempo de Binance (Público)
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

// 4. ✔ ENDPOINT: /binance/account
// Obtiene el estado de la cuenta (Privado) - Requiere BINANCE_API_KEY y BINANCE_SECRET_KEY
app.get("/binance/account", async (req, res) => {
    try {
        const apiKey = process.env.BINANCE_API_KEY; 
        const secret = process.env.BINANCE_SECRET_KEY; 

        if (!apiKey || !secret) {
            return res.status(500).json({ error: "Faltan claves de API de Binance. Configure variables de entorno." });
        }

        const timestamp = Date.now();
        const query = `timestamp=${timestamp}`; 

        // Generación de la Firma HMAC SHA256
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
