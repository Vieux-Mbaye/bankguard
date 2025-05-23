const Journal = require('../models/Journal');

/**
 * Fonction pour enregistrer une action critique dans les journaux d'audit
 * @param {string} action - Nom de l'action réalisée (ex: "Création de compte")
 * @param {string} utilisateur - Identité de l'utilisateur concerné (ou "Inconnu")
 * @param {string} description - Détail supplémentaire sur l'action
 */
async function journaliser(action, utilisateur = 'Inconnu', description = '') {
  try {
    const log = new Journal({
      action,
      utilisateur,
      description
    });
    await log.save(); // Sauvegarde dans MongoDB
    console.log(`Action journalisée : ${action}`);
  } catch (error) {
    console.error('Erreur lors de la journalisation :', error.message);
  }
}

module.exports = { journaliser };
