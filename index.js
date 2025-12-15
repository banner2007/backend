// index.js - Servidor Backend para Railway (EXTENDIDO)

const startServer = async () => {
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
        await exchange.loadMarkets();
        validSymbols = new Set(Object.keys(exchange.markets));
        marketsLoaded = true;
        console.log(`📦 Mercados cargados: ${validSymbols.size}`);
      }
    };

    initExchange();
    loadMarkets().catch(console.error);

    const app = express();
    app.use(cors({ origin: '*' }));
    app.use(express.json());

    /* ================= BASICOS ================= */

    app.get('/', (_, res) => res.send('✅ Backend Railway OK'));

    app.get('/ip', async (_, res) => {
      const r = await axios.get('https://api.ipify.org?format=json');
      res.json(r.data);
    });

    /* ================= BINANCE PUBLICOS ================= */

    app.get('/binance/time', async (_, res) => {
      const t = await exchange.fetchTime();
      res.json({ serverTime: t });
    });

    app.get('/binance/markets', async (_, res) => {
      await loadMarkets();
      res.json([...validSymbols]);
    });

    app.get('/binance/ticker/:symbol', async (req, res) => {
      const symbol = req.params.symbol;
      const data = await exchange.fetchTicker(symbol);
      res.json(data);
    });

    app.get('/binance/orderbook/:symbol', async (req, res) => {
      const symbol = req.params.symbol;
      const data = await exchange.fetchOrderBook(symbol, 20);
      res.json(data);
    });

    app.get('/binance/ohlcv/:symbol', async (req, res) => {
      const { symbol } = req.params;
      const { timeframe = '1m', limit = 100 } = req.query;
      const data = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      res.json(data);
    });

    /* ================= BINANCE PRIVADOS ================= */

    app.get('/binance/balance', async (_, res) => {
      const balance = await exchange.fetchBalance();
      res.json(balance);
    });

    app.get('/binance/account', async (_, res) => {
      const account = await exchange.fetchBalance();
      res.json(account.info);
    });

    app.get('/binance/open-orders', async (_, res) => {
      const orders = await exchange.fetchOpenOrders();
      res.json(orders);
    });

    app.get('/binance/my-trades/:symbol', async (req, res) => {
      const trades = await exchange.fetchMyTrades(req.params.symbol);
      res.json(trades);
    });

    /* ================= TRADING ================= */

    app.post('/binance/order', async (req, res) => {
      const { symbol, side, amount, price, type = 'market' } = req.body;

      const order = type === 'market'
        ? await exchange.createMarketOrder(symbol, side, amount)
        : await exchange.createLimitOrder(symbol, side, amount, price);

      res.json(order);
    });

    app.post('/binance/cancel-order', async (req, res) => {
      const { orderId, symbol } = req.body;
      const result = await exchange.cancelOrder(orderId, symbol);
      res.json(result);
    });

    /* ================= ORDER FLOW (TU RUTA ORIGINAL) ================= */

    app.get('/orderflow', async (_, res) => {
      try {
        const WATCHLIST = [
          'BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','XRP/USDT',
          'ADA/USDT','DOGE/USDT','AVAX/USDT','LINK/USDT','MATIC/USDT'
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
      } catch {
        res.status(500).json([]);
      }
    });

    app.listen(PORT, () =>
      console.log(`🔥 Servidor escuchando en puerto ${PORT}`)
    );

  } catch (e) {
    console.error("❌ Error fatal:", e);
  }
};

startServer();
