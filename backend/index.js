require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { journaliser } = require('./services/auditService');
const compteRoutes = require('./routes/compteRoutes');
const operationRoutes = require('./routes/operationRoutes');
const journalRoutes = require('./routes/journalRoutes');
const Utilisateur = require('./models/Utilisateur');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const mongoose = require('mongoose');
const mfaRoutes = require("./routes/mfa");
const MfaKey = require("./models/MfaKey");


const app = express();
app.use(express.json());
app.use(cors());
app.use('/api', compteRoutes);
app.use('/api', operationRoutes);
app.use('/api/journaux', journalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use("/api/mfa", mfaRoutes);

//app.use('/api', require('./routes/utilisateurRoutes'));

// Connexion MongoDB ici
mongoose.connect('mongodb://localhost:27017/bankguard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur de connexion MongoDB :', err));

// Les routes
app.get('/test-audit', async (req, res) => {
  await journaliser('Test journalisation', 'Testeur', 'Ceci est un test de l’audit.');
  res.send('Journalisation test réussie !');
});

const authMiddleware = require('./middlewares/authMiddleware');
const journalsRoutes = require("./routes/journalRoutes")

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Accès autorisé', utilisateur: req.user });
});

app.get('/', (req, res) => {
  res.send('API BankGuard est en ligne');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

console.log("Clé AES chargée :", process.env.AES_SECRET_KEY);

//////////////////////////////////////////

async function checkMfaStatus() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/bankguard")
    console.log("Connecté à MongoDB")

    const mfaKeys = await MfaKey.find({})
    console.log("Toutes les clés MFA:")
    mfaKeys.forEach((key) => {
      console.log(`Email: ${key.email}, Active: ${key.active}, Configuré: ${!!key.mfaSecret}`)
    })

    const adminMfa = await MfaKey.findOne({ email: "admin@bankguard.sn" })
    if (adminMfa) {
      console.log("\nStatut MFA pour admin@bankguard.sn:")
      console.log(`- Active: ${adminMfa.active}`)
      console.log(`- Secret configuré: ${!!adminMfa.mfaSecret}`)
      console.log(`- Date création: ${adminMfa.dateCreation}`)
    } else {
      console.log("Aucune clé MFA trouvée pour admin@bankguard.sn")
    }

    await mongoose.disconnect()
  } catch (error) {
    console.error("Erreur:", error)
  }
}

checkMfaStatus()
