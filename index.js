// index.js
// El punto de entrada de la aplicación, incluyendo el servidor Express.

import express from 'express';
import { startEngine } from './arbitrage_engine.js';

// Usamos el puerto proporcionado por el entorno de Railway (o 8080 como predeterminado).
const PORT = process.env.PORT || 8080;
const app = express();

/**
 * 1. Levanta el servidor Express
 * Es fundamental que esta parte se ejecute primero y empiece a escuchar en el puerto.
 */
app.listen(PORT, () => {
    console.log(`Servidor web Express escuchando en el puerto ${PORT}`);
    console.log(`URL de estado: http://localhost:${PORT}/`);
    
    // 2. Inicia la lógica de arbitraje SOLO después de que el servidor esté activo y escuchando.
    startEngine();
});


// --- Configuración de Rutas ---

// Ruta principal para verificar el estado
app.get('/', (req, res) => {
    res.send('El motor de Arbitraje Cripto está funcionando en segundo plano. Revisa la consola para los logs de las oportunidades.');
});

// Ruta específica para la IP
app.get('/ip', (req, res) => {
    const clientIp = req.ip; 
    res.json({ 
        status: 'Running', 
        service: 'Arbitraje Bot', 
        message: 'Servidor Express activo y motor de arbitraje iniciado.',
        client_ip: clientIp 
    });
});
