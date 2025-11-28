// services/binance_service.js
// Usa la API pública de Binance para una estabilidad máxima, evitando problemas de cold start.

const BINANCE_TICKER_API = "https://api.binance.com/api/v3/ticker/price";

/**
 * Pausa la ejecución por el tiempo especificado.
 * @param {number} ms - Milisegundos a esperar.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Implementa la lógica de reintento con backoff exponencial para mejorar la resiliencia de la red.
 * @param {Function} fn - Función asíncrona a ejecutar.
 * @param {number} maxRetries - Máximo número de reintentos.
 */
async function retryOperation(fn, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000 + 1000;
                // console.log(`Error de red, reintentando en ${delay.toFixed(0)}ms...`);
                await sleep(delay);
            } else {
                // Después del último reintento fallido, lanzamos el error
                throw error;
            }
        }
    }
}


/**
 * Obtiene el precio de mercado (ask y bid simulado) del par de trading especificado desde Binance.
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Binance', ask: number, bid: number }.
 */
export async function getBinancePrice(symbol) {
    try {
        const url = `${BINANCE_TICKER_API}?symbol=${symbol.toUpperCase()}`;
        
        const response = await retryOperation(async () => {
            const res = await fetch(url);
            if (!res.ok) {
                // Si la respuesta no es OK (ej. 404 o 500), lanzamos un error para que se reintente
                throw new Error(`Error HTTP de Binance: ${res.status}`);
            }
            return res.json();
        });

        // La API de Binance solo da un 'price'. Simulamos el ASK/BID con un spread muy pequeño (0.01%)
        const lastPrice = parseFloat(response.price);

        const spread = 0.0001; // Spread de 0.01% para simular bid/ask
        const askPrice = lastPrice * (1 + spread); // Precio de VENTA (Ask)
        const bidPrice = lastPrice * (1 - spread); // Precio de COMPRA (Bid)

        if (isNaN(lastPrice)) {
            throw new Error("La respuesta de la API de Binance tiene un formato incorrecto o falta el precio.");
        }
        
        return {
            exchange: 'Binance',
            ask: askPrice, 
            bid: bidPrice 
        };

    } catch (error) {
        console.error(`ERROR en getBinancePrice para ${symbol}. Usando precios de emergencia (Simulación).`, error.message);
        
        // Fallback de emergencia si todo falla
        const currentPriceEstimate = symbol.startsWith('BTC') ? 60000 : 3000; 
        const offset = Math.random() * 10 - 5; 
        const simulatedPrice = currentPriceEstimate + offset;
        return {
            exchange: 'Binance (Fallback de Emergencia)',
            ask: simulatedPrice * 1.0001, 
            bid: simulatedPrice * 0.9999
        };
    }
}


/**
 * Función para obtener el Saldo de USDT.
 * NOTA: Para un saldo real, se requeriría la implementación de la API Key/Secret de Binance
 * y la llamada a un endpoint privado. Por defecto, se usa un valor simulado.
 * @returns {Promise<number>} Saldo de USDT.
 */
export async function getUSDTBalance() {
    console.log("⚠️ Advertencia: La función getUSDTBalance está usando un saldo simulado. Implemente la conexión privada de Binance para el saldo real.");
    // Devolvemos un saldo simulado de 1000 USDT.
    return 1000.00; 
}
