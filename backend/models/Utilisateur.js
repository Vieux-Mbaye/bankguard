// backend/models/Utilisateur.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Schéma de l'utilisateur
const utilisateurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Email invalide']
  },
  motDePasse: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['client', 'agent', 'admin'],
    default: 'client'
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  numeroCompte: { type: String, required: false }
});

// Middleware : hacher le mot de passe avant sauvegarde
utilisateurSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Méthode pour comparer un mot de passe en clair avec le haché
utilisateurSchema.methods.verifierMotDePasse = async function (motDePasseEntree) {
  return await bcrypt.compare(motDePasseEntree, this.motDePasse);
};

// Exporter le modèle
module.exports = mongoose.model('Utilisateur', utilisateurSchema);
