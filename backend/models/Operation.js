const mongoose = require('mongoose');
const { chiffrer, dechiffrer } = require('../services/cryptoService');

const operationSchema = new mongoose.Schema({
  type: { type: String, enum: ['depot', 'retrait', 'virement'], required: true },

  montant: { type: Number },       // ancien
  montantChiffre: { type: String }, // nouveau

  description: String,
  date: { type: Date, default: Date.now },
  compteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true },
  utilisateur: String,
  compteSource: String,
  compteDestination: String
});

// Accès universel
operationSchema.virtual('montantDecrypt')
  .get(function () {
    if (this.montantChiffre) {
      return Number(dechiffrer(this.montantChiffre));
    }
    return this.montant; // fallback
  })
  .set(function (val) {
    this.montantChiffre = chiffrer(val.toString());
  });

operationSchema.pre('save', function (next) {
  if (!this.montantChiffre && this.montant != null) {
    this.montantDecrypt = this.montant;
  }
  next();
});

module.exports = mongoose.model('Operation', operationSchema);
