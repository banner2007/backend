// services/bitbex_service.js

/**
 * Obtiene el precio de mercado (ask y bid) del par de trading especificado desde Bitbex.
 * * NOTA: Esta versión simula el precio de Bitbex con una pequeña variación aleatoria
 * para fines de prueba. En la vida real, esta función debe hacer una llamada
 * HTTP a la API pública de Bitbex para obtener datos reales.
 * * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Bitbex', ask: number, bid: number }.
 */
export async function getBitbexPrice(symbol) {
    // --- SIMULACIÓN DE DATOS DE BITBEX ---
    
    // Asumimos un precio base para simular (usamos un valor aproximado de BTC en la simulación)
    const currentPriceEstimate = 60000; 

    // Simulación de que Bitbex tiene una pequeña variación con respecto a Binance
    // Desviación aleatoria entre -10 y +10 (para simular el diferencial de precios)
    const offset = Math.random() * 20 - 10; 
    
    // Precio simulado
    const simulatedPrice = currentPriceEstimate + offset;
    
    // Asignamos bid (precio de compra) y ask (precio de venta) con un spread simulado de $3
    const bid = parseFloat((simulatedPrice - 1.5).toFixed(2)); // Precio al que compramos en Bitbex
    const ask = parseFloat((simulatedPrice + 1.5).toFixed(2)); // Precio al que vendemos en Bitbex

    // En una implementación real, bid y ask se obtendrían directamente de la API de Bitbex.
    return {
        exchange: 'Bitbex',
        ask: ask,
        bid: bid // Este es el precio clave que se compara con Binance ASK
    };
}
