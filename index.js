const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');
const axios = require('axios'); 

// --- 1. CONFIGURACIÓN DE ACCESO A BINANCE (Lectura de variables de entorno) ---
// La clave pública
const API_KEY = process.env.BINANCE_API_KEY; 
// La clave secreta, usando el nombre corregido: BINANCE_SECRET_KEY
const API_SECRET = process.env.BINANCE_SECRET_KEY; 

// --- INICIALIZACIÓN DE CCXT ---
const exchange = new ccxt.binance({
    apiKey: API_KEY,
    secret: API_SECRET,
    // CRÍTICO: Aseguramos que se ajuste la diferencia de tiempo para evitar el error -2015
    'options': { 
        'adjustForTimeDifference': true 
    }
});

// --- CONFIGURACIÓN DEL SERVIDOR ---
const PORT = process.env.PORT || 3000; 
const app = express();
app.use(cors()); 
app.use(express.json());


// --- RUTA DIAGNÓSTICO DE CONFIGURACIÓN ---
app.get('/config', (req, res) => {
    // Solo mostramos el primer y último carácter por seguridad
    const keyStatus = API_KEY ? 
        `BINANCE_API_KEY leído: ${API_KEY.substring(0, 1)}...${API_KEY.slice(-1)}` : 
        "ERROR: BINANCE_API_KEY no encontrado.";
        
    const secretStatus = API_SECRET ? 
        `BINANCE_SECRET_KEY leído: ${API_SECRET.substring(0, 1)}...${API_SECRET.slice(-1)}` : 
        "ERROR: BINANCE_SECRET_KEY no encontrado.";
        
    const ccxtConfigured = (API_KEY && API_SECRET);
    
    res.status(200).json({
        status: "DIAGNÓSTICO DE CONFIGURACIÓN",
        key: keyStatus,
        secret: secretStatus,
        ccxtReady: ccxtConfigured,
        instructions: "Si ambas claves dicen 'leído', el problema es la IP o la caducidad de la clave."
    });
});


// RUTA IP: Obtener la IP Pública de Salida de Railway
app.get('/ip', async (req, res) => {
    try {
        // Consultamos un servicio externo para obtener la IP pública
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
        if (req.query.symbols) {
            symbols = JSON.parse(decodeURIComponent(req.query.symbols)).map(s => s.replace('USDT', '/USDT'));
        } else {
            return res.status(400).json({ status: "error", message: 'Falta el parámetro symbols.' });
        }
        
        // Carga los mercados antes de buscar tickers
        if (exchange.markets === undefined || Object.keys(exchange.markets).length === 0) {
            await exchange.loadMarkets();
        }
        
        const tickerPromises = symbols.map(symbol => exchange.fetchTicker(symbol));
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
        // CRÍTICO: Forzamos sincronización de tiempo ANTES de la llamada autenticada
        await exchange.fetchTime(true);

        const balance = await exchange.fetchBalance();
        
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
