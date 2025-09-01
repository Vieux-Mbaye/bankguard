"use client"

import type React from "react"
import { useState, useEffect } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "animate.css"
import "./LoginForm.css"

interface MfaSetupProps {
  email: string
  token: string
  onSetupComplete: () => void
  onSkip: () => void
}

const MfaSetup: React.FC<MfaSetupProps> = ({ email, token, onSetupComplete, onSkip }) => {
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"setup" | "verify">("setup")

  useEffect(() => {
    generateQRCode()
  }, [])

  const generateQRCode = async () => {
    setLoading(true)
    try {
      console.log("Envoi requête MFA setup...")
      console.log("Email reçu en props:", email)

      // Si l'email est undefined, envoyer une requête vide et laisser le serveur déterminer l'email
      const requestBody = email ? { email } : {}
      console.log("Body de la requête:", requestBody)

      const response = await fetch("http://localhost:5000/api/mfa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("Statut de la réponse:", response.status)
      const data = await response.json()
      console.log("Données reçues:", data)

      if (response.ok) {
        setQrCode(data.qrCode)
        setSecret(data.secret)
        console.log("QR Code généré avec succès")
      } else {
        console.error("Erreur serveur:", data.message)
        setError(data.message || "Erreur lors de la génération du QR code")
      }
    } catch (error: any) {
      console.error("Erreur réseau:", error)
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Utiliser l'email des props ou laisser le serveur le déterminer
      const requestBody = email ? { email, token: verificationCode } : { token: verificationCode }

      const response = await fetch("http://localhost:5000/api/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("MFA activé avec succès")
        onSetupComplete()
      } else {
        setError(data.message || "Code de vérification invalide")
      }
    } catch (error: any) {
      console.error("Erreur vérification:", error)
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
    setVerificationCode(value)
  }

  return (
    <div className="login-wrapper">
      <video autoPlay muted loop id="bg-video">
        <source src="/videos/background.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la vidéo.
      </video>

      <div className="login-card animate__animated animate__fadeInDown" style={{ maxWidth: "500px" }}>
        <img src="/images/logo-bankguard.png" alt="BankGuard Logo" className="logo mb-3" />

        <div className="text-center mb-4">
          <div className="mb-3">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(255, 255, 255, 0.2)",
                border: "2px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <i className="fas fa-qrcode text-white" style={{ fontSize: "24px" }}></i>
            </div>
          </div>
          <h3 className="text-white mb-2">Configuration MFA</h3>
          <p className="text-white-50 mb-0">Sécurisez votre compte avec l'authentification à deux facteurs</p>
        </div>

        {error && <div className="alert alert-danger w-100 animate__animated animate__shakeX">{error}</div>}

        {step === "setup" && (
          <div className="text-center">
            <div className="mb-4">
              <h5 className="text-white mb-3">Étape 1: Scannez le QR Code</h5>

              {loading ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border text-light"></div>
                </div>
              ) : qrCode ? (
                <div className="bg-white p-3 rounded mb-3 d-inline-block">
                  <img
                    src={qrCode || "/placeholder.svg"}
                    alt="QR Code MFA"
                    style={{ width: "200px", height: "200px" }}
                  />
                </div>
              ) : null}

              <div className="text-white-50 small mb-3">
                <p>1. Téléchargez Google Authenticator sur votre téléphone</p>
                <p>2. Scannez ce QR code avec l'application</p>
                <p>3. Entrez le code généré ci-dessous</p>
              </div>

              {secret && (
                <div className="mb-3">
                  <small className="text-white-50">Clé manuelle (si le QR code ne fonctionne pas):</small>
                  <div className="bg-dark p-2 rounded mt-1">
                    <code className="text-light small">{secret}</code>
                  </div>
                </div>
              )}
            </div>

            <div className="d-grid gap-2 w-100">
              <button className="btn btn-light fw-bold" onClick={() => setStep("verify")} disabled={loading || !qrCode}>
                J'ai scanné le QR code
              </button>

              <button className="btn btn-outline-light" onClick={onSkip} disabled={loading}>
                Ignorer pour le moment
              </button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div>
            <div className="text-center mb-4">
              <h5 className="text-white mb-3">Étape 2: Vérification</h5>
              <p className="text-white-50">Entrez le code à 6 chiffres généré par Google Authenticator</p>
            </div>

            <form onSubmit={handleVerification}>
              <div className="mb-4 w-100">
                <input
                  type="text"
                  placeholder="000000"
                  className="form-control text-center"
                  style={{
                    fontSize: "24px",
                    letterSpacing: "8px",
                    fontWeight: "bold",
                    height: "60px",
                  }}
                  value={verificationCode}
                  onChange={handleCodeChange}
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </div>

              <div className="d-grid gap-2 w-100">
                <button
                  type="submit"
                  className="btn btn-light fw-bold"
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Vérification...
                    </>
                  ) : (
                    "Activer le MFA"
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-light"
                  onClick={() => setStep("setup")}
                  disabled={loading}
                >
                  Retour au QR code
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default MfaSetup