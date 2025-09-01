const Utilisateur = require('../models/Utilisateur');
const Compte = require('../models/Compte');

const getUtilisateursAvecComptes = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find();

    const resultats = await Promise.all(
      utilisateurs.map(async (user) => {
        const compte = await Compte.findOne({ utilisateurId: user._id });
        return {
	  _id: user._id,
          numeroCompte: compte?.numeroCompte || "Non attribué",
          nom: user.nom,
          email: user.email,
          role: user.role,
        };
      })
    );

//    res.status(200).json(resultats);
      res.json(resultats);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

module.exports = { getUtilisateursAvecComptes };
