// services/arbitrage_engine.js

import { getOrderBook, getAccountBalance } from './bitbex_service.js'; // Asumiendo que getAccountBalance está aquí

// ----------------------------------------------------------------------
// --- FUNCIONES DE PRUEBA TEMPORAL PARA LA CONEXIÓN DE BITBEX ---
// ----------------------------------------------------------------------

async function checkBitbexConnection() {
    console.log('[PRUEBA BITBEX] Iniciando prueba de conexión con saldo privado...');
    
    // 1. Prueba de Precios Públicos (Debe funcionar siempre, sin claves)
    try {
        const prices = await getOrderBook('BTCUSDT'); // Cambia a un par válido en Bitbex
        console.log(`[PRUEBA BITBEX] ✔ Precios Públicos (Order Book) obtenidos: Bid=${prices.bestBid}, Ask=${prices.bestAsk}`);
    } catch (error) {
        console.error('[PRUEBA BITBEX] ❌ ERROR al obtener Precios Públicos (URL o par incorrecto):', error.message);
    }
    
    // 2. Prueba de Saldo Privado (Requiere API Key y Firma Correcta)
    try {
        const balance = await getAccountBalance(); // Llama al endpoint de saldo
        
        if (balance && balance.balances) {
            console.log('[PRUEBA BITBEX] ✅ CONEXIÓN EXITOSA: El API Key y la Firma son correctos.');
            // Muestra un ejemplo de saldo (reemplaza 'USDT' si Bitbex usa otro formato)
            const usdtBalance = balance.balances.find(b => b.asset === 'USDT' || b.asset === 'USD'); 
            console.log(`[PRUEBA BITBEX] Saldo disponible de USDT (ejemplo): ${usdtBalance ? usdtBalance.free : 'No encontrado'}`);
        } else {
            // Esto puede ocurrir si el API devuelve un 200 pero un objeto vacío o inesperado
            console.warn('[PRUEBA BITBEX] ⚠️ Respuesta inesperada, pero sin error de autorización. Revisa el formato de la respuesta:', balance);
        }
    } catch (error) {
        // Un error 401/403 de Bitbex significaría que la API Key o la firma están MAL
        if (error.message.includes('401') || error.message.includes('403')) {
            console.error('[PRUEBA BITBEX] ❌ ERROR FATAL DE AUTORIZACIÓN (401/403). La API Key o la Firma de Bitbex son incorrectas.');
        } else {
            console.error('[PRUEBA BITBEX] ❌ ERROR de Red/Servidor Bitbex (Revisa logs):', error.message);
        }
    }
}

// ----------------------------------------------------------------------
// --- MOTORES DE ARBITRAJE ---
// ----------------------------------------------------------------------

/**
 * [PLACEHOLDER] Inicia el motor de arbitraje intra-exchange (solo Binance).
 */
function startIntraArbitrage() {
    console.log('----------------------------------------------------');
    console.log('--- Motor Intra-Exchange (Solo Binance) ACTIVADO ---');
    console.log('----------------------------------------------------');
    // ... Tu lógica de arbitraje triangular de Binance va aquí
    console.log('Lógica de arbitraje INTRA-EXCHANGE cargada. Reemplaza este placeholder con tu código.');
}

/**
 * Inicia el motor de arbitraje inter-exchange (Binance vs Bitbex).
 * También inicia la prueba de conexión al principio.
 */
async function startInterArbitrage() {
    console.log('---------------------------------------------------------');
    console.log('--- Motor Inter-Exchange (Binance vs Bitbex) ACTIVADO ---');
    console.log('---------------------------------------------------------');

    // Ejecuta la prueba de conexión antes de iniciar el bucle de arbitraje
    await checkBitbexConnection(); 
    
    console.log('\n[INFO] Iniciando bucle de arbitraje de precios...');

    // ... (El resto de tu lógica de bucle de arbitraje Inter-Exchange va aquí)
    const symbol = 'BTCUSDT'; 
    setInterval(async () => {
        // ... (Tu lógica de comparación de precios entre Binance y Bitbex)
        // ...
        
    }, 5000); 
}

export {
    startIntraArbitrage,
    startInterArbitrage,
};
