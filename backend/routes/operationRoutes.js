const express = require('express');
const router = express.Router();
const { effectuerOperation, consulterHistorique, statistiquesMensuelles, effectuerVirement } = require('../controllers/operationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Route POST
router.post('/operations', authMiddleware, effectuerOperation);

// Nouvelle route : consulter historique d’un compte
router.get('/operations/:numeroCompte', authMiddleware, consulterHistorique);

router.get('/stats/:numeroCompte', authMiddleware, statistiquesMensuelles);

router.post('/virement', authMiddleware, effectuerVirement);

module.exports = router;
