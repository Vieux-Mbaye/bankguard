const express = require('express');
const router = express.Router();
const { effectuerOperation, consulterHistorique } = require('../controllers/operationController');

// Route POST
router.post('/operations', effectuerOperation);

// Nouvelle route : consulter historique d’un compte
router.get('/operations/:numeroCompte', consulterHistorique);

module.exports = router;
