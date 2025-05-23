const express = require('express');
const router = express.Router();
const { creerCompte, consulterSolde } = require('../controllers/compteController');

// Route pour créer un compte
router.post('/comptes', creerCompte);

// Route pour consulter le solde d’un compte
router.get('/comptes/:numeroCompte', consulterSolde);

module.exports = router;
