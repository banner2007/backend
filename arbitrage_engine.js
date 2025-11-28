// arbitrage_engine.js
// Contiene la lógica para el arbitraje triangular (interno) y el arbitraje de intercambio (Binance vs. Bitbex).

import Binance from 'node-binance-api';
// IMPORTACIÓN CLAVE: Asegúrate de que este archivo exista en la carpeta 'services'.
import { getBitbexPrice } from './services/bitbex_service.js';

// --- CONFIGURACIÓN CRÍTICA ---
// Usamos variables de entorno (process.env) para mayor seguridad.
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "TU_CLAVE_API_AQUI"; 
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "TU_SECRETO_API_AQUI";
// -----------------------------

const binance = new Binance().options({
    APIKEY: BINANCE_API_KEY,
    APISECRET: BINANCE_API_SECRET
});

const CHECK_INTERVAL_MS = 5000; // 5 segundos
const MIN_PROFIT_TRIANGULAR = 0.0005; // 0.05% de ganancia mínima para arbitraje interno
const MIN_PROFIT_INTEREXCHANGE = 0.005; // 0.5% de ganancia mínima para arbitraje entre intercambios

/**
 * Lógica para el arbitraje entre Binance y Bitbex.
 */
async function checkInterExchangeArbitrage() {
    const symbol = 'BTCUSDT'; 
    console.log(`\n[${new Date().toLocaleTimeString()}] Buscando Arbitraje Inter-Intercambio (${symbol})...`);

    try {
        // 1. Obtener el precio de venta (ASK) en Binance (donde venderías la moneda)
        const binanceTicker = await binance.bookTickers(symbol);
        const binanceAskPrice = parseFloat(binanceTicker.askPrice); // Precio al que puedes vender inmediatamente

        // 2. Obtener el precio de compra (BID) en Bitbex (donde comprarías la moneda)
        const bitbexData = await getBitbexPrice(symbol);
        const bitbexBidPrice = bitbexData.bid; // Precio al que puedes comprar inmediatamente

        if (isNaN(binanceAskPrice) || isNaN(bitbexBidPrice)) {
            console.warn("Advertencia: No se pudieron obtener los precios para el arbitraje Inter-Intercambio.");
            return;
        }

        // 3. Cálculo del beneficio (Comprar barato en Bitbex, Vender caro en Binance)
        // Beneficio Bruto = ((Precio Venta Binance) - (Precio Compra Bitbex)) / (Precio Compra Bitbex)
        const grossProfit = (binanceAskPrice - bitbexBidPrice) / bitbexBidPrice;
        
        console.log(`Precios: Binance ASK (Venta)=${binanceAskPrice.toFixed(2)}, Bitbex BID (Compra)=${bitbexBidPrice.toFixed(2)}`);
        console.log(`Diferencial Bruto: ${(grossProfit * 100).toFixed(4)}%`);
        
        if (grossProfit > MIN_PROFIT_INTEREXCHANGE) {
            console.log("----------------------------------------------------------------");
            console.log(`🚀 ¡OPORTUNIDAD DE ARBITRAJE INTER-INTERCAMBIO ENCONTRADA! 🚀`);
            console.log(`ACCIÓN SUGERIDA: Comprar ${symbol} en Bitbex y Vender en Binance.`);
            console.log(`Potencial de Ganancia: +${(grossProfit * 100).toFixed(4)}%`);
            console.log("----------------------------------------------------------------");
        } else {
            console.log(`Sin oportunidad rentable de Inter-Intercambio (necesita >${(MIN_PROFIT_INTEREXCHANGE * 100)}%)`);
        }

    } catch (error) {
        if (error.message.includes("400")) {
             console.error("Error: Revise que el símbolo sea válido o si la API de Bitbex está caída.");
        } else {
             console.error("Error en la detección de arbitraje Inter-Intercambio:", error.message);
        }
    }
}


/**
 * Función para simular la detección de arbitraje triangular (solo en Binance).
 */
async function checkTriangularArbitrage() {
    console.log(`\n[${new Date().toLocaleTimeString()}] Buscando Arbitraje Triangular (BTC/ETH/USDT)...`);
    
    try {
        const tickers = await binance.prices();
        const pair1 = 'BTCUSDT'; 
        const pair2 = 'ETHBTC';  
        const pair3 = 'ETHUSDT'; 
        
        const price1 = parseFloat(tickers[pair1]); 
        const price2 = parseFloat(tickers[pair2]);
        const price3 = parseFloat(tickers[pair3]);

        if (isNaN(price1) || isNaN(price2) || isNaN(price3)) {
            return;
        }

        // Simulación: Ganancia Bruta = (1 / P1) * (1 / P2) * P3
        const finalUSDT = (1 / price1) * (1 / price2) * price3;
        const profitLoss = finalUSDT - 1; 

        console.log(`--- Cálculo Triangular ---`);
        console.log(`Resultado final (por 1 USDT): ${finalUSDT.toFixed(8)} USDT`);
        console.log(`Beneficio/Pérdida Neto: ${ (profitLoss * 100).toFixed(4) }%`);
        
        if (profitLoss > MIN_PROFIT_TRIANGULAR) {
            console.log("-----------------------------------------");
            console.log(`🤑 ¡OPORTUNIDAD TRIANGULAR ENCONTRADA! 🤑`);
            console.log(`Potencial de Ganancia: +${(profitLoss * 100).toFixed(4)}%`);
            console.log("-----------------------------------------");
        } else {
            console.log(`Sin oportunidad rentable Triangular (necesita >${(MIN_PROFIT_TRIANGULAR * 100)}%)`);
        }
    } catch (error) {
        console.error("Error en la detección de arbitraje Triangular:", error.message);
    }
}

/**
 * Función principal que chequea todas las oportunidades.
 */
async function checkAllOpportunities() {
    await checkInterExchangeArbitrage(); // 1. Binance vs. Bitbex
    await checkTriangularArbitrage();    // 2. Triangular en Binance
}


export function startEngine() {
    console.log("Motor de arbitraje iniciado. Chequeando cada 5 segundos...");
    
    // Inicia el chequeo y luego lo repite.
    checkAllOpportunities(); 
    setInterval(checkAllOpportunities, CHECK_INTERVAL_MS);
}
