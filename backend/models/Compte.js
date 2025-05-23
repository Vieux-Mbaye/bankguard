const mongoose = require('mongoose');

const compteSchema = new mongoose.Schema({
  numeroCompte: { type: String, required: true, unique: true },
  solde: { type: Number, default: 0 },
  dateOuverture: { type: Date, default: Date.now },
  status: { type: String, default: 'Actif' }
});

module.exports = mongoose.model('Compte', compteSchema);
