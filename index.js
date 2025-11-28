import { startArbitrageEngine } from './services/arbitrage_engine.js';

/**
 * Función principal para iniciar la aplicación.
 */
function main() {
    console.log("Iniciando el motor de arbitraje...");
    
    // El par de trading que monitorearemos (ej. Bitcoin a Dólar Tether)
    const tradingPair = 'BTCUSDT'; 
    
    // Comenzar el monitoreo cada 5000 milisegundos (5 segundos)
    startArbitrageEngine(tradingPair, 5000); 
}

// Ejecutar la aplicación
main();
