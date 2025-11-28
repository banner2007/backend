// index.js
// El punto de entrada de la aplicación.
// Este script inicializa el motor de arbitraje.

// Importa la función de inicio del motor.
// Asegúrate de que este archivo exista y contenga la función 'startEngine'.
import { startEngine } from './arbitrage_engine.js';

/**
 * Función que se ejecuta al iniciar la aplicación.
 * En un entorno Node.js, esta es la primera función que se llama.
 */
function initializeApp() {
    console.log("Aplicación de Arbitraje Cripto inicializando...");
    
    // Inicia el bucle principal del motor de arbitraje.
    // Llama a la función asíncrona (si lo es) para empezar a monitorear.
    startEngine();
}

// Para Node.js, simplemente llamamos a la función de inicialización directamente.
// Si esto fuera un frontend, usaríamos document.addEventListener('DOMContentLoaded').
initializeApp();
