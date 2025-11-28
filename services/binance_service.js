import { Spot } from '@binance/connector';

// Las claves API deben ser definidas como variables de entorno
const API_KEY = process.env.BINANCE_API_KEY;
const SECRET_KEY = process.env.BINANCE_SECRET_KEY;

// Inicializa el cliente solo si las claves están disponibles
const client = (API_KEY && SECRET_KEY) ? new Spot(API_KEY, SECRET_KEY) : null;

/**
 * Obtiene el precio de mercado actual para un par de trading en Binance.
 * @param {string} symbol - El par de trading (ej: 'BTCUSDT').
 * @returns {Promise<number>} El precio del par.
 */
export async function getBinancePrice(symbol) {
    if (!client) {
        console.warn("[BINANCE SERVICE] API Keys no configuradas. Usando precio simulado.");
        // Devuelve un precio simulado para desarrollo
        return 65000.00 + Math.random() * 100;
    }

    try {
        // Usa el endpoint 'ticker/price' para obtener el precio
        const response = await client.tickerPrice(symbol);
        
        // La respuesta es un objeto como { symbol: 'BTCUSDT', price: '65050.12' }
        const price = parseFloat(response.data.price);
        return price;
    } catch (error) {
        console.error(`[BINANCE SERVICE ERROR] Error al obtener precio de ${symbol}:`, error.message);
        throw new Error(`Fallo en Binance: ${error.message}`);
    }
}
