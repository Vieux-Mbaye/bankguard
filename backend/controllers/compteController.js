const Compte = require('../models/Compte');
const { journaliser } = require('../services/auditService');

// Fonction pour créer un nouveau compte
async function creerCompte(req, res) {
  try {
    const { numeroCompte, soldeInitial } = req.body;

    // Vérifier que le numéro n'existe pas déjà
    const compteExiste = await Compte.findOne({ numeroCompte });
    if (compteExiste) {
      return res.status(400).json({ message: 'Compte déjà existant.' });
    }

    // Créer un nouveau compte
    const nouveauCompte = new Compte({
      numeroCompte,
      solde: soldeInitial || 0
    });

    await nouveauCompte.save();

    // Journaliser la création
    await journaliser('Création de compte', 'Agent inconnu', `Compte ${numeroCompte} créé.`);

    res.status(201).json({ message: 'Compte créé avec succès.', compte: nouveauCompte });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la création du compte.' });
  }
}

// module.exports = { creerCompte };


// Nouvelle fonction : consulter le solde d’un compte
async function consulterSolde(req, res) {
  try {
    const numeroCompte = req.params.numeroCompte;

    const compte = await Compte.findOne({ numeroCompte });

    if (!compte) {
      return res.status(404).json({ message: 'Compte introuvable.' });
    }

    // Journaliser la consultation
    await journaliser(
      'Consultation de solde',
      'Client inconnu',
      `Consultation du solde du compte ${numeroCompte}`
    );

    res.status(200).json({
      numeroCompte: compte.numeroCompte,
      solde: compte.solde,
      statut: compte.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = {
  creerCompte,
  consulterSolde // <--- n'oublie pas de l'exporter ici !
};
