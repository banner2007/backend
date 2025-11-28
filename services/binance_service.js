// services/binance_service.js
// La importación ha sido corregida para usar el path raíz del paquete,
// resolviendo el error ERR_MODULE_NOT_FOUND de Node.js.
import { Spot } from '@binance/connector'; // CORREGIDO: Eliminado '/es'

// Cargar claves de entorno
const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = process.env.BINANCE_SECRET_KEY;

// Inicializar el cliente (asume que las claves están configuradas en Railway)
const client = new Spot(apiKey, apiSecret, { baseURL: 'https://api.binance.com' });

/**
 * Obtiene el libro de órdenes (Order Book) de un símbolo específico.
 * Utiliza una ruta pública.
 * @param {string} symbol - Par de trading (ej: 'BTCUSDT').
 * @param {number} limit - Número de entradas (máx. 1000).
 * @returns {Promise<object>} - El libro de órdenes con 'bids' (compras) y 'asks' (ventas).
 */
export async function getOrderBook(symbol, limit = 100) {
    try {
        const response = await client.depth(symbol, { limit });
        return response.data;
    } catch (error) {
        console.error(`[BINANCE ERROR] Error al obtener el libro de órdenes para ${symbol}:`, error.message);
        throw new Error('Fallo en la comunicación con la API de Binance.');
    }
}

/**
 * Realiza una prueba de conexión privada para verificar que las claves API sean válidas
 * y que el usuario esté autenticado, obteniendo el saldo de la cuenta.
 * @returns {Promise<object>} - Un objeto con el estado de la conexión y el saldo.
 */
export async function getBinanceAccountBalance() {
    if (!apiKey || !apiSecret) {
        return { success: false, message: 'Claves API de Binance no configuradas.' };
    }
    try {
        // Usa getAccount para forzar una llamada privada autenticada.
        const response = await client.account();
        
        // Filtrar solo los balances relevantes (no cero) para mostrar.
        const balances = response.data.balances
            .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            .map(b => ({ asset: b.asset, free: b.free, locked: b.locked }));

        return {
            success: true,
            message: 'Conexión y autenticación de Binance exitosa.',
            balances: balances
        };
    } catch (error) {
        // En caso de error de autenticación (ej: clave inválida)
        if (error.response && error.response.status === 401) {
             return { success: false, message: 'Error de autenticación: Clave API o Secreta de Binance inválida.' };
        }
        console.error('[BINANCE ERROR] Error desconocido al obtener el balance:', error.message);
        return { success: false, message: `Error desconocido: ${error.message}` };
    }
}

/**
 * Simula la colocación de una orden (función de placeholder).
 * NOTA: Esta función es solo un esqueleto y no realiza la orden real.
 * @param {string} symbol - Par de trading.
 * @param {string} side - 'BUY' o 'SELL'.
 * @param {number} quantity - Cantidad a operar.
 * @returns {Promise<object>} - Resultado simulado de la orden.
 */
export async function placeOrder(symbol, side, quantity) {
    // Por ahora, solo simulación:
    console.log(`[SIMULACIÓN BINANCE] Colocando orden ${side} de ${quantity} ${symbol}...`);
    return {
        orderId: Math.floor(Math.random() * 1000000),
        status: 'FILLED',
        symbol,
        side,
        executedQty: quantity
    };
}
