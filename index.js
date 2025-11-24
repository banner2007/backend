import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import cors from "cors"; // Importamos la dependencia de CORS
import dotenv from "dotenv"; // Importamos dotenv para cargar variables localmente

// Cargar variables de entorno si existe un archivo .env (solo para desarrollo local)
dotenv.config(); 

const app = express();
// Railway ya proporciona la variable PORT, si no existe usa 3000
const PORT = process.env.PORT || 3000; 

// --- Configuración de Middleware ---

// 1. Habilitar CORS: Es CRUCIAL para que tu aplicación externa pueda llamar a este backend.
// Se puede configurar para que acepte peticiones de cualquier origen (*) o solo del dominio de tu app.
app.use(cors()); 
app.use(express.json()); // Permite que el servidor pueda leer cuerpos de solicitud JSON

// --- Rutas (Endpoints) ---

// Mensaje principal (Ruta raíz)
app.get("/", (req, res) => {
    // Cambiamos el mensaje para que refleje el despliegue en Railway
    res.json({ msg: "Backend de Arbitraje de Criptomonedas funcionando. Desarrollado para Railway." }); 
});

//
// ✔ ENDPOINT: /binance/time
// Obtiene el servidor de tiempo de Binance (Público)
//
app.get("/binance/time", async (req, res) => {
    try {
        const response = await fetch("https://api.binance.com/api/v3/time");
        if (!response.ok) {
            throw new Error(`Error en la API de Binance: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        // Mejor manejo del error
        res.status(500).json({ error: "Error obteniendo el tiempo de Binance", details: err.message }); 
    }
});

//
// ✔ ENDPOINT: /binance/account
// Obtiene el estado de la cuenta (Privado)
//
app.get("/binance/account", async (req, res) => {
    try {
        // Usamos las variables de entorno configuradas en Railway
        const apiKey = process.env.BINANCE_API_KEY; 
        const secret = process.env.BINANCE_SECRET_KEY; // Usamos la variable consistente

        if (!apiKey || !secret) {
            return res.status(500).json({ error: "Faltan claves de API de Binance. Configure BINANCE_API_KEY y BINANCE_SECRET_KEY en Railway." });
        }

        const timestamp = Date.now();
        // Construcción del Query String para la firma
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

        // Manejo de posibles errores de la API de Binance (ej: firma inválida, etc.)
        const data = await response.json(); 

        if (response.status !== 200) {
             // Binance devuelve un error con campos como 'code' y 'msg'
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

//
// ✔ Iniciar servidor
//
app.listen(PORT, () => {
    console.log(`Servidor de Binance corriendo en puerto ${PORT}`);
});
