// services/bitbex_service.js
// Servicio de datos simulado para Bitbex.

const RAILWAY_BASE_URL = "https://backend-production-228b.up.railway.app";
// El endpoint simulado de Bitbex no existe, pero mantenemos la estructura.
const BITBEX_SIMULATED_ENDPOINT = `${RAILWAY_BASE_URL}/bitbex/prices`; 

/**
 * Pausa la ejecución por el tiempo especificado.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtiene el precio simulado de Bitbex, dependiendo del precio obtenido de Binance (a través de Railway).
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Bitbex', ask: number, bid: number }.
 */
export async function getBitbexPrice(symbol) {
    // Importamos el servicio de Binance que ahora apunta a Railway.
    const { getBinancePrice } = await import('./binance_service.js');

    try {
        console.log(`Simulando intento de conexión a Bitbex (depende de Railway)...`);
        
        // Simulamos un retraso para imitar el entorno de red.
        await sleep(500 + Math.random() * 500); 

        // Usamos el precio de Binance como base (obtenido de Railway)
        const binancePrice = await getBinancePrice(symbol);
        const basePrice = binancePrice.bid;
        
        // Simulación de Diferencia: +/- 0.05% para crear oportunidades de arbitraje inter-exchange.
        const priceDifferenceFactor = 1 + (Math.random() * 0.001 - 0.0005); 
        const simulatedPrice = basePrice * priceDifferenceFactor;

        // Spread bid/ask en Bitbex (0.02% simulado)
        const spread = 0.0002; 
        const askPrice = simulatedPrice * (1 + spread); 
        const bidPrice = simulatedPrice * (1 - spread); 

        return {
            exchange: 'Bitbex (Simulado - Railway)',
            ask: askPrice,
            bid: bidPrice 
        };

    } catch (error) {
        console.error(`ERROR en getBitbexPrice (Simulación de Railway fallida). Usando precios de emergencia.`, error.message);
        
        // Fallback de emergencia
        const currentPriceEstimate = symbol.startsWith('BTC') ? 60000 : 3000; 
        const offset = Math.random() * 10 - 5; 
        const simulatedPrice = currentPriceEstimate + offset;
        return {
            exchange: 'Bitbex (Fallback)',
            ask: simulatedPrice * 1.0003, 
            bid: simulatedPrice * 0.9997
        };
    }
}
