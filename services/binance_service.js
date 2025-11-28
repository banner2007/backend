// services/binance_service.js
// Usa la API pública de Binance para una estabilidad máxima, evitando problemas de cold start.

const BINANCE_TICKER_API = "https://api.binance.com/api/v3/ticker/price";

/**
 * Pausa la ejecución por el tiempo especificado.
 * @param {number} ms - Milisegundos a esperar.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Implementa la lógica de reintento con backoff exponencial.
 * @param {Function} fn - Función a ejecutar.
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
                throw new Error(`Error HTTP: ${res.status}`);
            }
            return res.json();
        });

        // La API de Binance solo da un 'price'. Simulamos el ASK/BID con un spread muy pequeño (0.01%)
        const lastPrice = parseFloat(response.price);

        const spread = 0.0001; 
        const askPrice = lastPrice * (1 + spread); // Precio de VENTA (usado en arbitraje Inter-Exchange)
        const bidPrice = lastPrice * (1 - spread); // Precio de COMPRA

        if (isNaN(lastPrice)) {
            throw new Error("Binance API response format is incorrect or price is missing.");
        }
        
        return {
            exchange: 'Binance',
            ask: askPrice, 
            bid: bidPrice 
        };

    } catch (error) {
        console.error(`ERROR en getBinancePrice. Usando precios de emergencia (Simulación).`, error.message);
        
        // Fallback de emergencia
        const currentPriceEstimate = symbol.startsWith('BTC') ? 60000 : 3000; 
        const offset = Math.random() * 10 - 5; 
        const simulatedPrice = currentPriceEstimate + offset;
        return {
            exchange: 'Binance (Fallback)',
            ask: simulatedPrice * 1.0001, 
            bid: simulatedPrice * 0.9999
        };
    }
}


/**
 * Función para el Saldo (Simulado).
 * Requeriría API Key y Secret reales para obtener el saldo real.
 * @returns {Promise<number>} Saldo de USDT.
 */
export async function getUSDTBalance() {
    // Si necesitas el saldo real, deberás implementar la autenticación y la llamada a
    // un endpoint privado de Binance aquí.
    console.log("⚠️ Advertencia: Para un saldo real, se necesita la API Key/Secret. Usando saldo simulado.");
    // Devolvemos un saldo simulado para que la lógica de volumen no falle.
    return 1000.00; 
}
