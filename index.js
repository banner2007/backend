const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');
const axios = require('axios'); 

// --- 1. CONFIGURACIÓN DE ACCESO A BINANCE (Lectura de variables de entorno) ---
const API_KEY = process.env.BINANCE_API_KEY; 
const API_SECRET = process.env.BINANCE_SECRET_KEY; 

// Inicialización de CCXT
let exchange;
let marketsLoaded = false;

// Función para inicializar CCXT de forma segura y perezosa (solo cuando se necesite)
const initializeExchange = () => {
    if (!exchange) {
        exchange = new ccxt.binance({
            apiKey: API_KEY,
            secret: API_SECRET,
            // CRÍTICO: Aseguramos que se ajuste la diferencia de tiempo
            'options': { 
                'adjustForTimeDifference': true 
            }
        });
        console.log("CCXT inicializado de forma segura.");
    }
    return exchange;
};

// --- CONFIGURACIÓN DEL SERVIDOR ---
const PORT = process.env.PORT || 3000; 
const app = express();
app.use(cors()); 
app.use(express.json());


// RUTA IP: Obtener la IP Pública de Salida de Railway
app.get('/ip', async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        res.status(200).json({ ip: response.data.ip });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Fallo al obtener la IP externa." });
    }
});


// RUTA BASE
app.get('/', (req, res) => {
    res.send('✅ Servidor de Arbitraje en Railway funcionando. Conectado a Binance.');
});


// RUTA 1: Obtener Precios del Libro de Órdenes (bid/ask) - No necesita autenticación
app.get('/binance/prices', async (req, res) => {
    let symbols = [];
    try {
        const binance = initializeExchange();

        if (req.query.symbols) {
            symbols = JSON.parse(decodeURIComponent(req.query.symbols)).map(s => s.replace('USDT', '/USDT'));
        } else {
            return res.status(400).json({ status: "error", message: 'Falta el parámetro symbols.' });
        }
        
        // Carga los mercados una sola vez
        if (!marketsLoaded) {
            await binance.loadMarkets();
            marketsLoaded = true;
        }
        
        const tickerPromises = symbols.map(symbol => binance.fetchTicker(symbol));
        const tickers = await Promise.all(tickerPromises);
        
        const prices = {};
        tickers.forEach(ticker => {
            if (ticker) {
                const originalSymbol = ticker.symbol.replace('/', ''); 
                prices[originalSymbol] = { ask: ticker.ask.toFixed(4), bid: ticker.bid.toFixed(4) };
            }
        });

        res.status(200).json(prices);

    } catch (error) {
        // Manejo de error para llamadas públicas que fallan
        console.error("Error al obtener precios de Binance (PÚBLICO):", error.message);
        res.status(500).json({ 
            status: "error", 
            message: "Fallo al obtener precios. La Key/IP está causando rechazo incluso en llamadas públicas.", 
            details: error.message 
        });
    }
});


// RUTA 2: Obtener Saldo de la Cuenta (Requiere Autenticación)
app.get('/binance/account', async (req, res) => {
    try {
        const binance = initializeExchange();

        // CRÍTICO: Forzamos sincronización de tiempo ANTES de la llamada autenticada
        await binance.fetchTime(true);

        const balance = await binance.fetchBalance();
        
        const simplifiedBalances = Object.keys(balance.total).map(asset => ({
            asset: asset,
            free: balance.free[asset] ? balance.free[asset].toFixed(4) : "0.0000",
            locked: balance.used[asset] ? balance.used[asset].toFixed(4) : "0.0000"
        })).filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
        
        const accountData = {
            makerCommission: 10,
            takerCommission: 10,
            balances: simplifiedBalances
        };

        res.status(200).json(accountData);

    } catch (error) {
        // ERROR: FALLO DE AUTENTICACIÓN
        console.error("Error al obtener datos de cuenta de Binance:", error.message);
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
