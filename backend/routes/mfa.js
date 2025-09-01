const express = require("express")
const speakeasy = require("speakeasy")
const QRCode = require("qrcode")
const MfaKey = require("../models/MfaKey")
const auth = require("../middlewares/authMiddleware")

const router = express.Router()

// Route pour vérifier si un utilisateur a le MFA activé
router.get("/status/:email", auth, async (req, res) => {
  try {
    const { email } = req.params
    console.log("Vérification statut MFA pour:", email)

    const mfaKey = await MfaKey.findOne({ email })
    console.log("Clé MFA trouvée:", mfaKey ? "Oui" : "Non")

    if (mfaKey) {
      console.log("Détails MFA - Active:", mfaKey.active, "Secret:", !!mfaKey.mfaSecret)
    }

    const result = {
      hasMFA: mfaKey ? mfaKey.active : false,
      configured: !!mfaKey,
    }

    console.log("Réponse statut MFA:", result)
    res.json(result)
  } catch (error) {
    console.error("Erreur statut MFA:", error)
    res.status(500).json({ message: "Erreur serveur lors de la vérification du statut MFA" })
  }
})

// Route pour configurer le MFA
router.post("/setup", auth, async (req, res) => {
  try {
    console.log("=== MFA SETUP ===")
    console.log("Body reçu:", req.body)
    console.log("User from token:", req.user)

    let email = req.body.email

    if (!email && req.user) {
      if (req.user.email) {
        email = req.user.email
      } else if (req.user.nom) {
        email = `${req.user.nom.toLowerCase().replace(/\s+/g, "")}@bankguard.sn`
      }
    }

    console.log("Email déterminé:", email)

    if (!email) {
      console.log("Impossible de déterminer l'email")
      return res.status(400).json({ message: "Impossible de déterminer l'email utilisateur" })
    }

    const existingMfaKey = await MfaKey.findOne({ email })
    console.log("Clé MFA existante:", existingMfaKey ? "Oui" : "Non")

    if (existingMfaKey && existingMfaKey.active) {
      console.log("MFA déjà activé pour:", email)
      return res.status(400).json({
        message: "MFA déjà activé pour cet utilisateur",
        alreadyActive: true,
      })
    }

    const secret = speakeasy.generateSecret({
      name: `BankGuard (${email})`,
      issuer: "BankGuard",
      length: 32,
    })

    if (existingMfaKey) {
      existingMfaKey.mfaSecret = secret.base32
      existingMfaKey.active = false
      existingMfaKey.dateCreation = new Date()
      await existingMfaKey.save()
      console.log("Clé MFA mise à jour avec succès")
    } else {
      try {
        const newMfaKey = new MfaKey({
          email,
          mfaSecret: secret.base32,
          active: false,
        })
        await newMfaKey.save()
        console.log("Nouvelle clé MFA créée avec succès")
      } catch (saveError) {
        if (saveError.code === 11000) {
          const existingKey = await MfaKey.findOne({ email })
          if (existingKey) {
            existingKey.mfaSecret = secret.base32
            existingKey.active = false
            existingKey.dateCreation = new Date()
            await existingKey.save()
            console.log("Clé MFA mise à jour après erreur de duplication")
          }
        } else {
          throw saveError
        }
      }
    }

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    console.log("MFA setup réussi pour:", email)
    res.json({
      success: true,
      qrCode: qrCodeUrl,
      secret: secret.base32,
      message: "Clé MFA générée avec succès",
    })
  } catch (error) {
    console.error("Erreur setup MFA:", error)
    res.status(500).json({
      message: "Erreur serveur lors de la configuration MFA",
      error: error.message,
    })
  }
})

// Route pour vérifier et activer le MFA
router.post("/verify", auth, async (req, res) => {
  try {
    console.log("=== MFA VERIFY ===")
    console.log("Body reçu:", req.body)

    const { token } = req.body

    let email = req.body.email

    if (!email && req.user) {
      if (req.user.email) {
        email = req.user.email
      } else if (req.user.nom) {
        email = `${req.user.nom.toLowerCase().replace(/\s+/g, "")}@bankguard.sn`
      }
    }

    console.log("Email pour vérification:", email)

    if (!email || !token) {
      return res.status(400).json({ message: "Email et token requis" })
    }

    const mfaKey = await MfaKey.findOne({ email })

    if (!mfaKey) {
      return res.status(404).json({ message: "Aucune configuration MFA trouvée" })
    }

    const verified = speakeasy.totp.verify({
      secret: mfaKey.mfaSecret,
      encoding: "base32",
      token: token,
      window: 2,
    })

    if (!verified) {
      return res.status(400).json({ message: "Code de vérification invalide" })
    }

    mfaKey.active = true
    mfaKey.derniereUtilisation = new Date()
    await mfaKey.save()

    console.log("MFA activé avec succès pour:", email)
    res.json({
      success: true,
      message: "MFA activé avec succès",
    })
  } catch (error) {
    console.error("Erreur vérification MFA:", error)
    res.status(500).json({ message: "Erreur serveur lors de la vérification MFA" })
  }
})

// Route pour vérifier le code lors de la connexion
router.post("/validate", async (req, res) => {
  try {
    console.log("=== MFA VALIDATE ===")
    console.log("Body reçu:", req.body)

    const { email, token } = req.body

    if (!email || !token) {
      return res.status(400).json({ message: "Email et token requis" })
    }

    const mfaKey = await MfaKey.findOne({ email, active: true })

    if (!mfaKey) {
      return res.status(404).json({ message: "MFA non configuré pour cet utilisateur" })
    }

    const verified = speakeasy.totp.verify({
      secret: mfaKey.mfaSecret,
      encoding: "base32",
      token: token,
      window: 2,
    })

    if (!verified) {
      return res.status(400).json({ message: "Code de vérification invalide" })
    }

    mfaKey.derniereUtilisation = new Date()
    await mfaKey.save()

    console.log("Code MFA validé avec succès pour:", email)
    res.json({
      success: true,
      message: "Code MFA validé avec succès",
    })
  } catch (error) {
    console.error("Erreur validation MFA:", error)
    res.status(500).json({ message: "Erreur serveur lors de la validation MFA" })
  }
})

module.exports = router