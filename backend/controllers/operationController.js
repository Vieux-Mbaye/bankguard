const Compte = require('../models/Compte');
const Operation = require('../models/Operation');
const { journaliser } = require('../services/auditService');

async function effectuerOperation(req, res) {
  try {
    const { numeroCompte, type, montant } = req.body;

    // Vérifier les données
    if (!numeroCompte || !type || !montant || montant <= 0) {
      return res.status(400).json({ message: 'Données invalides' });
    }

    const compte = await Compte.findOne({ numeroCompte });
    if (!compte) {
      return res.status(404).json({ message: 'Compte introuvable' });
    }

    if (type === 'retrait') {
      if (compte.solde < montant) {
        return res.status(400).json({ message: 'Solde insuffisant' });
      }
      compte.solde -= montant;
    } else if (type === 'depot') {
      compte.solde += montant;
    } else {
      return res.status(400).json({ message: 'Type d\'opération invalide' });
    }

    // Sauvegarder la nouvelle opération
    const operation = new Operation({
      type,
      montant,
      compteId: compte._id
    });

    await operation.save();
    await compte.save();

    // Journalisation
    await journaliser(
      `Opération ${type}`,
      'Client inconnu',
      `Opération ${type} de ${montant} sur compte ${numeroCompte}`
    );

    res.status(201).json({ message: 'Opération effectuée avec succès', operation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// module.exports = { effectuerOperation };

// Fonction pour consulter l’historique des opérations
async function consulterHistorique(req, res) {
  try {
    const numeroCompte = req.params.numeroCompte;

    const compte = await Compte.findOne({ numeroCompte });

    if (!compte) {
      return res.status(404).json({ message: 'Compte introuvable.' });
    }

    const operations = await Operation.find({ compteId: compte._id })
                                      .sort({ date: -1 }); // ordre descendant

    // Journaliser l’accès
    await journaliser(
      'Consultation historique',
      'Client inconnu',
      `Consultation de l’historique du compte ${numeroCompte}`
    );

    res.status(200).json(operations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = {
  effectuerOperation,
  consulterHistorique
};
