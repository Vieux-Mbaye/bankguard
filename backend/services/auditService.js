const Journal = require('../models/Journal');
const Compte = require('../models/Compte');
const Operation = require('../models/Operation');
const Utilisateur = require('../models/Utilisateur');

/**
 * Fonction pour enregistrer une action critique dans les journaux d'audit
 * @param {string} action - Nom de l'action réalisée (ex: "Création de compte")
 * @param {string} utilisateur - Identité de l'utilisateur concerné (ou "Inconnu")
 * @param {string} description - Détail supplémentaire sur l'action
 */
async function journaliser(action, utilisateur, description, extra = {}) {
  try {
    const log = new Journal({
      action,
      utilisateur,
      description,
      date: new Date(),
      ...extra, // Pour ajouter les données IA
    });

    // Détection spéciale pour les virements
    if (action === 'Virement' && extra.montant && extra.compteSource && extra.compteDestination) {
      const now = new Date();
      const uneHeureAvant = new Date(now.getTime() - 60 * 60 * 1000);

      // Ancienneté du compte source
      const source = await Compte.findOne({ numeroCompte: extra.compteSource });
      const anciennete_jours = Math.floor((now - new Date(source.dateOuverture)) / (1000 * 60 * 60 * 24));
      const solde_avant = source.solde;

      // Heure du virement
      const heure = now.getHours();

      // Nombre de virements dans la dernière heure
      const nb_virements_1h = await Journal.countDocuments({
        action: 'Virement',
        compteSource: extra.compteSource,
        date: { $gte: uneHeureAvant }
      });

      // Nombre de virements vers le même bénéficiaire
      const nb_virements_vers_benef = await Journal.countDocuments({
        action: 'Virement',
        compteSource: extra.compteSource,
        compteDestination: extra.compteDestination
      });

      // Fake valeurs pour le test
      const nouveau_beneficiaire = nb_virements_vers_benef === 0 ? 1 : 0;
      const changement_mdp = 0;
      const minutes_depuis_chg_mdp = 9999;
      const localisation = 0;

      Object.assign(log, {
        anciennete_jours,
        solde_avant,
        heure,
        nb_virements_1h,
        nouveau_beneficiaire,
        changement_mdp,
        minutes_depuis_chg_mdp,
        localisation,
        nb_virements_vers_benef,
      });
    }


    await log.save(); // Sauvegarde dans MongoDB
    console.log(`Action journalisée : ${action}`);
  } catch (error) {
    console.error('Erreur lors de la journalisation :', error.message);
  }
}

module.exports = { journaliser };
