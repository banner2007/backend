<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Motor de Arbitraje Cripto</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gray-100 min-h-screen flex flex-col items-center p-4">
    <div class="container max-w-3xl bg-white shadow-xl rounded-xl p-6 md:p-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Motor de Arbitraje Cripto</h1>
        <p class="text-gray-600 mb-6">Monitoreando BTCUSDT en Binance y Bitbex (simulado).</p>
        
        <div id="output" class="bg-gray-800 text-green-400 p-4 rounded-lg shadow-inner h-64 overflow-y-auto font-mono text-sm">
            <div id="log-messages">Esperando el inicio del motor...</div>
        </div>

        <p class="mt-4 text-sm text-gray-500">
            Los resultados se mostrarán en la consola y en el recuadro superior.
        </p>
    </div>

    <!-- 
        El script principal debe cargarse como un módulo para usar las sentencias 'import' y 'export'.
        Esto ejecuta index.js, que a su vez llama a arbitrage_engine.js.
    -->
    <script type="module" src="index.js"></script>

    <script>
        // Función para redirigir los mensajes de la consola al div de salida en el HTML.
        (function() {
            const originalLog = console.log;
            const originalError = console.error;
            const logElement = document.getElementById('log-messages');
            
            function appendLog(message, isError = false) {
                const now = new Date().toLocaleTimeString();
                const line = document.createElement('div');
                line.textContent = `[${now}] ${message}`;
                line.className = isError ? 'text-red-500' : (message.includes('OPORTUNIDAD') ? 'text-yellow-300 font-bold' : 'text-green-400');
                
                if (logElement) {
                    logElement.appendChild(line);
                    logElement.scrollTop = logElement.scrollHeight; // Scroll automático
                }
            }

            console.log = function(...args) {
                originalLog.apply(console, args);
                appendLog(args.join(' '));
            };

            console.error = function(...args) {
                originalError.apply(console, args);
                appendLog(args.join(' '), true);
            };
        })();
    </script>
</body>
</html>
