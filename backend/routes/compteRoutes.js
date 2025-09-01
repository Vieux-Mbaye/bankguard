const express = require('express');
const router = express.Router();
const { creerCompte, consulterSolde, getComptesUtilisateur } = require('../controllers/compteController');
const authMiddleware = require('../middlewares/authMiddleware');

// Route pour créer un compte
router.post('/comptes', authMiddleware, creerCompte);

// Route pour consulter le solde d’un compte
router.get('/comptes/:numeroCompte', authMiddleware, consulterSolde);

router.get('/comptes', authMiddleware, getComptesUtilisateur);

module.exports = router;
