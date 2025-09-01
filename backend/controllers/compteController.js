const Compte = require('../models/Compte');
const { journaliser } = require('../services/auditService');

// Fonction pour créer un nouveau compte
async function creerCompte(req, res) {
  try {
    const { numeroCompte, solde } = req.body;
    const utilisateurId = req.user?.id; // récupération de l'utilisateur connecté

    if (!utilisateurId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }
    // Vérifier que le numéro n'existe pas déjà
    const compteExiste = await Compte.findOne({ numeroCompte });
    if (compteExiste) {
      return res.status(400).json({ message: 'Compte déjà existant.' });
    }

    // Créer un nouveau compte
    const nouveauCompte = new Compte({
      numeroCompte,
      solde: solde,
      utilisateurId
    });

    nouveauCompte.soldeDecrypt = solde ?? 0;

    await nouveauCompte.save();

    // Journaliser la création
    await journaliser('Création de compte', req.user?.nom || 'Agent inconnu', `Compte ${numeroCompte} créé.`);

    res.status(201).json({ message: 'Compte créé avec succès.', compte: {
        numeroCompte: nouveauCompte.numeroCompte,
        solde: nouveauCompte.soldeDecrypt, // renvoyer le solde déchiffré
        statut: nouveauCompte.status
      } });
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


    res.status(200).json({
      numeroCompte: compte.numeroCompte,
      solde: compte.soldeDecrypt,
      statut: compte.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
}


// Nouvelle fonction : récupérer tous les comptes de l'utilisateur connecté
async function getComptesUtilisateur(req, res) {
  try {
    const utilisateurId = req.user.id;

    const comptes = await Compte.find({ utilisateurId });


    const comptesDechiffres = comptes.map(c => ({
      numeroCompte: c.numeroCompte,
      solde: c.soldeDecrypt,
      statut: c.status
    }));

    res.status(200).json(comptesDechiffres);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des comptes.' });
  }
}


module.exports = {
  creerCompte,
  consulterSolde, // <--- n'oublie pas de l'exporter ici !
  getComptesUtilisateur
};
