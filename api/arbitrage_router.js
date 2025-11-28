import { Router } from 'express';
import { getEngineStatus, startArbitrageEngine } from '../services/arbitrage_engine.js';

const router = Router();

// Endpoint para obtener el estado del motor
router.get('/status', (req, res) => {
    const status = getEngineStatus();
    res.json(status);
});

// Endpoint para iniciar el motor
// En un entorno real, esto debería estar protegido (POST)
router.post('/start', (req, res) => {
    const message = startArbitrageEngine();
    res.json({ message, status: getEngineStatus() });
});

export default router;