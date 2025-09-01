"use client"

import type React from "react"
import { useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "animate.css"
import "./LoginForm.css"

interface MfaVerificationProps {
  email: string
  onMfaSuccess: () => void
  onBack: () => void
}

const MfaVerification: React.FC<MfaVerificationProps> = ({ email, onMfaSuccess, onBack }) => {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    console.log("Vérification du code MFA pour:", email)

    try {
      // Utiliser l'email généré automatiquement si pas fourni
      const emailToUse = email || "admin@bankguard.sn"

      const response = await fetch("http://localhost:5000/api/mfa/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, token: code }),
      })

      const data = await response.json()
      console.log("Réponse MFA:", data)

      if (response.ok) {
        console.log("Code MFA validé avec succès")
        onMfaSuccess()
      } else {
        console.log("Échec validation MFA:", data.message)
        setError(data.message || "Code de vérification invalide")
      }
    } catch (error: any) {
      console.error("Erreur validation MFA:", error)
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
    setCode(value)
  }

  return (
    <div className="login-wrapper">
      <video autoPlay muted loop id="bg-video">
        <source src="/videos/background.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la vidéo.
      </video>

      <div className="login-card animate__animated animate__fadeInDown">
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
              <i className="fas fa-shield-alt text-white" style={{ fontSize: "24px" }}></i>
            </div>
          </div>
          <h3 className="text-white mb-2">Authentification à deux facteurs</h3>
          <p className="text-white-50 mb-0">
            Entrez le code à 6 chiffres généré par votre application d'authentification
          </p>
        </div>

        {error && <div className="alert alert-danger w-100 animate__animated animate__shakeX">{error}</div>}

        <form onSubmit={handleSubmit} className={loading ? "animate__animated animate__pulse" : ""}>
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
              value={code}
              onChange={handleCodeChange}
              maxLength={6}
              required
              disabled={loading}
            />
            <small className="text-white-50 mt-2 d-block">Code à 6 chiffres de Google Authenticator</small>
          </div>

          <div className="d-grid gap-2 w-100">
            <button
              type="submit"
              className="btn btn-light fw-bold"
              style={{ height: "50px" }}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Vérification...
                </>
              ) : (
                "Vérifier le code"
              )}
            </button>

            <button type="button" className="btn btn-outline-light" onClick={onBack} disabled={loading}>
              Retour à la connexion
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <small className="text-white-50">
            Vous n'arrivez pas à accéder à votre code ?<br />
            Contactez l'administrateur système
          </small>
        </div>
      </div>
    </div>
  )
}

export default MfaVerification
