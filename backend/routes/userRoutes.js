// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware'); // RBAC dynamique
const { journaliser } = require('../services/auditService');
const { getUtilisateursAvecComptes } = require('../controllers/utilisateurController');


router.get('/utilisateurs', authMiddleware, authorizeRoles('admin'), getUtilisateursAvecComptes);


// GET /api/users — accessible uniquement aux administrateurs
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await Utilisateur.find({}, '-motDePasse'); // Exclure le champ motDePasse
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/users/:id — accessible uniquement aux administrateurs
router.get('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.params.id, '-motDePasse');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/users — création d'un utilisateur par un admin
router.post('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  const { nom, email, motDePasse, role } = req.body;

  try {
    // Vérifier s'il existe déjà
    const existant = await Utilisateur.findOne({ email });
    if (existant) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // Créer un nouvel utilisateur
    const nouvelUtilisateur = new Utilisateur({ nom, email, motDePasse, role });
    await nouvelUtilisateur.save();

    // Journaliser l'action
    await journaliser(
      'Création utilisateur',
      req.user.nom,
      `L'administrateur ${req.user.nom} a créé l'utilisateur ${nouvelUtilisateur.email}`
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      utilisateur: {
        id: nouvelUtilisateur._id,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
        role: nouvelUtilisateur.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});


// DELETE /api/users/:id — suppression par admin avec audit
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    await Utilisateur.findByIdAndDelete(req.params.id);

    // Journaliser la suppression
    await journaliser(
      'Suppression utilisateur',
      req.user.nom,
      `L'administrateur ${req.user.nom} a supprimé l'utilisateur ${utilisateur.email}`
    );

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;
