// services/binance_service.js
// CONFIGURACIÓN RESTABLECIDA: Se conecta a su backend de Railway para obtener los datos de Binance.
// ADVERTENCIA: Puede experimentar errores de "Cold Start" para precios, y el endpoint de cuenta
// debe existir en su backend de Railway.

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
                console.warn(`Intento ${i + 1}/${maxRetries} fallido para Railway. Reintentando en ${delay.toFixed(0)}ms... (Posible Cold Start o error de ruta)`);
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
        // Llama al endpoint de precios de Railway
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
            throw new Error("Respuesta de precios de Railway incompleta o en formato incorrecto.");
        }, 5); // 5 reintentos para precios

        return response;

    } catch (error) {
        console.error(`ERROR en getBinancePrice para ${symbol}. Usando precios de emergencia (Simulación).`, error.message);
        
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
 * Obtiene el Saldo de USDT desde el backend de Railway.
 * NOTA: Esta función requiere que la ruta /binance/account esté configurada en su backend de Railway.
 * @returns {Promise<number>} Saldo de USDT.
 */
export async function getUSDTBalance() {
    try {
        const url = `${RAILWAY_BASE_URL}/binance/account`;
        console.log("Intentando conectar a Railway para obtener el saldo de la cuenta...");

        const realBalance = await retryOperation(async () => {
            const res = await fetch(url);
            
            if (res.status === 404) {
                 // Error específico que usted mencionó, la ruta no existe en el backend
                 throw new Error(`Error 404: La ruta /binance/account no existe en su backend de Railway. Verifique la implementación del servidor.`);
            }
            if (!res.ok) {
                throw new Error(`Error HTTP de Railway al obtener saldo: ${res.status}`);
            }
            const data = await res.json();
            
            // Asumiendo que el JSON tiene una estructura con balances, buscamos USDT
            if (data && Array.isArray(data.balances)) {
                const usdtBalance = data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const freeBalance = parseFloat(usdtBalance.free);
                    console.log(`✅ Saldo USDT REAL obtenido de Railway: ${freeBalance.toFixed(2)} USDT`);
                    return freeBalance;
                }
            }
            // Si la conexión es exitosa pero no se encuentra USDT, volvemos a la simulación.
            console.warn("Respuesta de cuenta incompleta. Usando saldo simulado.");
            return 1000.00; 
        }, 3); // 3 reintentos para el saldo

        return realBalance;

    } catch (error) {
        console.error(`ERROR CRÍTICO: No se pudo obtener el saldo de USDT del backend. Usando saldo simulado. Mensaje de error:`, error.message);
        return 1000.00; // Saldo simulado de fallback
    }
}
