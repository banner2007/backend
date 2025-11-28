// arbitrage_engine.js
// Módulo central para la lógica de arbitraje.

// Importa las funciones específicas de cada exchange.
// Nota: 'getBinancePrice' y 'getBitbexPrice' son exportaciones con nombre.
import { getBinancePrice } from './services/binance_service.js';
import { getBitbexPrice } from './services/bitbex_service.js';

// Define el par de trading que se va a monitorear
const TRADING_PAIR = 'BTCUSDT';
// Define el umbral de beneficio mínimo para considerar una oportunidad (e.g., 0.5%)
const PROFIT_THRESHOLD = 0.005; 
// Intervalo de tiempo en milisegundos para ejecutar el chequeo (e.g., cada 5 segundos)
const CHECK_INTERVAL_MS = 5000; 

/**
 * Función principal que comprueba los precios y detecta oportunidades de arbitraje.
 */
async function checkArbitrageOpportunities() {
    console.log(`[${new Date().toLocaleTimeString()}] Buscando oportunidades para ${TRADING_PAIR}...`);

    try {
        // 1. Obtener los precios de ambos exchanges en paralelo para mayor eficiencia.
        const [binanceData, bitbexData] = await Promise.all([
            getBinancePrice(TRADING_PAIR),
            getBitbexPrice(TRADING_PAIR)
        ]);

        // 2. Extraer los datos relevantes (Ask y Bid)
        const binanceAsk = binanceData.ask; // Precio de compra en Binance (lo que pagas)
        const binanceBid = binanceData.bid; // Precio de venta en Binance (lo que recibes)
        
        const bitbexAsk = bitbexData.ask; // Precio de compra en Bitbex (lo que pagas)
        const bitbexBid = bitbexData.bid; // Precio de venta en Bitbex (lo que recibes)

        // Mostrar los precios actuales en la consola para referencia
        console.log(`  > Binance: Ask=${binanceAsk.toFixed(2)}, Bid=${binanceBid.toFixed(2)}`);
        console.log(`  > Bitbex:  Ask=${bitbexAsk.toFixed(2)}, Bid=${bitbexBid.toFixed(2)}`);

        // 3. Evaluar las dos posibles rutas de arbitraje:

        // RUTA 1: Comprar barato en Binance y vender caro en Bitbex
        // Vender en Bitbex (Bid) > Comprar en Binance (Ask)
        const profitRoute1 = bitbexBid - binanceAsk;
        const percentageRoute1 = profitRoute1 / binanceAsk;

        // RUTA 2: Comprar barato en Bitbex y vender caro en Binance
        // Vender en Binance (Bid) > Comprar en Bitbex (Ask)
        const profitRoute2 = binanceBid - bitbexAsk;
        const percentageRoute2 = profitRoute2 / bitbexAsk;

        // 4. Reportar la mejor oportunidad
        let bestOpportunity = { profit: 0, percentage: 0, route: null };

        // Comparar RUTA 1
        if (percentageRoute1 > bestOpportunity.percentage) {
            bestOpportunity = {
                profit: profitRoute1,
                percentage: percentageRoute1,
                route: `Comprar en Binance a ${binanceAsk.toFixed(2)} y Vender en Bitbex a ${bitbexBid.toFixed(2)}`
            };
        }

        // Comparar RUTA 2
        if (percentageRoute2 > bestOpportunity.percentage) {
            bestOpportunity = {
                profit: profitRoute2,
                percentage: percentage2,
                route: `Comprar en Bitbex a ${bitbexAsk.toFixed(2)} y Vender en Binance a ${binanceBid.toFixed(2)}`
            };
        }

        // 5. Mostrar el resultado final
        if (bestOpportunity.percentage >= PROFIT_THRESHOLD) {
            // ¡Oportunidad detectada!
            console.log("=================================================");
            console.log("¡OPORTUNIDAD DE ARBITRAJE DETECTADA!");
            console.log(`Ruta: ${bestOpportunity.route}`);
            console.log(`Beneficio Bruto: $${bestOpportunity.profit.toFixed(2)} (${(bestOpportunity.percentage * 100).toFixed(4)}%)`);
            console.log("=================================================");
        } else {
            console.log(`> No se encontraron oportunidades que superen el umbral de ${(PROFIT_THRESHOLD * 100).toFixed(2)}%.`);
            console.log(`> Mejor spread: ${(bestOpportunity.percentage * 100).toFixed(4)}%`);
        }

    } catch (error) {
        console.error("Error al obtener o procesar los precios:", error.message);
    }
}

/**
 * Inicia el bucle de arbitraje.
 */
export function startEngine() {
    console.log(`Motor de arbitraje iniciado. Chequeando cada ${CHECK_INTERVAL_MS / 1000} segundos...`);
    // Ejecuta la función inmediatamente y luego la repite en el intervalo definido
    checkArbitrageOpportunities();
    setInterval(checkArbitrageOpportunities, CHECK_INTERVAL_MS);
}
