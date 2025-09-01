// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../services/authService');

// Enregistrement d’un nouvel utilisateur
router.post('/register', async (req, res) => {
  const { nom, email, motDePasse, role } = req.body;
  try {
    const token = await register({ nom, email, motDePasse, role });
    res.status(201).json({ message: 'Inscription réussie', token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Connexion d’un utilisateur
router.post('/login', async (req, res) => {
  const { email, motDePasse } = req.body;
  try {
    const token = await login({ email, motDePasse });
    res.status(200).json({ message: 'Connexion réussie', token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
