const mongoose = require('mongoose');
const { chiffrer, dechiffrer } = require('../services/cryptoService');

const compteSchema = new mongoose.Schema({
  numeroCompte: { type: String, required: true, unique: true },

  // On garde le champ historique 'solde' ET on ajoute le nouveau
  solde: { type: Number, default: 0 }, // ancien champ clair (encore lu)
  soldeChiffre: { type: String },      // nouveau champ chiffré

  status: { type: String, default: 'Actif' },
  utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  dateOuverture: { type: Date, default: Date.now }
});

// Getter universel du solde
compteSchema.virtual('soldeDecrypt')
  .get(function () {
    if (this.soldeChiffre) {
      return Number(dechiffrer(this.soldeChiffre));
    }
    return this.solde; // fallback champ historique
  });

// Setter (à utiliser dans les nouveaux contrôleurs)
compteSchema.virtual('soldeDecrypt')
  .set(function (val) {
    this.soldeChiffre = chiffrer(val.toString());
  });

compteSchema.pre('save', function (next) {
  if (!this.soldeChiffre && this.solde != null) {
    this.soldeDecrypt = this.solde;
  }
  next();
});

module.exports = mongoose.model('Compte', compteSchema);
