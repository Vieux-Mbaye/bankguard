// services/authService.js
require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');
const { journaliser } = require('./auditService');
const Compte = require('../models/Compte');

// Nombre de salages pour bcrypt
const SALT_ROUNDS = 12;

// Clé secrète JWT (à placer dans .env)
const JWT_SECRET = process.env.JWT_SECRET || 'bankguardsecret';

/**
 * Enregistrer un nouvel utilisateur (register)
 */
async function register({ nom, email, motDePasse, role, numeroCompte }) {
  const existing = await Utilisateur.findOne({ email });
  if (existing) {
    // Journaliser la tentative d'inscription avec email déjà utilisé
    await journaliser(
      'Tentative inscription échouée',
      nom || 'Inconnu',
      `Email déjà utilisé : ${email}`
    );

    throw new Error('Cet email est déjà utilisé.');
  }

  const hash = await bcrypt.hash(motDePasse, SALT_ROUNDS);

  const utilisateur = new Utilisateur({
    nom,
    email,
    motDePasse,
    role,
    numeroCompte
  });

  await utilisateur.save();
  // Journaliser la réussite de l'inscription
  await journaliser(
    'Inscription',
    utilisateur.nom,
    `Nouvel utilisateur inscrit : ${utilisateur.email}`
  );

  return { message: 'Utilisateur enregistré avec succès.' };
}

/**
 * Connexion (login)
 */
async function login({ email, motDePasse }) {
  const utilisateur = await Utilisateur.findOne({ email });
  if (!utilisateur) {
    // Journaliser tentative échouée avec email inexistant
    await journaliser(
      'Connexion échouée',
      'Inconnu',
      `Email non trouvé : ${email}`
    );
    throw new Error('Utilisateur introuvable.');
  }

  const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
  if (!valide) {

    // Journaliser mot de passe invalide
    await journaliser(
      'Connexion échouée',
      utilisateur.nom,
      `Mot de passe invalide pour : ${email}`
    );
    throw new Error('Mot de passe invalide.');
  }

  // Récupérer le compte lié à l’utilisateur
  const compte = await Compte.findOne({ utilisateurId: utilisateur._id });

  // Journaliser connexion réussie
  await journaliser(
    'Connexion',
    utilisateur.nom,
    `Utilisateur connecté : ${email}`
  );

  const token = jwt.sign(
    { id: utilisateur._id, role: utilisateur.role, nom: utilisateur.nom },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { token, utilisateur: { id: utilisateur._id, nom: utilisateur.nom, role: utilisateur.role, numeroCompte: compte?.numeroCompte || null } };
}

module.exports = { register, login };
