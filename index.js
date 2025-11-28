// index.js
import express from 'express'; // <--- CORRECCIÓN IMPORTANTE: Importación de Express
import cors from 'cors';
import { startArbitrageEngine } from './services/arbitrage_engine.js';
// ... más importaciones si tienes

// La forma correcta de importar Express en un módulo ES
// const express = require('express'); // <-- Esto NO funciona con el modo "type": "module"

const PORT = process.env.PORT || 8080;
const ARBITRAGE_MODE = process.env.ARBITRAGE_MODE || 'WEB_ONLY';

// --- INICIO DE CONFIGURACIÓN DEL SERVICIO ---
console.log('--- INICIO DE CONFIGURACIÓN DEL SERVICIO ---');
console.log(`[INFO] Puerto de escucha: ${PORT}`);
console.log(`[INFO] Modo de Arbitraje Solicitado: ${ARBITRAGE_MODE}`);
console.log(`[INFO] Estado de BINANCE_API_KEY: ${process.env.BINANCE_API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
console.log(`[INFO] Estado de BINANCE_SECRET_KEY: ${process.env.BINANCE_SECRET_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
console.log(`[INFO] Estado de BITBEX_API_KEY: ${process.env.BITBEX_API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
console.log(`[INFO] Estado de BITBEX_SECRET_KEY: ${process.env.BITBEX_SECRET_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
console.log('--------------------------------------------');

// Inicializa el motor de arbitraje (diagnóstico)
startArbitrageEngine();

// --- CONFIGURACIÓN DEL SERVIDOR WEB (EXPRESS) ---

// Línea 66 que estaba causando el error:
const app = express(); 

app.use(cors());
app.use(express.json());

// Ruta de Salud (Health Check)
app.get('/', (req, res) => {
    res.status(200).send({ 
        message: 'Arbitrage Backend Running.',
        mode: ARBITRAGE_MODE,
        diagnostics: 'Run /api/v1/diagnostics to check exchange status.'
    });
});

// Ruta de diagnóstico (necesitas crear esta en tu archivo routes/diagnostics.js)
// app.get('/api/v1/diagnostics', getDiagnostics); 

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`[WEB] Servidor Express escuchando en el puerto ${PORT}`);
});
