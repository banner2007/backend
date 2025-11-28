import { getBinancePrice } from './binance_service.js';
import { getBitbexPrice } from './bitbex_service.js';

// Define el par de trading que se va a monitorear (Ej: Bitcoin)
const TRADING_PAIR = 'BTCUSDT'; 
const RECHECK_INTERVAL_MS = 5000; // Revisar cada 5 segundos
let isRunning = false;

/**
 * Función principal que busca oportunidades de arbitraje.
 */
async function checkArbitrageOpportunity() {
    if (!isRunning) return;

    console.log(`[ENGINE] Chequeando precios para ${TRADING_PAIR}...`);

    try {
        const binancePrice = await getBinancePrice(TRADING_PAIR);
        const bitbexPrice = await getBitbexPrice(TRADING_PAIR);

        if (binancePrice && bitbexPrice) {
            console.log(`\n--- PRECIOS ACTUALES ---`);
            console.log(`Binance (${TRADING_PAIR}): $${binancePrice}`);
            console.log(`Bitbex (${TRADING_PAIR}): $${bitbexPrice}`);

            const difference = bitbexPrice - binancePrice;
            const percentageDifference = (difference / binancePrice) * 100;
            
            console.log(`Diferencia Absoluta: $${difference.toFixed(2)}`);
            console.log(`Diferencia Porcentual: ${percentageDifference.toFixed(4)}%`);
            console.log(`------------------------\n`);

            // Lógica simple de arbitraje: si la diferencia es mayor al 0.1%
            if (percentageDifference > 0.1) {
                console.log(`*** ¡OPORTUNIDAD DE ARBITRAJE ENCONTRADA! ***`);
                console.log(`Comprar en Binance ($${binancePrice.toFixed(2)}), Vender en Bitbex ($${bitbexPrice.toFixed(2)}).`);
                // Aquí se agregaría la lógica real de ejecución de órdenes.
            } else if (percentageDifference < -0.1) {
                console.log(`*** ¡OPORTUNIDAD DE ARBITRAJE INVERSA ENCONTRADA! ***`);
                console.log(`Comprar en Bitbex ($${bitbexPrice.toFixed(2)}), Vender en Binance ($${binancePrice.toFixed(2)}).`);
            } else {
                console.log(`Diferencia por debajo del umbral (0.1%). Esperando...`);
            }
        }
    } catch (error) {
        console.error(`[ENGINE ERROR] Fallo al chequear precios:`, error.message);
    }

    // Vuelve a chequear después del intervalo
    setTimeout(checkArbitrageOpportunity, RECHECK_INTERVAL_MS);
}

/**
 * Inicia el motor de arbitraje.
 * @returns {string} El estado actual del motor.
 */
export const startArbitrageEngine = () => {
    if (isRunning) {
        return "El motor ya está en funcionamiento.";
    }
    console.log("=========================================");
    console.log("       INICIANDO MOTOR DE ARBITRAJE      ");
    console.log("=========================================");
    isRunning = true;
    checkArbitrageOpportunity();
    return "Motor de arbitraje iniciado con éxito.";
};

/**
 * Detiene el motor de arbitraje.
 * Nota: El `setTimeout` se encarga de parar el loop al comprobar `isRunning`.
 * @returns {string} El estado actual del motor.
 */
export const stopArbitrageEngine = () => {
    if (!isRunning) {
        return "El motor ya está detenido.";
    }
    isRunning = false;
    console.log("=========================================");
    console.log("       MOTOR DE ARBITRAJE DETENIDO       ");
    console.log("=========================================");
    return "Motor de arbitraje detenido.";
};

/**
 * Obtiene el estado actual del motor.
 * @returns {object} Objeto con el estado del motor.
 */
export const getEngineStatus = () => {
    return {
        status: isRunning ? 'running' : 'stopped',
        pair: TRADING_PAIR,
        interval: `${RECHECK_INTERVAL_MS / 1000}s`
    };
};
