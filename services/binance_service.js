// services/binance_service.js

/**
 * Obtiene el precio de mercado (ask y bid) del par de trading especificado desde Binance.
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Binance', ask: number, bid: number }.
 */
export async function getBinancePrice(symbol) {
    // console.log(`[Binance] Buscando precio para ${symbol}...`);

    // **Simulación de datos**: Binance suele tener un precio ligeramente diferente.
    const ask = parseFloat((Math.random() * 0.5 + 28000).toFixed(2)); // Precio de venta (tú compras)
    const bid = parseFloat((ask - 1.5).toFixed(2)); // Precio de compra (tú vendes)
    
    return {
        exchange: 'Binance',
        ask: ask,
        bid: bid
    };
}
