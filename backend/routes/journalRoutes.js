// routes/journalRoutes.js
const express = require('express');
const router = express.Router();
const Journal = require('../models/Journal');
const mongoose = require("mongoose")
const auth = require("../middlewares/authMiddleware")

// GET /api/journaux - Lister tous les journaux d’audit
router.get('/', async (req, res) => {
  try {
    const journaux = await Journal.find().sort({ date: -1 }); // tri du + récent au + ancien
    res.json(journaux);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des journaux.' });
  }
});

router.get("/dernier", auth, async (req, res) => {
  try {
    const db = mongoose.connection.db
    const collection = db.collection("journals")

    // Chercher le dernier journal (comme dans watch_journals.py)
    const journal = await collection.findOne({}, { sort: { _id: -1 } })

    if (journal) {
      console.log("Dernier journal récupéré:", journal._id)
      res.json(journal)
    } else {
      res.json(null)
    }
  } catch (error) {
    console.error("Erreur récupération dernier journal:", error)
    res.status(500).json({ message: "Erreur serveur" })
  }
})


module.exports = router;
