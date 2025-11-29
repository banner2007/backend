import express from 'express';
import cors from 'cors';
import ccxt from 'ccxt';
import axios from 'axios';

// --- 1. CONFIGURACIÓN DE ACCESO A BINANCE (Lectura de variables de entorno) ---
const API_KEY = process.env.BINANCE_API_KEY; 
const API_SECRET = process.env.BINANCE_SECRET_KEY; 

// Inicialización de CCXT
let exchange = null;
let marketsLoaded = false;
let validSymbols = new Set();
// Definimos los pares base que esperamos. Esto ayuda a analizar el símbolo.
const BASE_CURRENCIES = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'EUR', 'AUD']; 

// Función para inicializar CCXT de forma segura y perezosa
const initializeExchange = () => {
    if (!exchange) {
        // En ES Modules, ccxt se importa como default.
        // Verificamos si existe directamente o dentro de 'default'.
        const ExchangeClass = ccxt.binance || (ccxt.default && ccxt.default.binance);
        
        if (!ExchangeClass) {
            console.error("No se pudo encontrar la clase Binance en el paquete ccxt.");
            return null;
        }

        exchange = new ExchangeClass({
            apiKey: API_KEY,
            secret: API_SECRET,
            // CRÍTICO: Aseguramos que se ajuste la diferencia de tiempo para evitar el error -2015.
            'options': { 
                'adjustForTimeDifference': true 
            }
        });
        console.log("CCXT inicializado de forma segura.");
    }
    return exchange;
};

// Función para cargar los mercados y validar los símbolos (Se ejecuta SOLO UNA VEZ)
const loadAndValidateMarkets = async (binance) => {
    if (!marketsLoaded) {
        console.log("Cargando mercados de Binance...");
        try {
            await binance.loadMarkets();
            // Guardamos todos los símbolos válidos en un Set
            validSymbols = new Set(Object.keys(binance.markets));
            marketsLoaded = true;
            console.log(`Mercados cargados. Total de símbolos: ${validSymbols.size}`);
        } catch (error) {
            console.error("ERROR CRÍTICO: No se pudieron cargar los mercados de Binance.", error.message);
            marketsLoaded = true; 
            validSymbols = new Set();
        }
    }
};

// Ejecutamos la carga de mercados inmediatamente al inicio
try {
    const ex = initializeExchange();
    if (ex) loadAndValidateMarkets(ex);
} catch (e) {
    console.error("Error iniciando exchange:", e);
}


// --- CONFIGURACIÓN DEL SERVIDOR ---
const PORT = process.env.PORT || 3000; 
const app = express();

// CORRECCIÓN CRÍTICA DE CORS
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
})); 

app.use(express.json());


// RUTA IP
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


// RUTA 1: Obtener Precios del Libro de Órdenes
app.get('/binance/prices', async (req, res) => {
    try {
        const binance = initializeExchange();
        if (!binance) throw new Error("Exchange no inicializado");
        
        if (!req.query.symbols) {
            return res.status(400).json({ status: "error", message: 'Falta el parámetro symbols.' });
        }
        
        if (!marketsLoaded) {
             await loadAndValidateMarkets(binance);
        }

        const rawSymbols = JSON.parse(decodeURIComponent(req.query.symbols));
        const requestSymbols = [];
        
        // Convertimos símbolos simples (BTCUSDT) a formato CCXT (BTC/USDT)
        for (const rawSymbol of rawSymbols) {
            let ccxtSymbol = rawSymbol;
            let foundBase = false;
            for (const base of BASE_CURRENCIES) {
                if (rawSymbol.endsWith(base) && rawSymbol.length > base.length) {
                    const symbol = rawSymbol.substring(0, rawSymbol.length - base.length);
                    ccxtSymbol = `${symbol}/${base}`;
                    foundBase = true;
                    break;
                }
            }

            if (foundBase && validSymbols.has(ccxtSymbol)) {
                requestSymbols.push(ccxtSymbol);
            }
        }

        if (requestSymbols.length === 0) {
             return res.status(200).json({});
        }
        
        // Optimización: Intentamos obtener tickers en paralelo o en lote si es posible
        let tickers = {};
        try {
            // fetchTickers es más eficiente si el exchange lo soporta
            tickers = await binance.fetchTickers(requestSymbols);
        } catch (e) {
            // Fallback a peticiones individuales si falla el lote
            const promises = requestSymbols.map(s => binance.fetchTicker(s).catch(err => null));
            const results = await Promise.all(promises);
            results.forEach(t => {
                if (t) tickers[t.symbol] = t;
            });
        }
        
        const prices = {};
        Object.values(tickers).forEach((ticker) => {
            if (ticker && ticker.ask && ticker.bid) {
                const originalSymbol = ticker.symbol.replace('/', ''); 
                // Devolvemos objetos ask/bid para mejor precisión
                prices[originalSymbol] = { ask: ticker.ask, bid: ticker.bid };
            }
        });

        res.status(200).json(prices);

    } catch (error) {
        console.error("Error en /binance/prices:", error.message);
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});


// RUTA 2: Obtener Saldo
app.get('/binance/account', async (req, res) => {
    try {
        const binance = initializeExchange();
        if (!binance) throw new Error("Exchange no inicializado");
        await binance.fetchTime(true);
        const balance = await binance.fetchBalance();
        
        const simplifiedBalances = Object.keys(balance.total).map(asset => ({
            asset: asset,
            free: balance.free[asset] || 0,
            locked: balance.used[asset] || 0
        })).filter(b => b.free > 0 || b.locked > 0);
        
        res.status(200).json({ balances: simplifiedBalances });

    } catch (error) {
        console.error("Error cuenta:", error.message);
        res.status(401).json({ status: "error", message: error.message });
    }
});


// RUTA 3: EJECUTAR ORDEN (NUEVA)
app.post('/binance/order', async (req, res) => {
    try {
        const binance = initializeExchange();
        if (!binance) throw new Error("Exchange no inicializado");
        const { symbol, side, quantity } = req.body;

        if (!symbol || !side || !quantity) {
             return res.status(400).json({ status: "error", message: "Faltan parámetros: symbol, side, quantity" });
        }

        // Convertir symbol de BTCUSDT a BTC/USDT para CCXT
        let ccxtSymbol = symbol;
        for (const base of BASE_CURRENCIES) {
            if (symbol.endsWith(base) && symbol.length > base.length) {
                const s = symbol.substring(0, symbol.length - base.length);
                ccxtSymbol = `${s}/${base}`;
                break;
            }
        }
        
        if (!validSymbols.has(ccxtSymbol)) {
            // Intentar recargar mercados por si es un par nuevo
            await loadAndValidateMarkets(binance);
        }

        console.log(`Ejecutando orden: ${side} ${quantity} ${ccxtSymbol}`);

        // Tipo 'market' para ejecución inmediata
        // params vacíos {}
        const order = await binance.createOrder(ccxtSymbol, 'market', side.toLowerCase(), quantity);
        
        res.status(200).json({
            status: "success",
            message: "Orden ejecutada exitosamente",
            orderId: order.id,
            executedQty: order.filled,
            price: order.average || order.price,
            details: order
        });

    } catch (error) {
        console.error("Error en /binance/order:", error.message);
        res.status(500).json({ status: "error", message: error.message });
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
