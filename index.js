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
let validSymbols = new Set();
// Definimos los pares base que esperamos. Esto ayuda a analizar el símbolo.
const BASE_CURRENCIES = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'EUR', 'AUD']; 

// Función para inicializar CCXT de forma segura y perezosa
const initializeExchange = () => {
    if (!exchange) {
        exchange = new ccxt.binance({
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
const loadAndValidateMarkets = async () => {
    if (!marketsLoaded) {
        const binance = initializeExchange();
        console.log("Cargando mercados de Binance...");
        try {
            await binance.loadMarkets();
            // Guardamos todos los símbolos válidos en un Set
            validSymbols = new Set(Object.keys(binance.markets));
            marketsLoaded = true;
            console.log(`Mercados cargados. Total de símbolos: ${validSymbols.size}`);
        } catch (error) {
            console.error("ERROR CRÍTICO: No se pudieron cargar los mercados de Binance. Esto podría causar fallos en /binance/prices.", error.message);
            marketsLoaded = true; 
            validSymbols = new Set();
        }
    }
};

// CRÍTICO: Llamamos a la función asíncrona directamente al inicio para que el proceso Node.js no se bloquee.
loadAndValidateMarkets();


// --- CONFIGURACIÓN DEL SERVIDOR ---
const PORT = process.env.PORT || 3000; 
const app = express();

// CORRECCIÓN CRÍTICA DE CORS: Permite todas las peticiones desde cualquier origen ('*')
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
})); 

app.use(express.json());


// RUTA IP: Obtener la IP Pública de Salida de Railway
// Ruta CRUCIAL para la Whitelist de IP de Binance.
app.get('/ip', async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        res.status(200).json({ ip: response.data.ip });
    } catch (error) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        res.status(500).json({ 
            status: "error", 
            message: "Fallo al obtener la IP externa. Intente revisar la IP de la cabecera: " + clientIp,
            details: error.message
        });
    }
});


// RUTA BASE
app.get('/', (req, res) => {
    res.send('✅ Servidor de Arbitraje en Railway funcionando. Conectado a Binance.');
});


// RUTA 1: Obtener Precios del Libro de Órdenes (bid/ask)
app.get('/binance/prices', async (req, res) => {
    try {
        const binance = initializeExchange();
        
        if (!req.query.symbols) {
            return res.status(400).json({ status: "error", message: 'Falta el parámetro symbols. Formato esperado: ?symbols=["BTCUSDT","ETHBTC"]' });
        }
        
        if (!marketsLoaded) {
             console.warn("Mercados aún no cargados. Esperando...");
             await loadAndValidateMarkets();
        }

        const rawSymbols = JSON.parse(decodeURIComponent(req.query.symbols));
        
        const requestSymbols = [];
        
        // PROCESAMIENTO DE SÍMBOLOS
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

            if (!foundBase) {
                 console.warn(`Símbolo omitido (base de trading desconocido, no termina en ${BASE_CURRENCIES.join('/')}): ${rawSymbol}`);
                 continue;
            }
            
            if (validSymbols.has(ccxtSymbol)) {
                requestSymbols.push(ccxtSymbol);
            } else {
                console.warn(`Símbolo omitido (inválido o no listado en Binance): ${rawSymbol} (CCXT: ${ccxtSymbol})`);
            }
        }

        if (requestSymbols.length === 0) {
             return res.status(200).json({ status: "warning", message: "Ninguno de los símbolos solicitados era válido. Revise el array de su frontend.", prices: {} });
        }
        
        const tickerPromises = requestSymbols.map(symbol => binance.fetchTicker(symbol));
        const tickers = await Promise.all(tickerPromises);
        
        const prices = {};
        tickers.forEach(ticker => {
            if (ticker && ticker.ask && ticker.bid) {
                const originalSymbol = ticker.symbol.replace('/', ''); 
                prices[originalSymbol] = { ask: ticker.ask.toFixed(4), bid: ticker.bid.toFixed(4) };
            }
        });

        res.status(200).json(prices);

    } catch (error) {
        console.error("Error en /binance/prices:", error.message);
        res.status(500).json({ 
            status: "error", 
            message: "Fallo al procesar la solicitud de precios. Verifique la sintaxis del JSON.", 
            details: error.message 
        });
    }
});


// RUTA 2: Obtener Saldo de la Cuenta (Requiere Autenticación)
app.get('/binance/account', async (req, res) => {
    try {
        const binance = initializeExchange();

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
        console.error("Error al obtener datos de cuenta de Binance:", error.message);
        res.status(401).json({ 
            status: "error", 
            message: "Fallo de autenticación o rechazo por IP. ¿Son correctas las claves? ¿Ha deshabilitado la Whitelisting de IP en Binance?", 
            details: error.message 
        });
    }
});


// RUTA 3: Colocar una Orden (Requiere Autenticación y datos de orden)
app.post('/binance/order', async (req, res) => {
    try {
        const binance = initializeExchange();

        await binance.fetchTime(true); // Sincroniza tiempo antes de la llamada autenticada

        const { symbol, type, side, amount, price } = req.body;

        if (!symbol || !type || !side || !amount) {
             return res.status(400).json({ 
                status: "error", 
                message: "Faltan parámetros: symbol, type, side, y amount son obligatorios." 
            });
        }
        
        // 1. Convertir el símbolo de frontend (ej. BTCUSDT) al formato CCXT (ej. BTC/USDT)
        let ccxtSymbol = symbol;
        let foundBase = false;
        for (const base of BASE_CURRENCIES) {
            if (symbol.endsWith(base) && symbol.length > base.length) {
                const baseSymbol = symbol.substring(0, symbol.length - base.length);
                ccxtSymbol = `${baseSymbol}/${base}`;
                foundBase = true;
                break;
            }
        }

        if (!foundBase) {
             return res.status(400).json({ 
                status: "error", 
                message: "El formato del símbolo es inválido o no soportado (debe terminar en USDT, BTC, ETH, etc.)." 
            });
        }

        // 2. Colocar la orden
        let order;
        
        // El precio es opcional para órdenes de mercado ('market')
        if (type.toLowerCase() === 'limit' && !price) {
             return res.status(400).json({ 
                status: "error", 
                message: "El tipo de orden 'limit' requiere el parámetro 'price'." 
            });
        }
        
        // ccxt.createOrder(symbol, type, side, amount, price, params)
        if (type.toLowerCase() === 'market') {
            // Orden de mercado: no requiere precio
            order = await binance.createOrder(ccxtSymbol, type, side, amount);
        } else if (type.toLowerCase() === 'limit') {
            // Orden limitada: requiere precio
            order = await binance.createOrder(ccxtSymbol, type, side, amount, price);
        } else {
             return res.status(400).json({ 
                status: "error", 
                message: "Tipo de orden no válido. Use 'market' o 'limit'." 
            });
        }

        // 3. Respuesta exitosa
        res.status(200).json({ 
            status: "success", 
            message: `Orden de ${side} de ${amount} ${ccxtSymbol} colocada exitosamente.`,
            order: order 
        });

    } catch (error) {
        console.error("Error al colocar orden en Binance:", error.message);
        // CCXT suele devolver errores detallados de la API (ej. saldo insuficiente, precio fuera de banda)
        res.status(500).json({ 
            status: "error", 
            message: "Fallo al ejecutar la orden en Binance. Revise las claves API, la Whitelist de IP y los límites de trading.", 
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
