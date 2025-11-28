// services/bitbex_service.js

const axios = require('axios');
require('dotenv').config();

// --- CONFIGURACIÓN DE BITBEX ---
const BITBEX_API_KEY = process.env.BITBEX_API_KEY;
const BITBEX_API_SECRET = process.env.BITBEX_API_SECRET;
const BITBEX_BASE_URL = 'https://api.bitbex.net/v1'; // URL de ejemplo, reemplázala con la real

/**
 * Función para firmar las peticiones privadas (saldo, órdenes).
 * La lógica de firma (signing) varía según el exchange.
 * DEBES reemplazar este bloque con el método de autenticación real de Bitbex.net.
 * @param {string} endpoint - El endpoint de la API (ej: '/account/balance')
 * @param {object} params - Parámetros de la petición.
 * @returns {object} headers - Encabezados con la firma de seguridad.
 */
function getSignedHeaders(endpoint, params) {
    // ESTO ES UN PLACEHOLDER.
    // Lógica real de Bitbex: calcular un hash HMAC-SHA256, añadir la clave, etc.
    const timestamp = Date.now();
    const signature = 'GENERAR_FIRMA_AQUI'; // Reemplazar
    
    return {
        'X-API-KEY': BITBEX_API_KEY,
        'X-API-SIGNATURE': signature,
        'X-API-TIMESTAMP': timestamp,
        'Content-Type': 'application/json'
    };
}


/**
 * Obtiene el libro de órdenes (Order Book) de un par específico.
 * Se usa para obtener los mejores precios de compra (Bid) y venta (Ask).
 * @param {string} symbol - El par a consultar (ej: 'BTCUSDT').
 * @returns {object|null} - Objeto con Bid y Ask, o null si falla.
 */
async function getOrderBook(symbol) {
    const url = `${BITBEX_BASE_URL}/market/depth?symbol=${symbol}`;
    try {
        const response = await axios.get(url);
        
        // Asumiendo que la respuesta tiene el formato { bids: [...], asks: [...] }
        const data = response.data;
        
        if (data.bids && data.asks && data.bids.length > 0 && data.asks.length > 0) {
            // El mejor Bid (compra) es el primer elemento de la lista Bid
            const bestBid = parseFloat(data.bids[0][0]); 
            // El mejor Ask (venta) es el primer elemento de la lista Ask
            const bestAsk = parseFloat(data.asks[0][0]);
            
            return { bestBid, bestAsk };
        }
        return null;
    } catch (error) {
        console.error(`BitbexService: Error al obtener Order Book para ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Obtiene el saldo de la cuenta.
 * @returns {object|null} - Objeto de saldos.
 */
async function getAccountBalance() {
    const endpoint = '/account/balance';
    const url = BITBEX_BASE_URL + endpoint;
    try {
        const headers = getSignedHeaders(endpoint, {}); // Parámetros vacíos
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('BitbexService: Error al obtener saldo:', error.message);
        return null;
    }
}

/**
 * Coloca una orden de compra o venta en Bitbex.net.
 * @param {string} symbol - El par de trading.
 * @param {string} side - 'BUY' o 'SELL'.
 * @param {number} quantity - La cantidad a operar.
 * @param {number} price - El precio límite (opcional).
 * @returns {object|null} - Respuesta de la orden.
 */
async function placeOrder(symbol, side, quantity, price) {
    const endpoint = '/order';
    const url = BITBEX_BASE_URL + endpoint;
    const params = {
        symbol,
        side,
        type: 'LIMIT', // Usamos límite para arbitraje
        quantity,
        price
    };
    
    try {
        const headers = getSignedHeaders(endpoint, params);
        const response = await axios.post(url, params, { headers });
        return response.data;
    } catch (error) {
        console.error(`BitbexService: Error al colocar orden ${side}:`, error.message);
        return null;
    }
}

module.exports = {
    getOrderBook,
    getAccountBalance,
    placeOrder,
};