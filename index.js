// index.js - Servidor Backend para Railway (EXTENDIDO CON ORDER FLOW)

const startServer = async () => {
  if (typeof process === 'undefined' || !process.versions?.node) {
    console.warn("⚠️ Backend no ejecutable en navegador.");
    return;
  }

  try {
    console.log("🚀 Iniciando Servidor Backend...");

    const expressModule = await import('express');
    const corsModule = await import('cors');
    const ccxtModule = await import('ccxt');
    const axiosModule = await import('axios');

    const express = expressModule.default;
    const cors = corsModule.default;
    const ccxt = ccxtModule.default;
    const axios = axiosModule.default;

    const API_KEY = process.env.BINANCE_API_KEY;
    const API_SECRET = process.env.BINANCE_SECRET_KEY;
    const PORT = process.env.PORT || 3000;

    const BASE_CURRENCIES = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'EUR'];

    let exchange = null;
    let marketsLoaded = false;
    let validSymbols = new Set();

    const initExchange = () => {
      if (!exchange) {
        exchange = new ccxt.binance({
          apiKey: API_KEY,
          secret: API_SECRET,
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
    app.use(cors({ origin: '*'}));
    app.use(express.json());

    /* ================= EXISTENTES (NO TOCADAS) ================= */

    app.get('/', (_, res) => res.send('✅ Backend Railway OK'));

    app.get('/ip', async (_, res) => {
      const r = await axios.get('https://api.ipify.org?format=json');
      res.json({ ip: r.data.ip });
    });

    /* ================= NUEVA RUTA ORDER FLOW ================= */

    app.get('/orderflow', async (req, res) => {
      try {
        const binance = initExchange();
        await loadMarkets();

        const WATCHLIST = [
          'BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','XRP/USDT',
          'ADA/USDT','DOGE/USDT','AVAX/USDT','LINK/USDT','MATIC/USDT'
        ];

        const results = [];

        for (const symbol of WATCHLIST) {
          if (!validSymbols.has(symbol)) continue;

          const orderbook = await binance.fetchOrderBook(symbol, 10);
          const ticker = await binance.fetchTicker(symbol);

          if (!orderbook.bids.length || !orderbook.asks.length) continue;

          const bestBid = orderbook.bids[0][0];
          const bestAsk = orderbook.asks[0][0];
          const bidQty = orderbook.bids.reduce((a,b) => a + b[1], 0);
          const askQty = orderbook.asks.reduce((a,b) => a + b[1], 0);

          const spreadPct = ((bestAsk - bestBid) / bestAsk) * 100;
          const obi = (bidQty - askQty) / (bidQty + askQty);

          results.push({
            symbol: symbol.replace('/', ''),
            price: ticker.last,
            bidPressure: 50 + obi * 50,
            askPressure: 50 - obi * 50,
            obi,
            spreadPct,
            volatilityScore: Math.min(Math.abs(ticker.percentage || 0), 100),
            absorption: 'NONE',
            depthScore: bidQty > 50000 ? 90 : 50,
            marketState: 'NEUTRAL'
          });
        }

        res.json(results);
      } catch (err) {
        console.error("❌ /orderflow error:", err.message);
        res.status(500).json([]);
      }
    });

    app.listen(PORT, () => {
      console.log(`🔥 Servidor escuchando en puerto ${PORT}`);
    });

  } catch (e) {
    console.error("❌ Error fatal:", e);
  }
};

startServer();
