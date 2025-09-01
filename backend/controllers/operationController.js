const Compte = require('../models/Compte');
const Operation = require('../models/Operation');
const { journaliser } = require('../services/auditService');

async function effectuerOperation(req, res) {
  try {
    const { numeroCompte, type, montant } = req.body;

    if (!numeroCompte || !type || !montant || montant <= 0) {
      return res.status(400).json({ message: 'Données invalides' });
    }

    const compte = await Compte.findOne({ numeroCompte });
    if (!compte) {
      return res.status(404).json({ message: 'Compte introuvable' });
    }

    let soldeActuel = compte.soldeDecrypt;

    if (type === 'retrait') {
      if (soldeActuel < montant) {
        return res.status(400).json({ message: 'Solde insuffisant' });
      }
      compte.soldeDecrypt = soldeActuel - montant;
    } else if (type === 'depot') {
      compte.soldeDecrypt = soldeActuel + montant;
    } else {
      return res.status(400).json({ message: 'Type d\'opération invalide' });
    }

    const operation = new Operation({
      type,
      compteId: compte._id,
    });
    operation.montantDecrypt = montant;

    await operation.save();
    await compte.save();

    await journaliser(
      `Opération ${type}`,
      req.user?.nom || 'Client inconnu',
      `Opération ${type} de ${montant} sur le compte ${numeroCompte}`,
      {
        montant,
        compteSource: numeroCompte,
        compteDestination: null
      }
    );

    res.status(201).json({ message: 'Opération effectuée avec succès', operation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function effectuerVirement(req, res) {
  try {
    const { compteSource, compteDestinataire, montant } = req.body;
    const utilisateurId = req.user.id;

    if (!compteSource || !compteDestinataire || !montant || montant <= 0) {
      return res.status(400).json({ message: "Données invalides." });
    }

    if (compteSource === compteDestinataire) {
      return res.status(400).json({ message: "Impossible de virer vers le même compte." });
    }

    const source = await Compte.findOne({ numeroCompte: compteSource });
    const destination = await Compte.findOne({ numeroCompte: compteDestinataire });

    if (!source || !destination) {
      return res.status(404).json({ message: "Compte source ou destinataire introuvable." });
    }

    if (source.utilisateurId.toString() !== utilisateurId) {
      return res.status(403).json({ message: "Vous n’êtes pas propriétaire du compte source." });
    }

    const soldeSource = source.soldeDecrypt;
    const soldeDestination = destination.soldeDecrypt;

    if (soldeSource < montant) {
      return res.status(400).json({ message: "Solde insuffisant." });
    }

    source.soldeDecrypt = soldeSource - montant;
    destination.soldeDecrypt = soldeDestination + montant;

    const retrait = new Operation({
      type: 'virement',
      compteId: source._id,
      compteSource,
      compteDestination: compteDestinataire,
      description: `Virement envoyé vers ${compteDestinataire} - ${new Date().toLocaleString()}`,
      utilisateur: req.user.nom
    });
    retrait.montantDecrypt = montant;

    const reception = new Operation({
      type: 'virement',
      compteId: destination._id,
      compteSource,
      compteDestination: compteDestinataire,
      description: `Virement reçu de ${compteSource} - ${new Date().toLocaleString()}`,
      utilisateur: req.user.nom
    });
    reception.montantDecrypt = montant;

    await source.save();
    await destination.save();
    await retrait.save();
    await reception.save();

    await journaliser(
      'Virement',
      req.user.nom,
      `Virement de ${montant} FCFA de ${compteSource} vers ${compteDestinataire}`,
      {
        montant,
        compteSource,
        compteDestination: compteDestinataire
      }
    );

    res.status(200).json({ message: "Virement effectué avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur lors du virement." });
  }
}

async function consulterHistorique(req, res) {
  try {
    const numeroCompte = req.params.numeroCompte;

    const compte = await Compte.findOne({ numeroCompte });
    if (!compte) {
      return res.status(404).json({ message: 'Compte introuvable.' });
    }

    const operations = await Operation.find({ compteId: compte._id }).sort({ date: -1 });

    // Déchiffrer les montants avant de les renvoyer
    const resultat = operations.map(op => ({
      ...op.toObject(),
      montant: op.montantDecrypt
    }));

    res.status(200).json(resultat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
}

const statistiquesMensuelles = async (req, res) => {
  try {
    const numeroCompte = req.params.numeroCompte;
    const compte = await Compte.findOne({ numeroCompte });
    if (!compte) return res.status(404).json({ message: 'Compte introuvable.' });

    const operations = await Operation.find({ compteId: compte._id });

    const stats = {};
    operations.forEach(op => {
      const mois = new Date(op.date).toLocaleString('fr-FR', { month: 'short' });
      const montant = op.montantDecrypt;

      if (!stats[mois]) {
        stats[mois] = { mois, depots: 0, retraits: 0 };
      }

      if (op.type === 'depot' || op.type === 'dépôt') {
        stats[mois].depots += montant;
      } else if (op.type === 'retrait') {
        stats[mois].retraits += montant;
      }
    });

    const result = Object.values(stats).sort((a, b) => {
      const order = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
      return order.indexOf(a.mois) - order.indexOf(b.mois);
    });

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques' });
  }
};

module.exports = {
  effectuerOperation,
  effectuerVirement,
  consulterHistorique,
  statistiquesMensuelles
};
