// services/arbitrage_engine.js

import { getBinanceAccountBalance } from './binance_service.js';
// CORREGIDO: Importa la función con el nombre correcto: getBitbexAccountBalance
import { getBitbexAccountBalance } from './bitbex_service.js'; 

/**
 * Inicia el motor de arbitraje Inter-Exchange (Binance vs Bitbex).
 * Ejecuta pruebas de conexión y luego la lógica de arbitraje.
 */
export async function startInterArbitrage() {
    console.log('[DIAGNÓSTICO INTER-EXCHANGE] Verificando conexiones de exchanges...');

    // 1. Verificar Binance
    console.log('--- Diagnóstico Binance ---');
    const binanceStatus = await getBinanceAccountBalance();
    console.log(`[DIAGNÓSTICO BINANCE] Estado: ${binanceStatus.message}`);
    if (binanceStatus.success && binanceStatus.balances && binanceStatus.balances.length > 0) {
        console.log(`[INFO BINANCE] Balances encontrados: ${binanceStatus.balances.map(b => `${b.free} ${b.asset}`).join(', ')}`);
    } else if (binanceStatus.success && (!binanceStatus.balances || binanceStatus.balances.length === 0)) {
        console.log('[INFO BINANCE] Conexión OK, pero no se encontraron balances distintos de cero (¡Revisa si tienes fondos o si la clave tiene permiso de lectura!).');
    }

    // 2. Verificar Bitbex
    console.log('--- Diagnóstico Bitbex ---');
    // CORRECTO: Usamos la función con el nombre que BitbexService exporta
    const bitbexStatus = await getBitbexAccountBalance(); 
    console.log(`[DIAGNÓSTICO BITBEX] Estado: ${bitbexStatus.message}`);
    if (bitbexStatus.success && bitbexStatus.balances && bitbexStatus.balances.length > 0) {
        console.log(`[INFO BITBEX] Balances encontrados: ${bitbexStatus.balances.map(b => `${b.free} ${b.asset}`).join(', ')}`);
    } else if (bitbexStatus.success && (!bitbexStatus.balances || bitbexStatus.balances.length === 0)) {
        console.log('[INFO BITBEX] Conexión OK, pero no se encontraron balances distintos de cero (¡Revisa si tienes fondos!).');
    }

    if (binanceStatus.success && bitbexStatus.success) {
        console.log('\n[MOTOR INICIADO] ¡Ambos exchanges están configurados y autenticados! Iniciando el ciclo de arbitraje...');
        
        // --- BUCLE PRINCIPAL DE ARBITRAJE INTER-EXCHANGE ---
        
        setInterval(() => {
            // Lógica principal: 
            // 1. Obtener libros de órdenes de ambos exchanges.
            // 2. Comparar Bid más alto de A con Ask más bajo de B.
            // 3. Ejecutar órdenes si la oportunidad es mayor al spread (comisiones).
        }, 5000); // Escanear cada 5 segundos
        
    } else {
        console.error('\n[MOTOR DETENIDO] No se puede iniciar el arbitraje inter-exchange. Revisa los errores de autenticación anteriores.');
    }
}

/**
 * Inicia el motor de arbitraje Intra-Exchange (Solo Binance).
 */
export function startIntraArbitrage() {
    console.log('[DIAGNÓSTICO INTRA-EXCHANGE] Verificando conexión de Binance...');
    
    // (Aquí se verificaría la conexión de Binance si no se hizo antes)

    console.log('[MOTOR INICIADO] Iniciando el ciclo de arbitraje intra-exchange de Binance...');
    
    setInterval(() => {
        // Lógica de arbitraje triangular (tres pares).
    }, 10000); // Escanear cada 10 segundos
}
