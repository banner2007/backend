// services/bitbex_service.js
// FUNCIÓN CORRECTAMENTE EXPORTADA PARA RESOLVER EL SYNTAXERROR

/**
 * Obtiene el precio de mercado (ask y bid) del par de trading especificado desde Bitbex.
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Bitbex', ask: number, bid: number }.
 */
export async function getBitbexPrice(symbol) {
    // Simulación de precios con una ligera variación.
    const ask = parseFloat((Math.random() * 0.5 + 28001).toFixed(2)); 
    const bid = parseFloat((ask - 1.0).toFixed(2));
    
    return {
        exchange: 'Bitbex',
        ask: ask,
        bid: bid
    };
}
