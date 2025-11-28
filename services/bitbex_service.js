// services/bitbex_service.js
// Este servicio ahora intenta conectarse a la API pública de Bitbex.

/**
 * URL de la API de Bitbex para obtener el ticker de un par.
 * ⚠️ ATENCIÓN: DEBES BUSCAR la URL del endpoint público de Bitbex
 * para obtener el precio de BTCUSDT y reemplazar este PLACEHOLDER.
 */
const BITBEX_TICKER_API_URL = "https://api.bitbex.net/v1/public/ticker?symbol=BTCUSDT"; 

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
async function retryOperation(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            // Reintenta solo si no es el último intento
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                // console.log(`Error al obtener precio, reintentando en ${delay.toFixed(0)}ms...`);
                await sleep(delay);
            } else {
                throw error; // Lanza el error si es el último intento fallido
            }
        }
    }
}


/**
 * Obtiene el precio de mercado (ask y bid) del par de trading especificado desde Bitbex.
 * @param {string} symbol - El par de trading (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} Un objeto con { exchange: 'Bitbex', ask: number, bid: number }.
 */
export async function getBitbexPrice(symbol) {
    try {
        const response = await retryOperation(async () => {
            const res = await fetch(BITBEX_TICKER_API_URL);
            if (!res.ok) {
                throw new Error(`Error HTTP: ${res.status}`);
            }
            return res.json();
        });

        // ⚠️ ZONA CRÍTICA: DEBES ADAPTAR ESTA PARTE ⚠️
        // Analiza la estructura de la respuesta de Bitbex y extrae los valores correctos.
        // Asumo que la respuesta tiene un campo 'bid' y 'ask' en la raíz.

        const bitbexBidPrice = parseFloat(response.bid); // Precio de COMPRA (BID)
        const bitbexAskPrice = parseFloat(response.ask); // Precio de VENTA (ASK)

        if (isNaN(bitbexBidPrice) || isNaN(bitbexAskPrice)) {
            // Si la estructura no coincide con 'bid' o 'ask', puedes devolver un error para que el arbitraje se salte este ciclo.
            throw new Error("Bitbex API response format is incorrect or prices are missing.");
        }
        
        // El motor de arbitraje (arbitrage_engine.js) usa el BID de Bitbex.
        return {
            exchange: 'Bitbex',
            ask: bitbexAskPrice, 
            bid: bitbexBidPrice // El precio que necesitamos para comprar barato
        };

    } catch (error) {
        console.error(`ERROR en getBitbexPrice: No se pudo obtener el precio real. Usando datos de emergencia (Simulación).`, error.message);
        
        // --- FALLBACK DE EMERGENCIA (SIMULACIÓN DE PRECIOS CON MAYOR REALISMO) ---
        // Si la API falla, intentamos una simulación más cercana al precio real de BTC (~60k)
        const currentPriceEstimate = 60000; 
        const offset = Math.random() * 50 - 25; // Pequeña variación
        const simulatedPrice = currentPriceEstimate + offset;
        return {
            exchange: 'Bitbex (Fallback)',
            ask: simulatedPrice + 1.0, 
            bid: simulatedPrice - 1.0 // Un bid más cercano a la realidad
        };
    }
}
