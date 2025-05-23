const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  action: { type: String, required: true },        // Ex: "Création de compte"
  utilisateur: { type: String, default: 'Inconnu' }, // Qui a fait l'action (anonyme pour Alpha)
  description: { type: String },                   // Détail optionnel
  date: { type: Date, default: Date.now }           // Date de l'action
});

module.exports = mongoose.model('Journal', journalSchema);
