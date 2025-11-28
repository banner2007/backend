// services/binance_service.js
// CONFIGURACIÓN RESTABLECIDA: Se conecta a su backend de Railway para obtener los datos de Binance.
// ADVERTENCIA: Puede experimentar errores de "Cold Start".

const RAILWAY_BASE_URL = "https://backend-production-228b.up.railway.app";

/**
 * Pausa la ejecución por el tiempo especificado.
 * @param {number} ms - Milisegundos a esperar.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Implementa la lógica de reintento con backoff exponencial.
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
                console.warn(`Intento ${i + 1}/${maxRetries} fallido para Railway. Reintentando en ${delay.toFixed(0)}ms... (Posible Cold Start)`);
                await sleep(delay);
            } else {
                // Después del último reintento fallido, lanzamos el error
                throw error;
            }
        }
    }
}


/**
 * Obtiene el precio de mercado (ask y bid) desde Binance a través del backend de Railway.
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Binance', ask: number, bid: number }.
 */
export async function getBinancePrice(symbol) {
    try {
        // Llama al endpoint de Railway
        const url = `${RAILWAY_BASE_URL}/binance/prices?symbols=[%22${symbol}%22]`;
        
        const response = await retryOperation(async () => {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Error HTTP de Railway: ${res.status}`);
            }
            const data = await res.json();
            
            if (data && data[symbol]) {
                 return {
                    exchange: 'Binance',
                    ask: parseFloat(data[symbol].ask), 
                    bid: parseFloat(data[symbol].bid) 
                 };
            }
            throw new Error("Respuesta de Railway incompleta o en formato incorrecto.");
        });

        return response;

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
 * Función para obtener el Saldo de USDT (Simulado).
 * @returns {Promise<number>} Saldo de USDT.
 */
export async function getUSDTBalance() {
    console.log("⚠️ Advertencia: La función getUSDTBalance está usando un saldo simulado (1000 USDT).");
    return 1000.00; 
}
