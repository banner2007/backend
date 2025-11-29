// index.js (Su servidor de Railway)
const express = require('express');
const cors = require('cors');

// La mayoría de los servicios de alojamiento usan la variable de entorno PORT
const PORT = process.env.PORT || 3000; 

const app = express();

// Configurar CORS para permitir que su frontend se conecte (MUY IMPORTANTE)
// Esto permite peticiones desde cualquier origen ('*')
app.use(cors()); 

// Middleware para que Express pueda leer JSON (si fuera necesario para POST, aunque GET no lo necesita)
app.use(express.json());


// --- 1. RUTA DE DIAGNÓSTICO (RUTA BASE) ---
// Útil para confirmar que el servidor está funcionando
app.get('/', (req, res) => {
    res.send('✅ Servidor de Arbitraje en Railway funcionando.');
});


// --- 2. RUTA REQUERIDA POR EL FRONTEND (PRUEBA 1) ---
// Endpoint para obtener precios (Su frontend llama a esta ruta)
app.get('/binance/prices', (req, res) => {
    // Nota: Aquí es donde usted debe integrar la lógica real para llamar a la API de Binance.
    // Para esta prueba, devolvemos una respuesta simulada 200 OK.
    const symbol = req.query.symbols ? JSON.parse(req.query.symbols) : ['BTCUSDT'];
    
    // El frontend espera esta estructura de datos:
    const mockPrices = {};
    symbol.forEach(s => {
        mockPrices[s] = { ask: "60000.00", bid: "59999.50" };
    });
    
    res.status(200).json(mockPrices);
});


// --- 3. RUTA REQUERIDA POR EL FRONTEND (PRUEBA 2) ---
// Endpoint para obtener el saldo de la cuenta (Su frontend llama a esta ruta)
app.get('/binance/account', (req, res) => {
    // Nota: Aquí es donde usted debe integrar la lógica real para obtener el saldo.
    // Para esta prueba, devolvemos una respuesta simulada 200 OK.
    
    // El frontend espera esta estructura de datos:
    const mockAccount = {
        makerCommission: 10,
        takerCommission: 10,
        balances: [
            { asset: "USDT", free: "1000.00", locked: "0.00" },
            { asset: "BTC", free: "0.00", locked: "0.00" }
        ]
    };
    
    res.status(200).json(mockAccount);
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});
