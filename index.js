// index.js
// El punto de entrada de la aplicación.
// Este script inicializa el motor de arbitraje.

// Importa la función de inicio del motor desde el archivo arbitrage_engine.js.
import { startEngine } from './arbitrage_engine.js';

/**
 * Función que se ejecuta al iniciar la aplicación en Node.js.
 */
function initializeApp() {
    console.log("Aplicación de Arbitraje Cripto inicializando...");
    
    // Llama a la función que inicia el bucle de chequeo de precios y lógica de arbitraje.
    startEngine();
}

// Ejecutamos la función de inicialización para poner el bot en marcha.
initializeApp();
