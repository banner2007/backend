// arbitrage_engine.js
import { getBinancePrice, getUSDTBalance } from './services/binance_service.js';
import { getBitbexPrice } from './services/bitbex_service.js';

// Constantes de Configuración
const ARBITRAGE_CHECK_INTERVAL_MS = 5000; // Cada 5 segundos
const MIN_PROFIT_INTER_EXCHANGE = 0.002; // 0.2% de ganancia mínima
const MIN_PROFIT_TRIANGULAR = 0.001;     // 0.1% de ganancia mínima (para compensar comisiones)
const TRADING_FEE = 0.001; // 0.1% de comisión por trade (Binance Spot)

// Pares para Inter-Intercambio y Triangular (se asume que están configurados)
const INTER_EXCHANGE_PAIRS = ['BTCUSDT'];
const TRIANGULAR_PAIRS = [
    { base: 'USDT', mid: 'ETH', target: 'BTC', symbols: ['ETHUSDT', 'BTCETH', 'BTCUSDT'] }
];

/**
 * Calcula el arbitraje triangular (Ruta: USDT -> ETH -> BTC -> USDT).
 * La ruta es simplificada para demostración.
 * @param {Object} prices - Mapa de precios de Binance.
 */
function checkTriangularArbitrage(prices) {
    console.log(`[${new Date().toLocaleTimeString()}] Buscando Arbitraje Triangular (BTC/ETH/USDT)...`);

    const p_ETHUSDT_bid = prices['ETHUSDT'].bid; // Comprar ETH con USDT
    const p_BTCETH_bid = prices['BTCETH'].bid;   // Comprar BTC con ETH
    const p_BTCUSDT_ask = prices['BTCUSDT'].ask; // Vender BTC por USDT

    if (!p_ETHUSDT_bid || !p_BTCETH_bid || !p_BTCUSDT_ask) {
        console.log("Advertencia: Faltan precios para el cálculo Triangular. Saltando ciclo.");
        return;
    }
    
    // Ruta: Invertir 1 USDT
    // 1. USDT -> ETH: 1 / p_ETHUSDT_bid
    // 2. ETH -> BTC: (1 / p_ETHUSDT_bid) / p_BTCETH_bid
    // 3. BTC -> USDT: ((1 / p_ETHUSDT_bid) / p_BTCETH_bid) * p_BTCUSDT_ask

    let result = (1 / p_ETHUSDT_bid) / p_BTCETH_bid * p_BTCUSDT_ask;

    // Descontar 3 comisiones (0.1% cada una)
    const feesFactor = (1 - TRADING_FEE) * (1 - TRADING_FEE) * (1 - TRADING_FEE);
    const resultAfterFees = result * feesFactor;
    
    const netBenefit = (resultAfterFees - 1) * 100;

    console.log("--- Cálculo Triangular ---");
    console.log(`Resultado final (por 1 USDT): ${resultAfterFees.toFixed(8)} USDT`);
    console.log(`Beneficio Neto: ${netBenefit.toFixed(4)}% (incluye 3 comisiones del ${TRADING_FEE * 100}%)`);

    if (netBenefit > MIN_PROFIT_TRIANGULAR * 100) {
        console.log(`🚀 ¡OPORTUNIDAD DE ARBITRAJE TRIANGULAR ENCONTRADA! 🚀`);
        console.log(`Ganancia Neta: ${netBenefit.toFixed(4)}%`);
        console.log("----------------------------------------------------------------");
    } else {
        console.log(`Sin oportunidad rentable Triangular (necesita >${MIN_PROFIT_TRIANGULAR * 100}% después de comisiones)`);
    }
}

/**
 * Calcula el arbitraje Inter-Intercambio (Binance vs Bitbex).
 * @param {Object} binancePrice - Precio de Binance.
 * @param {Object} bitbexPrice - Precio de Bitbex.
 * @param {number} availableUSDT - Saldo disponible en USDT para simular el volumen.
 */
function checkInterExchangeArbitrage(binancePrice, bitbexPrice, availableUSDT) {
    console.log(`[${new Date().toLocaleTimeString()}] Buscando Arbitraje Inter-Intercambio (${INTER_EXCHANGE_PAIRS[0]})...`);

    // Usaremos el ASK de Binance (Precio de VENTA) y el BID de Bitbex (Precio de COMPRA)
    const sellPrice = binancePrice.ask; // Precio al que VENDEREMOS en Binance
    const buyPrice = bitbexPrice.bid;   // Precio al que COMPRAREMOS en Bitbex

    // La oportunidad existe si (Venta > Compra)
    if (sellPrice <= buyPrice) {
        console.log(`No hay oportunidad: Binance ASK (${sellPrice.toFixed(2)}) <= Bitbex BID (${buyPrice.toFixed(2)})`);
        return;
    }

    // Ganancia Bruta (por unidad de BTC)
    const grossProfitPerUnit = sellPrice - buyPrice;
    
    // --- Cálculo de Comisiones Realistas ---
    
    // 1. Comisión de Compra (en Bitbex)
    const buyFee = buyPrice * TRADING_FEE; 
    
    // 2. Comisión de Venta (en Binance)
    const sellFee = sellPrice * TRADING_FEE; 
    
    // 3. Comisión de Transferencia (Simulada para 1 BTC)
    const TRANSFER_FEE_USD = 5.0; // Costo fijo de transferencia de BTC/SOL entre exchanges

    const totalFeesPerUnit = buyFee + sellFee + TRANSFER_FEE_USD;
    
    const netProfitPerUnit = grossProfitPerUnit - totalFeesPerUnit;
    const percentageProfit = (netProfitPerUnit / buyPrice) * 100;
    
    if (percentageProfit / 100 > MIN_PROFIT_INTER_EXCHANGE) {
        console.log("----------------------------------------------------------------");
        console.log(`🚀 ¡OPORTUNIDAD DE ARBITRAJE INTER-INTERCAMBIO ENCONTRADA! 🚀`);
        console.log(`ACCIÓN SUGERIDA: Comprar ${INTER_EXCHANGE_PAIRS[0]} en ${bitbexPrice.exchange} y Vender en ${binancePrice.exchange}.`);
        console.log(`Potencial de Ganancia NETA: +${percentageProfit.toFixed(4)}%`);
        console.log(`Precios: Binance ASK (Venta)=${sellPrice.toFixed(2)}, Bitbex BID (Compra)=${buyPrice.toFixed(2)}`);
        console.log(`Comisiones (simuladas): ${totalFeesPerUnit.toFixed(4)} USD por unidad (incl. transferencia de ${TRANSFER_FEE_USD.toFixed(2)}$)`);
        
        // Simulación de Ganancia con el volumen disponible
        const maxUnits = availableUSDT / buyPrice;
        const totalNetProfit = maxUnits * netProfitPerUnit;

        console.log(`Ganancia Neta (con ${availableUSDT.toFixed(2)} USDT disponibles): ${totalNetProfit.toFixed(2)} USD`);
        console.log("----------------------------------------------------------------");
    } else {
        console.log(`Sin oportunidad rentable Inter-Exchange (necesita >${MIN_PROFIT_INTER_EXCHANGE * 100}% después de comisiones)`);
    }
}

/**
 * Función principal del motor de arbitraje.
 */
async function engineLoop(availableUSDT) {
    try {
        // --- 1. Obtener Precios ---
        const [binancePriceBTC, bitbexPriceBTC] = await Promise.all([
            getBinancePrice('BTCUSDT'),
            getBitbexPrice('BTCUSDT')
        ]);
        
        // Obtener precios para Arbitraje Triangular (se asume que el bot solo usa Binance para triangular)
        const [p_ETHUSDT, p_BTCETH] = await Promise.all([
            getBinancePrice('ETHUSDT'),
            getBinancePrice('BTCETH')
        ]);

        const allBinancePrices = {
            'BTCUSDT': binancePriceBTC,
            'ETHUSDT': p_ETHUSDT,
            'BTCETH': p_BTCETH
            // Agregar más pares si el triangular fuera más complejo
        };

        // --- 2. Chequear Oportunidades ---
        checkInterExchangeArbitrage(binancePriceBTC, bitbexPriceBTC, availableUSDT);
        checkTriangularArbitrage(allBinancePrices);

    } catch (error) {
        console.error("Error grave en el ciclo principal del motor:", error.message);
    }
}

/**
 * Inicia el motor de arbitraje.
 */
export async function startEngine() {
    console.log("Iniciando motor de arbitraje...");
    
    // Obtener Saldo Inicial (Simulado o Real)
    // ESTO ASEGURA QUE LA FUNCIÓN DE SALDO SE LLAME AL INICIO
    const availableUSDT = await getUSDTBalance();
    console.log(`Saldo de USDT disponible (simulado/real): ${availableUSDT.toFixed(2)} USDT`);
    
    // Ejecutar el ciclo principal inmediatamente y luego en intervalos
    await engineLoop(availableUSDT);
    
    setInterval(() => engineLoop(availableUSDT), ARBITRAGE_CHECK_INTERVAL_MS);
}
