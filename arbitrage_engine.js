// arbitrage_engine.js
// Contiene la lógica para conectarse a Binance, obtener datos y detectar oportunidades.

import Binance from 'node-binance-api';

// --- CONFIGURACIÓN CRÍTICA ---
// ¡ADVERTENCIA! Reemplaza estos con tus credenciales reales de Binance.
// Mantenerlas en una variable de entorno es la práctica más segura en producción.
const BINANCE_API_KEY = "FxB8Q4wxSpV9ZrKYbzQcCjwZoZJU2H4DIYVumtbnI9pXLqZ0cR7YzxAuCeXzfVrd"; 
const BINANCE_API_SECRET = "k8vEfbCKNQ6CQJzFPeF96VgoayhJFrKT5Jj9jv834uYWZDG3ot09C2PJyHiBHpX6";
// -----------------------------

// Inicializa la conexión a la API de Binance
const binance = new Binance().options({
    APIKEY: BINANCE_API_KEY,
    APISECRET: BINANCE_API_SECRET
});

const CHECK_INTERVAL_MS = 5000; // Frecuencia de chequeo (cada 5 segundos)

/**
 * Función para simular la detección de arbitraje triangular (BTC/ETH/USDT).
 */
async function checkArbitrageOpportunity() {
    console.log(`[${new Date().toLocaleTimeString()}] Buscando oportunidades de arbitraje...`);

    try {
        // 1. Obtener todos los precios de los tickers
        const tickers = await binance.prices();

        // 2. Pares para el triángulo (Ejemplo de ruta: USDT -> BTC -> ETH -> USDT)
        const pair1 = 'BTCUSDT'; 
        const pair2 = 'ETHBTC';  
        const pair3 = 'ETHUSDT'; 
        
        // Obtenemos los precios.
        const price1 = parseFloat(tickers[pair1]); 
        const price2 = parseFloat(tickers[pair2]);
        const price3 = parseFloat(tickers[pair3]);

        if (isNaN(price1) || isNaN(price2) || isNaN(price3)) {
            console.warn("Advertencia: No se pudieron obtener todos los precios para el triángulo BTC-ETH-USDT. Verifique que los símbolos existan o la conexión.");
            return;
        }

        // 3. Simulación de la Ganancia Bruta
        // Ganancia Bruta = (1 / P1) * (1 / P2) * P3
        const finalUSDT = (1 / price1) * (1 / price2) * price3;
        const profitLoss = finalUSDT - 1; 

        console.log(`\n--- Cálculo de Arbitraje (BTC/ETH/USDT) ---`);
        console.log(`Pares: ${pair1}, ${pair2}, ${pair3}`);
        console.log(`Resultado final (por 1 USDT): ${finalUSDT.toFixed(8)} USDT`);
        console.log(`Beneficio/Pérdida Neto: ${ (profitLoss * 100).toFixed(4) }%`);
        
        const MIN_PROFIT = 0.0005; // 0.05% de beneficio mínimo

        if (profitLoss > MIN_PROFIT) {
            console.log("-----------------------------------------");
            console.log(`🤑 ¡OPORTUNIDAD DE ARBITRAJE ENCONTRADA! 🤑`);
            console.log(`Potencial de Ganancia: +${(profitLoss * 100).toFixed(4)}%`);
            console.log("-----------------------------------------");
        } else {
            console.log(`Sin oportunidad de arbitraje rentable (necesita >${(MIN_PROFIT * 100)}%)`);
        }

    } catch (error) {
        console.error("Error en la detección de arbitraje (¿Credenciales de API correctas?):", error.message);
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