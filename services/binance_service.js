// binance_service.js

/**
 * Obtiene el precio de mercado (ask y bid) del par de trading especificado desde Binance.
 * Nota: En un entorno real, usarías la API de Binance aquí.
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Binance', ask: number, bid: number }.
 */
export async function getBinancePrice(symbol) {
    console.log(`[Binance] Buscando precio para ${symbol}...`);

    try {
        // Simulando una llamada a la API
        // const response = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`);
        // const data = await response.json();
        
        // **Usamos datos simulados para el entorno de ejemplo**
        const ask = parseFloat((Math.random() * 0.5 + 28000).toFixed(2)); // Precio de venta simulado
        const bid = parseFloat((ask - 1.5).toFixed(2)); // Precio de compra simulado
        
        return {
            exchange: 'Binance',
            ask: ask, // El precio al que la gente está dispuesta a vender (tú compras)
            bid: bid  // El precio al que la gente está dispuesta a comprar (tú vendes)
        };

    } catch (error) {
        console.error(`[Binance Error] No se pudo obtener el precio: ${error.message}`);
        return { exchange: 'Binance', ask: null, bid: null };
    }
}
