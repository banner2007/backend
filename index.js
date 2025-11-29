const express = require('express');
const cors = require('cors');
const path = require('path');

// --- 1. CONFIGURACIÓN DEL PUERTO (CRÍTICO PARA RAILWAY) ---
// Railway asigna un puerto a través de process.env.PORT
// Usamos 3000 como fallback local para desarrollo.
const PORT = process.env.PORT || 3000; 

const app = express();

// --- 2. MIDDLEWARES ---
// Configurar CORS para permitir que el frontend se conecte (MUY IMPORTANTE)
app.use(cors()); 

// Middleware para que Express pueda leer JSON en el cuerpo de las peticiones
app.use(express.json());


// --- 3. RUTAS DE DIAGNÓSTICO Y FUNCIONALES ---

// RUTA BASE: Útil para confirmar que el servidor está funcionando
app.get('/', (req, res) => {
    console.log('Ruta / llamada.');
    res.send('✅ Servidor de Arbitraje en Railway funcionando. Rutas principales: /binance/prices y /binance/account.');
});


// RUTA 1: Endpoint para obtener precios (Ejemplo con datos simulados)
// URL de prueba: /binance/prices?symbols=["BTCUSDT","ETHUSDT"]
app.get('/binance/prices', (req, res) => {
    console.log('Ruta /binance/prices llamada.');

    let symbols = [];
    try {
        // Parsear los símbolos del query string (ej: symbols=["BTCUSDT","ETHUSDT"])
        if (req.query.symbols) {
            symbols = JSON.parse(decodeURIComponent(req.query.symbols));
        }
    } catch (e) {
        console.error('Error al parsear símbolos:', e);
        // Devolver un error 400 si el formato es incorrecto
        return res.status(400).json({ status: "error", message: 'Formato de símbolos inválido.' });
    }

    if (symbols.length === 0) {
        symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']; // Valores predeterminados para simulación
    }
    
    // --- LÓGICA SIMULADA (REEMPLAZAR CON LA LLAMADA A BINANCE) ---
    const mockPrices = {};
    symbols.forEach((s, index) => {
        // Generación de precios de ejemplo
        const basePrice = 60000 + (index * 1000); 
        const ask = (basePrice + 0.50 + Math.random()).toFixed(2);
        const bid = (basePrice - 0.50 - Math.random()).toFixed(2);
        
        mockPrices[s] = { ask: ask, bid: bid };
    });
    // --- FIN DE LÓGICA SIMULADA ---
    
    // Enviamos el mock con status 200 OK
    res.status(200).json(mockPrices);
});


// RUTA 2: Endpoint para obtener el saldo (Ejemplo con datos simulados)
// URL de prueba: /binance/account
app.get('/binance/account', (req, res) => {
    console.log('Ruta /binance/account llamada.');
    
    // --- LÓGICA SIMULADA (REEMPLAZAR CON LA LLAMADA A BINANCE) ---
    const mockAccount = {
        makerCommission: 10,
        takerCommission: 10,
        balances: [
            { asset: "USDT", free: "1000.00", locked: "0.00" },
            { asset: "BTC", free: "0.005", locked: "0.00" },
            { asset: "ETH", free: "0.1", locked: "0.00" }
        ]
    };
    // --- FIN DE LÓGICA SIMULADA ---

    res.status(200).json(mockAccount);
});


// --- 4. MANEJO DE RUTA NO ENCONTRADA (Catch-all para 404) ---
app.use((req, res, next) => {
    res.status(404).send({
        status: "error",
        code: 404,
        message: `No se encuentra la ruta: ${req.originalUrl}`
    });
});


// --- 5. INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en el puerto ${PORT}`);
});
