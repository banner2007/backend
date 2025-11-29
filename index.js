const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');
const axios = require('axios'); // Necesario para la ruta /ip

// --- 1. CONFIGURACIÓN DE ACCESO A BINANCE (Lee variables de entorno de Railway) ---
const API_KEY = process.env.BINANCE_API_KEY; 
const API_SECRET = process.env.BINANCE_API_SECRET; 

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


// --- RUTA NUEVA: Obtener la IP Pública de Salida de Railway ---
// URL de prueba: https://backend-production-228b.up.railway.app/ip
app.get('/ip', async (req, res) => {
    try {
        // Consultamos un servicio externo para obtener la IP pública
        const response = await axios.get('https://api.ipify.org?format=json');
        const ipAddress = response.data.ip;
        
        console.log('IP actual de Railway:', ipAddress);
        
        res.status(200).json({ ip: ipAddress });

    } catch (error) {
        console.error("Error al obtener la IP de Railway:", error.message);
        res.status(500).json({ 
            status: "error", 
            message: "Fallo al obtener la IP externa. Revise la conexión de red.", 
            details: error.message 
        });
    }
});


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
            symbols = JSON.parse(decodeURIComponent(req.query.symbols)).map(s => s.replace('USDT', '/USDT'));
        } else {
            return res.status(400).json({ status: "error", message: 'Falta el parámetro symbols.' });
        }
        
        const tickerPromises = symbols.map(symbol => exchange.fetchTicker(symbol));
        const tickers = await Promise.all(tickerPromises);
        
        const prices = {};
        tickers.forEach(ticker => {
            if (ticker) {
                const originalSymbol = ticker.symbol.replace('/', ''); 
                prices[originalSymbol] = { 
                    ask: ticker.ask.toFixed(4), 
                    bid: ticker.bid.toFixed(4)
                };
            }
        });

        res.status(200).json(prices);

    } catch (error) {
        console.error("Error al obtener precios de Binance:", error.message);
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
