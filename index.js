const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');

// --- 1. CONFIGURACIÓN DE ACCESO A BINANCE (Lee variables de entorno de Railway) ---
// Las variables de entorno en Railway deben llamarse BINANCE_API_KEY y BINANCE_API_SECRET.
const API_KEY = process.env.BINANCE_API_KEY; 
const API_SECRET = process.env.BINANCE_API_SECRET; 

// Crear instancia del exchange. ccxt detectará automáticamente si las claves son válidas.
const exchange = new ccxt.binance({
    apiKey: API_KEY,
    secret: API_SECRET,
    // La zona horaria es crítica para la firma de requests.
    'options': { 'adjustForTimeDifference': true }
});

// --- CONFIGURACIÓN DEL SERVIDOR ---
const PORT = process.env.PORT || 3000; 
const app = express();
app.use(cors()); 
app.use(express.json());


// RUTA BASE: Funciona como chequeo de salud
app.get('/', (req, res) => {
    res.send('✅ Servidor de Arbitraje en Railway funcionando. Conectado a Binance.');
});


// RUTA 1: Obtener Precios del Libro de Órdenes (bid/ask)
// URL de prueba: /binance/prices?symbols=["BTCUSDT","ETHUSDT"]
app.get('/binance/prices', async (req, res) => {
    let symbols = [];
    try {
        if (req.query.symbols) {
            // ccxt usa el formato "BTC/USDT", por eso mapeamos el formato del frontend ("BTCUSDT")
            symbols = JSON.parse(decodeURIComponent(req.query.symbols)).map(s => s.replace('USDT', '/USDT'));
        } else {
            return res.status(400).json({ status: "error", message: 'Falta el parámetro symbols.' });
        }
        
        // Cargar todos los tickers al mismo tiempo (mejor rendimiento)
        const tickerPromises = symbols.map(symbol => exchange.fetchTicker(symbol));
        const tickers = await Promise.all(tickerPromises);
        
        const prices = {};
        tickers.forEach(ticker => {
            if (ticker) {
                // Mapear de vuelta al formato "BTCUSDT" que espera el frontend
                const originalSymbol = ticker.symbol.replace('/', ''); 
                prices[originalSymbol] = { 
                    ask: ticker.ask.toFixed(4), // Mejor precio de venta
                    bid: ticker.bid.toFixed(4)  // Mejor precio de compra
                };
            }
        });

        res.status(200).json(prices);

    } catch (error) {
        console.error("Error al obtener precios de Binance:", error.message);
        // Devolvemos un 500 para diagnosticar problemas de conexión/IP
        res.status(500).json({ 
            status: "error", 
            message: "Fallo al obtener precios. Revise Whitelisting de IP en Binance o el estado del exchange.", 
            details: error.message 
        });
    }
});


// RUTA 2: Obtener Saldo de la Cuenta (Requiere Autenticación)
// URL de prueba: /binance/account
app.get('/binance/account', async (req, res) => {
    try {
        // fetchBalance es una llamada autenticada
        const balance = await exchange.fetchBalance();
        
        // Simplificar balances para el frontend (solo activos con saldo mayor a cero)
        const simplifiedBalances = Object.keys(balance.total).map(asset => ({
            asset: asset,
            free: balance.free[asset] ? balance.free[asset].toFixed(4) : "0.0000",
            locked: balance.used[asset] ? balance.used[asset].toFixed(4) : "0.0000"
        })).filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
        
        // Estructura de respuesta para el frontend
        const accountData = {
            makerCommission: 10, // Tasa de comisión (0.1%) - Simulado, Binance no la da fácilmente
            takerCommission: 10,
            balances: simplifiedBalances
        };

        res.status(200).json(accountData);

    } catch (error) {
        console.error("Error al obtener datos de cuenta de Binance:", error.message);
        // Si hay un error de autenticación (IP, clave incorrecta), devolvemos un 401
        res.status(401).json({ 
            status: "error", 
            message: "Fallo de autenticación o rechazo por IP. ¿Son correctas las claves? ¿Ha deshabilitado la Whitelisting de IP en Binance?", 
            details: error.message 
        });
    }
});


// MANEJO DE RUTA NO ENCONTRADA (404)
app.use((req, res, next) => {
    res.status(404).send({
        status: "error",
        code: 404,
        message: `No se encuentra la ruta: ${req.originalUrl}`
    });
});


// INICIAR EL SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en el puerto ${PORT}`);
});
