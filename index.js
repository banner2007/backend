// index.js
// El punto de entrada de la aplicación.
// Ahora incluye un servidor web Express para cumplir con los requisitos de la plataforma (Railway)
// y permite consultar el estado del bot mediante una URL.

import express from 'express';
import { startEngine } from './arbitrage_engine.js';

// Usamos el puerto proporcionado por el entorno de Railway (o 8080 como predeterminado).
const PORT = process.env.PORT || 8080;
const app = express();

/**
 * Función que inicializa tanto el servidor web como el motor de arbitraje.
 */
function initializeApp() {
    console.log("Aplicación de Arbitraje Cripto inicializando...");
    
    // 1. Inicia la lógica de arbitraje (el bucle de 5 segundos)
    startEngine();
    
    // 2. Configura las rutas del servidor web

    // Ruta principal para verificar el estado
    app.get('/', (req, res) => {
        res.send('El motor de Arbitraje Cripto está funcionando en segundo plano. Revisa la consola para los logs de las oportunidades.');
    });
    
    // Ruta específica para la IP, como solicitaste
    app.get('/ip', (req, res) => {
        // req.ip obtiene la dirección IP del cliente (o del proxy/balanceador de carga)
        const clientIp = req.ip; 
        res.json({ 
            status: 'Running', 
            service: 'Arbitraje Bot', 
            message: 'Servidor Express activo y motor de arbitraje iniciado.',
            client_ip: clientIp 
        });
    });

    // 3. Levanta el servidor Express
    app.listen(PORT, () => {
        console.log(`Servidor web Express escuchando en el puerto ${PORT}`);
        console.log(`URL de estado: http://localhost:${PORT}/`);
    });
}

// Ejecutamos la función de inicialización.
initializeApp();
