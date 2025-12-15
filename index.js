// index.js - Servidor Backend para Railway (EXTENDIDO)

const startServer = async () => {
    // Protección para ambientes que no son Node.js
    if (typeof process === 'undefined' || !process.versions?.node) return;

    try {
        console.log("🚀 Iniciando Servidor Backend...");

        const express = (await import('express')).default;
        const cors = (await import('cors')).default;
        const ccxt = (await import('ccxt')).default;
        const axios = (await import('axios')).default;

        const API_KEY = process.env.BINANCE_API_KEY;
        const API_SECRET = process.env.BINANCE_SECRET_KEY;
        const PORT = process.env.PORT || 3000;

        let exchange;
        let marketsLoaded = false;
        let validSymbols = new Set();

        const initExchange = () => {
            if (!exchange) {
                exchange = new ccxt.binance({
                    apiKey: API_KEY,
                    secret: API_SECRET,
                    enableRateLimit: true,
                    options: { adjustForTimeDifference: true }
                });
                console.log("✅ CCXT Binance inicializado");
            }
            return exchange;
        };

        const loadMarkets = async () => {
            if (!marketsLoaded) {
                // Se usa try/catch aquí para manejar fallos de conexión o API key al cargar mercados
                try {
                    await exchange.loadMarkets();
                    validSymbols = new Set(Object.keys(exchange.markets));
                    marketsLoaded = true;
                    console.log(`📦 Mercados cargados: ${validSymbols.size}`);
                } catch (error) {
                    console.error("❌ ERROR CRÍTICO al cargar mercados:", error.message);
                    // Si falla, relanzamos el error para que el 'catch' principal lo detenga
                    throw new Error("Fallo en la carga inicial de mercados o credenciales de Binance.");
                }
            }
        };

        // ===============================================
        // PUNTO CLAVE CORREGIDO: INICIALIZACIÓN ASÍNCRONA
        // ===============================================
        initExchange();
        
        // Esperamos la carga de mercados ANTES de iniciar el servidor
        // para asegurarnos que 'validSymbols' esté listo y que la conexión sea válida.
        // Si loadMarkets falla, el 'catch' de abajo capturará el error y terminará el proceso.
        await loadMarkets(); 
        
        // ===============================================
        // CONTINUACIÓN DEL CÓDIGO (Sin cambios en las rutas)
        // ===============================================

        const app = express();
        app.use(cors({ origin: '*' }));
        app.use(express.json());

        /* ================= BASICOS ================= */

        app.get('/', (_, res) => res.send('✅ Backend Railway OK'));

        app.get('/ip', async (_, res) => {
            try {
                const r = await axios.get('https://api.ipify.org?format=json');
                res.json(r.data);
            } catch (error) {
                 res.status(500).json({ error: "Fallo al obtener IP externa", details: error.message });
            }
        });

        /* ================= BINANCE PUBLICOS ================= */

        app.get('/binance/time', async (_, res) => {
            try {
                const t = await exchange.fetchTime();
                res.json({ serverTime: t });
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener tiempo de Binance", details: error.message });
            }
        });
        
        // ... (otras rutas públicas sin cambios) ...
        
        app.get('/binance/markets', async (_, res) => {
            await loadMarkets();
            res.json([...validSymbols]);
        });

        app.get('/binance/ticker/:symbol', async (req, res) => {
            try {
                const symbol = req.params.symbol;
                const data = await exchange.fetchTicker(symbol);
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener Ticker", details: error.message });
            }
        });

        app.get('/binance/orderbook/:symbol', async (req, res) => {
            try {
                const symbol = req.params.symbol;
                const data = await exchange.fetchOrderBook(symbol, 20);
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener OrderBook", details: error.message });
            }
        });

        app.get('/binance/ohlcv/:symbol', async (req, res) => {
            try {
                const { symbol } = req.params;
                const { timeframe = '1m', limit = 100 } = req.query;
                const data = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener OHLCV", details: error.message });
            }
        });

        /* ================= BINANCE PRIVADOS ================= */
        // Se añade try/catch a todas las rutas privadas para capturar errores de API Key
        
        app.get('/binance/balance', async (_, res) => {
            try {
                const balance = await exchange.fetchBalance();
                res.json(balance);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener Balance", details: error.message });
            }
        });

        app.get('/binance/account', async (_, res) => {
            try {
                const account = await exchange.fetchBalance();
                res.json(account.info);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener Cuenta", details: error.message });
            }
        });

        app.get('/binance/open-orders', async (_, res) => {
            try {
                const orders = await exchange.fetchOpenOrders();
                res.json(orders);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener Órdenes Abiertas", details: error.message });
            }
        });

        app.get('/binance/my-trades/:symbol', async (req, res) => {
            try {
                const trades = await exchange.fetchMyTrades(req.params.symbol);
                res.json(trades);
            } catch (error) {
                res.status(500).json({ error: "Fallo al obtener Mis Trades", details: error.message });
            }
        });

        /* ================= TRADING ================= */
        // Se añade try/catch aquí también, que era la causa del error en el log anterior
        
        app.post('/binance/order', async (req, res) => {
            const { symbol, side, amount, price, type = 'market' } = req.body;
            
            try {
                const order = type === 'market'
                    ? await exchange.createMarketOrder(symbol, side, amount)
                    : await exchange.createLimitOrder(symbol, side, amount, price);

                res.json(order);
            } catch (error) {
                // ¡Importante para errores de trading!
                console.error("❌ FALLO AL CREAR ORDEN:", error.message);
                res.status(500).json({ error: "Fallo al crear la orden", details: error.message });
            }
        });

        app.post('/binance/cancel-order', async (req, res) => {
             const { orderId, symbol } = req.body;
            try {
                const result = await exchange.cancelOrder(orderId, symbol);
                res.json(result);
            } catch (error) {
                 res.status(500).json({ error: "Fallo al cancelar la orden", details: error.message });
            }
        });

        /* ================= ORDER FLOW (TU RUTA ORIGINAL) ================= */

        app.get('/orderflow', async (_, res) => {
            try {
                const WATCHLIST = [
                    'BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','XRP/USDT','ADA/USDT','DOGE/USDT',
                    'TRX/USDT','MATIC/USDT','AVAX/USDT','LTC/USDT','LINK/USDT','DOT/USDT','UNI/USDT',
                    'ATOM/USDT','NEAR/USDT','FIL/USDT','APE/USDT','SAND/USDT','MANA/USDT','AAVE/USDT',
                    'EOS/USDT','XTZ/USDT','ALGO/USDT','HBAR/USDT','FLOW/USDT','ICP/USDT','INJ/USDT',
                    'AR/USDT','RNDR/USDT'
                ];

                const results = [];

                for (const symbol of WATCHLIST) {
                    if (!validSymbols.has(symbol)) continue;

                    const ob = await exchange.fetchOrderBook(symbol, 10);
                    const tk = await exchange.fetchTicker(symbol);

                    if (!ob.bids.length || !ob.asks.length) continue;

                    const bidQty = ob.bids.reduce((a,b)=>a+b[1],0);
                    const askQty = ob.asks.reduce((a,b)=>a+b[1],0);
                    // OBI = (Bids - Asks) / (Bids + Asks)
                    const obi = (bidQty - askQty) / (bidQty + askQty);

                    results.push({
                        symbol: symbol.replace('/',''),
                        price: tk.last,
                        bidPressure: 50 + obi * 50,
                        askPressure: 50 - obi * 50,
                        spreadPct: ((ob.asks[0][0]-ob.bids[0][0])/ob.asks[0][0])*100
                    });
                }

                res.json(results);
            } catch (error) { // Se captura el error específico aquí
                console.error("❌ Error en la ruta /orderflow:", error.message);
                res.status(500).json({ error: "Fallo en el procesamiento de OrderFlow", details: error.message });
            }
        });
        
        // INICIAMOS EL SERVIDOR SOLAMENTE DESPUÉS DE LA CARGA DE MERCADOS EXITOSA
        app.listen(PORT, () =>
            console.log(`🔥 Servidor escuchando en puerto ${PORT}`)
        );

    } catch (e) {
        // Este catch captura el error si loadMarkets falla
        console.error("❌ ERROR FATAL EN EL STARTUP (Servidor detenido):", e.message);
        // Usar process.exit(1) para que Railway sepa que el inicio falló
        process.exit(1); 
    }
};

startServer();
