// index.js - Servidor Backend para Railway (COMPLETAMENTE CORREGIDO)

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

        // Verificar que las claves de API estén presentes
        if (!API_KEY || !API_SECRET) {
             console.error("❌ ERROR CRÍTICO: Las variables BINANCE_API_KEY o BINANCE_SECRET_KEY no están definidas.");
             throw new Error("Faltan credenciales de API.");
        }

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
                try {
                    await exchange.loadMarkets();
                    validSymbols = new Set(Object.keys(exchange.markets));
                    marketsLoaded = true;
                    console.log(`📦 Mercados cargados: ${validSymbols.size}`);
                } catch (error) {
                    console.error("❌ ERROR CRÍTICO al cargar mercados:", error.message);
                    // Si falla, relanzamos el error para que el 'catch' principal detenga el proceso
                    throw new Error("Fallo en la carga inicial de mercados o credenciales de Binance.");
                }
            }
        };

        // ===============================================
        // PUNTO CLAVE: INICIALIZACIÓN ASÍNCRONA ROBUSTA
        // ===============================================
        initExchange();
        
        // 1. Esperamos la carga de mercados para asegurar que la conexión sea válida.
        await loadMarkets(); 

        // 2. PRUEBA DE CONECTIVIDAD (Para atrapar errores de API Key/Permisos en el inicio)
        try {
            // Usamos fetchBalance para probar que los permisos de trading estén OK (privado)
            await exchange.fetchBalance();
            console.log("🟢 Conectividad de Trading y Balance OK.");
        } catch (e) {
            console.error("❌ Fallo en la prueba de conectividad de Trading (API Key o permisos):", e.message);
            throw new Error("Conexión de API fallida. Revisa tus claves y permisos.");
        }
        
        // ===============================================
        // CONTINUACIÓN DEL CÓDIGO (Servidor Express)
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

        /* ================= TRADING (CORREGIDO) ================= */

        app.post('/binance/order', async (req, res) => {
            const { symbol, side, amount, price, type = 'market' } = req.body;
            
            try {
                // 1. Validación de Parámetros Requeridos
                if (!symbol || !side || !amount) {
                    return res.status(400).json({ error: "Faltan parámetros requeridos: symbol, side, y amount." });
                }
                
                const numericAmount = parseFloat(amount);
                if (isNaN(numericAmount) || numericAmount <= 0) {
                    return res.status(400).json({ error: "Cantidad inválida: Debe ser un número positivo." });
                }

                // 2. Ejecución de la Orden
                const order = type === 'market'
                    ? await exchange.createMarketOrder(symbol, side, numericAmount)
                    : await exchange.createLimitOrder(symbol, side, numericAmount, price);

                res.json(order);

            } catch (error) {
                // --- MANEJO DE ERRORES ROBUSTO PARA EVITAR CRASHES ---
                let status = 500; 
                let errorMessage = "Error interno del servidor al procesar la orden.";
                let errorCode = null; 

                if (error.message) {
                    errorMessage = error.message;
                }
                
                // CCXT/Binance: Errores del cliente (ej. saldo, cantidad, -1102) son Bad Request (400)
                if (error.name === 'InvalidOrder' || errorMessage.includes('BINANCE') || errorMessage.includes('-1102') || errorMessage.includes('Faltan parámetros') || errorMessage.includes('Cantidad inválida')) {
                    status = 400; // Bad Request: Error del cliente/parámetros/exchange
                    errorCode = error.code || 'BINANCE_VALIDATION_ERROR';
                }
                
                // Loguear el error completo para debug en Railway
                console.error(`❌ FALLO AL CREAR ORDEN (HTTP ${status}, Code ${errorCode || 'N/A'}):`, error);

                // Responder al Frontend con el estado y el JSON de error
                res.status(status).json({ 
                    error: errorMessage, 
                    code: errorCode
                });
            }
        });

        /**
         * NUEVA RUTA: Manejo de Órdenes OCO (One-Cancels-the-Other).
         * CORRECCIÓN CLAVE: Se ha reemplazado privatePostOrderList (el método que falla) 
         * por el método unificado de CCXT: createOrderList, que es más compatible.
         */
        app.post('/binance/oco-order', async (req, res) => {
            const { 
                symbol, 
                side, 
                amount, 
                takeProfitPrice, 
                stopLossPrice, 
                stopLimitPrice 
            } = req.body;
            
            try {
                // 1. Validación de Parámetros OCO Requeridos
                if (!symbol || !side || !amount || !takeProfitPrice || !stopLossPrice || !stopLimitPrice) {
                    return res.status(400).json({ 
                        error: "Faltan parámetros OCO requeridos: symbol, side, amount, takeProfitPrice, stopLossPrice, stopLimitPrice." 
                    });
                }
                
                const numericAmount = parseFloat(amount);
                if (isNaN(numericAmount) || numericAmount <= 0) {
                    return res.status(400).json({ error: "Cantidad inválida (amount): Debe ser un número positivo." });
                }

                // 2. Ejecución de la Orden OCO utilizando el método unificado de CCXT (Binance OCO = Limit + Stop Limit)
                const order = await exchange.createOrderList(symbol, side, [
                    // Primera Orden: Take Profit (Limit Order)
                    { 
                        type: 'limit', 
                        price: parseFloat(takeProfitPrice), 
                        amount: numericAmount,
                        params: { listClientOrderId: exchange.uuid() } // Opcional, pero bueno para trazabilidad
                    },
                    // Segunda Orden: Stop Loss (Stop Limit Order)
                    { 
                        type: 'stop_loss_limit', 
                        price: parseFloat(stopLimitPrice), 
                        stopPrice: parseFloat(stopLossPrice), 
                        amount: numericAmount
                    }
                ]);

                res.json(order);

            } catch (error) {
                let status = 500; 
                let errorMessage = "Error OCO: Fallo al crear la Order List.";
                let errorCode = null;

                if (error.message) {
                    // Loguea el mensaje de error para depuración
                    errorMessage = error.message; 
                }

                // Manejo de errores OCO específicos de Binance/CCXT
                if (error.name === 'InvalidOrder' || errorMessage.includes('BINANCE') || errorMessage.includes('OCO') || errorMessage.includes('-1013') || errorMessage.includes('-1102')) {
                    status = 400; 
                    errorCode = error.code || 'OCO_VALIDATION_ERROR';
                }
                
                console.error(`❌ FALLO AL CREAR ORDEN OCO (HTTP ${status}):`, error);

                res.status(status).json({ 
                    error: errorMessage, 
                    code: errorCode
                });
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
            } catch (error) { 
                console.error("❌ Error en la ruta /orderflow:", error.message);
                res.status(500).json({ error: "Fallo en el procesamiento de OrderFlow", details: error.message });
            }
        });
        
        // INICIAMOS EL SERVIDOR SOLAMENTE DESPUÉS DE LA CARGA DE MERCADOS EXITOSA Y LA PRUEBA DE CONEXIÓN
        app.listen(PORT, () =>
            console.log(`🔥 Servidor escuchando en puerto ${PORT}`)
        );

    } catch (e) {
        // Este catch final captura cualquier error fatal de inicialización
        console.error("❌ ERROR FATAL EN EL STARTUP (Servidor detenido):", e.message);
        // Usar process.exit(1) para que Railway sepa que el inicio falló
        process.exit(1); 
    }
};

startServer();
