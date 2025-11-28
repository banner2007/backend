// services/binance_service.js
// La URL de Railway es la constante: https://backend-production-228b.up.railway.app
// Si Binance rechaza, el problema es casi seguro la whitelisting de IPs o una firma API incorrecta en el backend.

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
                // Muestra el tipo de error (Cold Start, 404, etc.)
                console.warn(`Intento ${i + 1}/${maxRetries} fallido para Railway (${error.message}). Reintentando en ${delay.toFixed(0)}ms...`);
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
        }, 5); 

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
 */
export async function getUSDTBalance() {
    try {
        const url = `${RAILWAY_BASE_URL}/binance/account`;
        console.log("Intentando conectar a Railway para obtener el saldo de la cuenta...");

        const realBalance = await retryOperation(async () => {
            const res = await fetch(url);
            
            if (res.status === 404) {
                 // Error 404: La ruta no está definida en el backend
                 throw new Error(`Error 404: La ruta /binance/account NO existe en su backend de Railway.`);
            }
            if (!res.ok) {
                throw new Error(`Error HTTP de Railway al obtener saldo: ${res.status}`);
            }
            const data = await res.json();
            
            // Asumiendo la estructura de respuesta de Binance
            if (data && Array.isArray(data.balances)) {
                const usdtBalance = data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const freeBalance = parseFloat(usdtBalance.free);
                    console.log(`✅ Saldo USDT REAL obtenido de Railway: ${freeBalance.toFixed(2)} USDT`);
                    return freeBalance;
                }
            }
            // Si la conexión es exitosa pero no se encuentra USDT, usamos simulación.
            console.warn("Respuesta de cuenta incompleta. Usando saldo simulado.");
            return 1000.00; 
        }, 3); 

        return realBalance;

    } catch (error) {
        console.error(`ERROR CRÍTICO: No se pudo obtener el saldo de USDT del backend. Usando saldo simulado. Mensaje:`, error.message);
        return 1000.00; // Saldo simulado de fallback
    }
}
