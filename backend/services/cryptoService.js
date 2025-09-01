// services/cryptoService.js
const crypto = require('crypto');

const SECRET_KEY = process.env.AES_SECRET_KEY;

if (!SECRET_KEY) {
  console.error("Clé AES manquante. Vérifie ton fichier .env");
  process.exit(1);
}

const KEY = Buffer.from(SECRET_KEY, 'hex'); // 32 octets = 256 bits

/**
 * Chiffre une valeur texte en AES-256-GCM.
 * @param {string} text - Donnée à chiffrer
 * @returns {string} - Texte chiffré au format base64 (IV:Tag:Encrypted)
 */
function chiffrer(text) {
  const iv = crypto.randomBytes(12); // IV de 96 bits
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Retour : IV:TAG:ENCRYPTED → tout encodé en base64 pour stockage
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Déchiffre un texte chiffré avec AES-256-GCM.
 * @param {string} encryptedData - Donnée au format IV:TAG:ENCRYPTED
 * @returns {string} - Texte déchiffré
 */
function dechiffrer(encryptedData) {
  try {
    const [ivB64, tagB64, dataB64] = encryptedData.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.error("Erreur de déchiffrement :", err.message);
    return null;
  }
}

module.exports = {
  chiffrer,
  dechiffrer
};
