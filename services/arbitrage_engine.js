// arbitrage_engine.js
// Contiene la lógica para conectarse a Binance, obtener datos y detectar oportunidades.

import Binance from 'node-binance-api';

// --- CONFIGURACIÓN CRÍTICA ---
// ¡ADVERTENCIA! Reemplaza estos con tus credenciales reales de Binance.
// Mantenerlas en una variable de entorno es la práctica más segura en producción.
const BINANCE_API_KEY = "TU_CLAVE_API_AQUI"; 
const BINANCE_API_SECRET = "TU_SECRETO_API_AQUI";
// -----------------------------

const binance = new Binance().options({
    APIKEY: BINANCE_API_KEY,
    APISECRET: BINANCE_API_SECRET
});

// Símbolos que queremos monitorear para arbitraje triangular (ejemplo: BTC/USDT, ETH/BTC, ETH/USDT)
const symbols = ['ETHBTC', 'BTCUSDT', 'ETHUSDT']; 
const CHECK_INTERVAL_MS = 5000; // Frecuencia de chequeo (cada 5 segundos)

/**
 * Función para simular la detección de arbitraje triangular.
 * El arbitraje triangular implica 3 pares de divisas: A/B, B/C, y A/C.
 * Ejemplo: Comprar BTC con USDT, Comprar ETH con BTC, y Vender ETH por USDT.
 */
async function checkArbitrageOpportunity() {
    console.log(`[${new Date().toLocaleTimeString()}] Buscando oportunidades de arbitraje...`);

    try {
        // 1. Obtener todos los tickers de precios de un solo golpe.
        // Esto reduce las llamadas a la API en comparación con pedir cada par individualmente.
        const tickers = await binance.prices();

        // 2. Definir los tres pares para el triángulo BTC-ETH-USDT
        // Ruta de la operación simulada: USDT -> BTC -> ETH -> USDT
        const pair1 = 'BTCUSDT'; // Primer paso
        const pair2 = 'ETHBTC';  // Segundo paso
        const pair3 = 'ETHUSDT'; // Tercer paso (cierre del ciclo)
        
        // Obtenemos los precios más recientes.
        const price1 = parseFloat(tickers[pair1]); 
        const price2 = parseFloat(tickers[pair2]);
        const price3 = parseFloat(tickers[pair3]);

        if (isNaN(price1) || isNaN(price2) || isNaN(price3)) {
            console.warn("Advertencia: No se pudieron obtener todos los precios para el triángulo BTC-ETH-USDT.");
            return;
        }

        // 3. Simular la operación:
        // Comenzamos con 1 USDT.
        // Formula: (1 / Precio A/B) * (1 / Precio B/C) * (Precio A/C)
        // Formula para este ejemplo: (1 / BTCUSDT) * (1 / ETHBTC) * (ETHUSDT)

        const finalUSDT = (1 / price1) * (1 / price2) * price3;
        const profitLoss = finalUSDT - 1; // Beneficio o pérdida por 1 USDT invertido.

        console.log(`\n--- Cálculo de Arbitraje (BTC/ETH/USDT) ---`);
        console.log(`1. BTCUSDT Price: ${price1}`);
        console.log(`2. ETHBTC Price:  ${price2}`);
        console.log(`3. ETHUSDT Price: ${price3}`);
        console.log(`Resultado final (por 1 USDT): ${finalUSDT.toFixed(8)} USDT`);
        console.log(`Beneficio/Pérdida Neto: ${ (profitLoss * 100).toFixed(4) }%`);
        
        const MIN_PROFIT = 0.0005; // 0.05% de beneficio mínimo, para cubrir comisiones

        if (profitLoss > MIN_PROFIT) {
            console.log("-----------------------------------------");
            console.log(`🤑 ¡OPORTUNIDAD DE ARBITRAJE ENCONTRADA! 🤑`);
            console.log(`Potencial de Ganancia: +${(profitLoss * 100).toFixed(4)}%`);
            // Aquí iría la lógica real para ejecutar las órdenes de Binance:
            // binance.marketSell('BTCUSDT', amount)
            // binance.marketSell('ETHBTC', amount)
            // binance.marketBuy('ETHUSDT', amount)
            console.log("-----------------------------------------");
        } else {
            console.log(`Sin oportunidad de arbitraje rentable (necesita >${(MIN_PROFIT * 100)}%)`);
        }

    } catch (error) {
        // En caso de problemas de conexión o errores de la API.
        console.error("Error en la detección de arbitraje:", error.message);
    }
}

/**
 * Inicia el bucle principal del motor de arbitraje.
 * Esta función es exportada para ser utilizada por index.js.
 */
export function startEngine() {
    console.log("Motor de arbitraje iniciado. Chequeando cada 5 segundos...");
    // Ejecuta la función por primera vez inmediatamente.
    checkArbitrageOpportunity(); 
    // Luego, establece un intervalo para ejecutarla periódicamente.
    setInterval(checkArbitrageOpportunity, CHECK_INTERVAL_MS);
}
