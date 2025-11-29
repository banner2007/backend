// index.js - Servidor Backend para Railway
// Usamos importaciones dinámicas para evitar que este código rompa el frontend en la vista previa.

const startServer = async () => {
    // 1. Verificación de Entorno: Si no es Node.js, detenemos la ejecución.
    // Esto previene errores "Uncaught TypeError" o "require not defined" en el navegador.
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
        console.warn("⚠️ index.js es un archivo de Backend y no debe ejecutarse en el navegador. Saltando ejecución.");
        return;
    }

    try {
        console.log("Iniciando Servidor Backend...");

        // 2. Importaciones Dinámicas (Solo se cargan en Node.js)
        // Esto evita que el navegador intente cargar 'express' o 'ccxt' al inicio.
        const expressModule = await import('express');
        const corsModule = await import('cors');
        const ccxtModule = await import('ccxt');
        const axiosModule = await import('axios');

        const express = expressModule.default || expressModule;
        const cors = corsModule.default || corsModule;
        const ccxt = ccxtModule.default || ccxtModule;
        const axios = axiosModule.default || axiosModule;

        // --- CONFIGURACIÓN ---
        const API_KEY = process.env.BINANCE_API_KEY; 
        const API_SECRET = process.env.BINANCE_SECRET_KEY; 
        const PORT = process.env.PORT || 3000; 

        // --- INICIALIZACIÓN CCXT ---
        let exchange = null;
        let marketsLoaded = false;
        let validSymbols = new Set();
        const BASE_CURRENCIES = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'EUR', 'AUD']; 

        const initializeExchange = () => {
            if (!exchange) {
                // Lógica robusta para encontrar la clase Binance en diferentes versiones de ccxt
                const ExchangeClass = ccxt.binance || (ccxt.default && ccxt.default.binance);
                
                if (!ExchangeClass) {
                    console.error("No se pudo encontrar la clase Binance en ccxt.");
                    return null;
                }

                exchange = new ExchangeClass({
                    apiKey: API_KEY,
                    secret: API_SECRET,
                    'options': { 'adjustForTimeDifference': true }
                });
                console.log("✅ CCXT inicializado correctamente.");
            }
            return exchange;
        };

        const loadAndValidateMarkets = async (binance) => {
            if (!marketsLoaded) {
                console.log("Cargando mercados de Binance...");
                try {
                    await binance.loadMarkets();
                    validSymbols = new Set(Object.keys(binance.markets));
                    marketsLoaded = true;
                    console.log(`Mercados cargados. Total de símbolos: ${validSymbols.size}`);
                } catch (error) {
                    console.error("⚠️ Error cargando mercados:", error.message);
                    // No bloqueamos, reintentaremos luego si es necesario
                    marketsLoaded = true; 
                }
            }
        };

        // Inicialización temprana
        const ex = initializeExchange();
        if (ex) loadAndValidateMarkets(ex).catch(e => console.error(e));

        // --- APP EXPRESS ---
        const app = express();

        app.use(cors({
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            preflightContinue: false,
            optionsSuccessStatus: 204
        })); 

        app.use(express.json());

        // RUTAS
        app.get('/ip', async (req, res) => {
            try {
                const response = await axios.get('https://api.ipify.org?format=json');
                res.status(200).json({ ip: response.data.ip });
            } catch (error) {
                res.status(500).json({ status: "error", message: "Fallo al obtener IP." });
            }
        });

        app.get('/', (req, res) => {
            res.send('✅ Servidor de Arbitraje en Railway funcionando (ESM).');
        });

        // RUTA 1: Precios
        app.get('/binance/prices', async (req, res) => {
            try {
                const binance = initializeExchange();
                if (!binance) throw new Error("Exchange no inicializado");
                
                if (!req.query.symbols) {
                    return res.status(400).json({ status: "error", message: 'Falta symbols.' });
                }
                
                if (!marketsLoaded) await loadAndValidateMarkets(binance);

                const rawSymbols = JSON.parse(decodeURIComponent(req.query.symbols));
                const requestSymbols = [];
                
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

                if (requestSymbols.length === 0) return res.status(200).json({});
                
                let tickers = {};
                try {
                    tickers = await binance.fetchTickers(requestSymbols);
                } catch (e) {
                    const promises = requestSymbols.map(s => binance.fetchTicker(s).catch(err => null));
                    const results = await Promise.all(promises);
                    results.forEach(t => { if (t) tickers[t.symbol] = t; });
                }
                
                const prices = {};
                Object.values(tickers).forEach((ticker) => {
                    if (ticker && (ticker.ask || ticker.last)) {
                        const originalSymbol = ticker.symbol.replace('/', ''); 
                        prices[originalSymbol] = { ask: ticker.ask, bid: ticker.bid, last: ticker.last };
                    }
                });

                res.status(200).json(prices);
            } catch (error) {
                console.error("Error /prices:", error.message);
                res.status(500).json({ status: "error", message: error.message });
            }
        });

        // RUTA 2: Saldo
        app.get('/binance/account', async (req, res) => {
            try {
                const binance = initializeExchange();
                if (!binance) throw new Error("Exchange no inicializado");
                
                // await binance.fetchTime(true); // Opcional si hay problemas de sync
                const balance = await binance.fetchBalance();
                
                const simplifiedBalances = Object.keys(balance.total).map(asset => ({
                    asset: asset,
                    free: balance.free[asset] || 0,
                    locked: balance.used[asset] || 0
                })).filter(b => b.free > 0 || b.locked > 0);
                
                res.status(200).json({ balances: simplifiedBalances });
            } catch (error) {
                console.error("Error /account:", error.message);
                res.status(401).json({ status: "error", message: error.message });
            }
        });

        // RUTA 3: Orden
        app.post('/binance/order', async (req, res) => {
            try {
                const binance = initializeExchange();
                if (!binance) throw new Error("Exchange no inicializado");
                const { symbol, side, quantity } = req.body;

                if (!symbol || !side || !quantity) return res.status(400).json({ error: "Faltan parámetros" });

                let ccxtSymbol = symbol;
                for (const base of BASE_CURRENCIES) {
                    if (symbol.endsWith(base)) {
                        const s = symbol.substring(0, symbol.length - base.length);
                        ccxtSymbol = `${s}/${base}`;
                        break;
                    }
                }
                
                if (!validSymbols.has(ccxtSymbol)) await loadAndValidateMarkets(binance);

                console.log(`Orden: ${side} ${quantity} ${ccxtSymbol}`);
                const order = await binance.createOrder(ccxtSymbol, 'market', side.toLowerCase(), quantity);
                
                res.status(200).json({
                    status: "success",
                    orderId: order.id,
                    executedQty: order.filled,
                    price: order.average || order.price
                });
            } catch (error) {
                console.error("Error /order:", error.message);
                res.status(500).json({ status: "error", message: error.message });
            }
        });

        app.listen(PORT, () => {
            console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
        });

    } catch (err) {
        console.error("❌ Error fatal iniciando servidor:", err);
    }
};

// Ejecutar servidor
startServer();
