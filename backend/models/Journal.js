const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  action: { type: String, required: true },        // Ex: "Création de compte"
  utilisateur: { type: String, default: 'Inconnu' }, // Qui a fait l'action (anonyme pour Alpha)
  description: { type: String },                   // Détail optionnel
  date: { type: Date, default: Date.now },           // Date de l'action

  montant: Number,
  compteSource: String,
  compteDestination: String,
  anciennete_jours: Number,
  solde_avant: Number,
  heure: Number,
  nouveau_beneficiaire: Number,
  nb_virements_1h: Number,
  changement_mdp: Number,
  minutes_depuis_chg_mdp: Number,
  localisation: Number,
  nb_virements_vers_benef: Number,

});

module.exports = mongoose.model('Journal', journalSchema);
