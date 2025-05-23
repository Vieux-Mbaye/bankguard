const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
  type: { type: String, enum: ['depot', 'retrait'], required: true },
  montant: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  compteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true }
});

module.exports = mongoose.model('Operation', operationSchema);
