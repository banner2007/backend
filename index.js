// index.js

import express from 'express';
import { getOrderBook, placeOrder } from './services/binance_service.js'; 
import { startIntraArbitrage, startInterArbitrage } from './services/arbitrage_engine.js';

// ----------------------------------------------------------------------
// --- Configuración de Variables y Modos de Ejecución ---
// ----------------------------------------------------------------------

const ARBITRAGE_MODE = process.env.ARBITRAGE_MODE || 'WEB_ONLY'; 
const PORT = process.env.PORT || 3000;
const BINANCE_KEY = process.env.BINANCE_API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA';
const BITBEX_KEY = process.env.BITBEX_API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA';

console.log('--- INICIO DE CONFIGURACIÓN DEL SERVICIO ---');
console.log(`[INFO] Puerto de escucha: ${PORT}`);
console.log(`[INFO] Modo de Arbitraje Solicitado: ${ARBITRAGE_MODE}`);
console.log(`[INFO] Estado de BINANCE_API_KEY: ${BINANCE_KEY}`);
console.log(`[INFO] Estado de BITBEX_API_KEY: ${BITBEX_KEY}`);
console.log('--------------------------------------------');


// ----------------------------------------------------------------------
// --- Lógica de Inicio (Bifurcación por Modo) ---
// ----------------------------------------------------------------------

if (ARBITRAGE_MODE === 'INTER_EXCHANGE') {
    
    console.log('Motor de Arbitraje: MODO INTER-EXCHANGE (Binance vs Bitbex) iniciado.');
    startInterArbitrage(); // Esto ejecuta la prueba de conexión a Bitbex
    
    // NOTA: En este modo, el servidor Express NO es necesario si solo es el motor. 
    // Lo desactivamos para ahorrar recursos si el modo es INTER-EXCHANGE.

} else if (ARBITRAGE_MODE === 'INTRA_EXCHANGE') {
    
    console.log('Motor de Arbitraje: MODO INTRA-EXCHANGE (Solo Binance) iniciado.');
    startIntraArbitrage();

    // Inicializar Express para rutas web
    const app = express();
    app.use(express.json());

    // Rutas de ejemplo (solo disponibles si el modo no es INTER_EXCHANGE)
    app.get('/binance/book/:symbol', async (req, res) => {
        try {
            const book = await getOrderBook(req.params.symbol);
            res.json(book);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    });

    app.listen(PORT, () => {
        console.log(`Servidor de Binance corriendo en puerto ${PORT}`);
    });
    
} else if (ARBITRAGE_MODE === 'WEB_ONLY') {
    
    // Inicializar Express para rutas web (similar a INTRA_EXCHANGE pero sin motor de arbitraje)
    const app = express();
    app.use(express.json());

    app.get('/binance/book/:symbol', async (req, res) => {
        try {
            const book = await getOrderBook(req.params.symbol);
            res.json(book);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    });

    app.listen(PORT, () => {
        console.log(`Servidor de Binance (Modo WEB_ONLY) corriendo en puerto ${PORT}`);
    });

} else {
    // Si se pasa cualquier otro valor desconocido
    console.error(`ERROR: ARBITRAGE_MODE desconocido: ${ARBITRAGE_MODE}. No se iniciará ningún motor.`);
}
