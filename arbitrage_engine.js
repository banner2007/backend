// arbitrage_engine.js
// Contiene la lógica para el arbitraje triangular y el arbitraje de intercambio (Binance vs. Bitbex).

import Binance from 'node-binance-api';
import { getBitbexPrice } from './services/bitbex_service.js';

// --- CONFIGURACIÓN CRÍTICA ---
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "TU_CLAVE_API_AQUI"; 
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "TU_SECRETO_API_AQUI";
// -----------------------------

const binance = new Binance().options({
    APIKEY: BINANCE_API_KEY,
    APISECRET: BINANCE_API_SECRET
});

const CHECK_INTERVAL_MS = 5000; // 5 segundos
// Umbrales de beneficio MÍNIMO necesarios DESPUÉS de comisiones para ser viable.
const MIN_PROFIT_TRIANGULAR = 0.001; // 0.1% real
const MIN_PROFIT_INTEREXCHANGE = 0.008; // 0.8% real (para cubrir transferencias y riesgo)

// Definición de comisiones
const TRADING_FEE_RATE = 0.001; // 0.1% por cada trade (maker/taker)
const TRANSFER_FEE_USD = 5.00; // Simulación de costo de retiro de BTC (fijo)
const INVESTMENT_USD = 1000.0; // Capital que se invierte en cada ciclo (para calcular el impacto de la transferencia)

/**
 * Lógica para el arbitraje entre Binance y Bitbex.
 */
async function checkInterExchangeArbitrage() {
    const symbol = 'BTCUSDT'; 
    console.log(`\n[${new Date().toLocaleTimeString()}] Buscando Arbitraje Inter-Intercambio (${symbol})...`);

    try {
        // 1. Obtener precios (ASK = Venta en Binance, BID = Compra en Bitbex)
        const binanceTicker = await binance.bookTickers(symbol);
        const binanceAskPrice = parseFloat(binanceTicker.askPrice); // Precio al que puedes vender inmediatamente en Binance
        const bitbexData = await getBitbexPrice(symbol);
        const bitbexBidPrice = bitbexData.bid; // Precio al que puedes comprar inmediatamente en Bitbex

        if (isNaN(binanceAskPrice) || isNaN(bitbexBidPrice)) {
            console.warn("Advertencia: No se pudieron obtener los precios para el arbitraje Inter-Intercambio.");
            return;
        }

        // --- CÁLCULO DE GANANCIA Y COMISIONES ---
        
        // 1. Ganancia Bruta (por unidad): Precio de venta - Precio de compra
        const unitGrossProfit = binanceAskPrice - bitbexBidPrice;
        
        // 2. Cálculo de Costos Fijos y Variables:
        //    a) Compra en Bitbex: (Precio de Compra * Tasa de Comisión)
        const feeBitbex = bitbexBidPrice * TRADING_FEE_RATE;
        //    b) Venta en Binance: (Precio de Venta * Tasa de Comisión)
        const feeBinance = binanceAskPrice * TRADING_FEE_RATE;
        //    c) Comisión de Transferencia (Impacto de la comisión fija de retiro por unidad de BTC)
        const transferFeePerUnit = TRANSFER_FEE_USD / (INVESTMENT_USD / bitbexBidPrice); // Impacto de 5$ en la cantidad de BTC comprada

        const totalFeesPerUnit = feeBitbex + feeBinance + transferFeePerUnit;

        // 3. Ganancia Neta por unidad (Bruta - Costos)
        const unitNetProfit = unitGrossProfit - totalFeesPerUnit;
        
        // 4. Ganancia Neta Porcentual (basada en la inversión)
        const netProfitPercentage = unitNetProfit / bitbexBidPrice;
        
        console.log(`Precios: Binance ASK (Venta)=${binanceAskPrice.toFixed(2)}, Bitbex BID (Compra)=${bitbexBidPrice.toFixed(2)}`);
        console.log(`Comisiones (simuladas): ${(totalFeesPerUnit).toFixed(4)} USD por unidad (incl. transferencia de ${TRANSFER_FEE_USD}$ para ${INVESTMENT_USD}$)`);
        console.log(`Ganancia Neta: ${(unitNetProfit).toFixed(4)} USD (${(netProfitPercentage * 100).toFixed(4)}%)`);
        
        if (netProfitPercentage > MIN_PROFIT_INTEREXCHANGE) {
            console.log("----------------------------------------------------------------");
            console.log(`🚀 ¡OPORTUNIDAD DE ARBITRAJE INTER-INTERCAMBIO ENCONTRADA! 🚀`);
            console.log(`ACCIÓN SUGERIDA: Comprar ${symbol} en Bitbex y Vender en Binance.`);
            console.log(`Potencial de Ganancia NETA: +${(netProfitPercentage * 100).toFixed(4)}%`);
            console.log("----------------------------------------------------------------");
        } else {
            console.log(`Sin oportunidad rentable de Inter-Intercambio (necesita >${(MIN_PROFIT_INTEREXCHANGE * 100)}% después de comisiones)`);
        }

    } catch (error) {
        if (error.message && error.message.includes("400")) {
             console.error("Error: Revise que el símbolo sea válido o si la API de Bitbex está caída.");
        } else {
             console.error("Error en la detección de arbitraje Inter-Intercambio:", error.message);
        }
    }
}


/**
 * Función para simular la detección de arbitraje triangular (solo en Binance).
 * Aplica comisiones para mayor realismo.
 */
async function checkTriangularArbitrage() {
    console.log(`\n[${new Date().toLocaleTimeString()}] Buscando Arbitraje Triangular (BTC/ETH/USDT)...`);
    
    try {
        const tickers = await binance.prices();
        const pair1 = 'BTCUSDT'; 
        const pair2 = 'ETHBTC';  
        const pair3 = 'ETHUSDT'; 
        
        const price1 = parseFloat(tickers[pair1]); // P_btc/usdt
        const price2 = parseFloat(tickers[pair2]); // P_eth/btc
        const price3 = parseFloat(tickers[pair3]); // P_eth/usdt

        if (isNaN(price1) || isNaN(price2) || isNaN(price3)) {
            return;
        }

        // --- CÁLCULO TRIANGULAR CON COMISIONES ---
        // Simulación: Inicias con 1 USDT
        
        // Trade 1: USDT -> BTC (se resta la comisión al resultado)
        const amountBTC = (1 / price1) * (1 - TRADING_FEE_RATE);
        
        // Trade 2: BTC -> ETH (se resta la comisión al resultado)
        const amountETH = (amountBTC / price2) * (1 - TRADING_FEE_RATE);
        
        // Trade 3: ETH -> USDT (se resta la comisión al resultado)
        const finalUSDT = amountETH * price3 * (1 - TRADING_FEE_RATE);
        
        const netProfit = finalUSDT - 1; 

        console.log(`--- Cálculo Triangular ---`);
        console.log(`Resultado final (por 1 USDT): ${finalUSDT.toFixed(8)} USDT`);
        console.log(`Beneficio Neto: ${ (netProfit * 100).toFixed(4) }% (incluye 3 comisiones del ${TRADING_FEE_RATE * 100}%)`);
        
        if (netProfit > MIN_PROFIT_TRIANGULAR) {
            console.log("-----------------------------------------");
            console.log(`🤑 ¡OPORTUNIDAD TRIANGULAR ENCONTRADA! 🤑`);
            console.log(`Potencial de Ganancia NETA: +${(netProfit * 100).toFixed(4)}%`);
            console.log("-----------------------------------------");
        } else {
            console.log(`Sin oportunidad rentable Triangular (necesita >${(MIN_PROFIT_TRIANGULAR * 100)}% después de comisiones)`);
        }
    } catch (error) {
        console.error("Error en la detección de arbitraje Triangular:", error.message);
    }
}

/**
 * Función principal que chequea todas las oportunidades.
 */
async function checkAllOpportunities() {
    await checkInterExchangeArbitrage(); 
    await checkTriangularArbitrage();    
}


export function startEngine() {
    console.log(`Motor de arbitraje iniciado. Chequeando cada ${CHECK_INTERVAL_MS/1000} segundos...`);
    
    // Inicia el chequeo y luego lo repite.
    checkAllOpportunities(); 
    setInterval(checkAllOpportunities, CHECK_INTERVAL_MS);
}
