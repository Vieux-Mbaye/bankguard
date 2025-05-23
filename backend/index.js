const express = require('express');
const cors = require('cors');
const { journaliser } = require('./services/auditService');
const compteRoutes = require('./routes/compteRoutes');
const operationRoutes = require('./routes/operationRoutes');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api', compteRoutes);
app.use('/api', operationRoutes);

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


app.get('/', (req, res) => {
  res.send('API BankGuard est en ligne');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
