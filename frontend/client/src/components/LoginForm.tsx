"use client"

import type React from "react"
import { useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "animate.css"
import "./LoginForm.css"
import type { Utilisateur } from "../App"

interface LoginFormProps {
  onLogin: (user: Utilisateur, authToken: string) => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    console.log("=== Tentative de connexion")
    console.log("Email:", email)
    console.log("Mot de passe fourni:", motDePasse ? "Oui" : "Non")

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse }),
      })

      console.log("Statut de la réponse:", response.status)

      const data = await response.json()
      console.log("Données reçues:", data)

      if (response.ok) {
        console.log("=== Connexion réussie")

        // Adapter selon la structure de réponse de votre serveur
        let token, utilisateur

        if (data.token && typeof data.token === "object") {
          // Structure: { token: { token: "...", utilisateur: {...} } }
          token = data.token.token
          utilisateur = data.token.utilisateur
        } else if (data.token && data.utilisateur) {
          // Structure: { token: "...", utilisateur: {...} }
          token = data.token
          utilisateur = data.utilisateur
        } else {
          throw new Error("Structure de réponse inattendue")
        }

        console.log("Token extrait:", token ? "Présent" : "Absent")
        console.log("Utilisateur extrait:", utilisateur)

        if (token && utilisateur) {
          onLogin(utilisateur, token)
        } else {
          throw new Error("Token ou utilisateur manquant dans la réponse")
        }
      } else {
        console.log("=== Échec de la connexion")
        console.log("Message d'erreur:", data.message)
        setError(data.message || "Erreur de connexion")
      }
    } catch (error: any) {
      console.error("Erreur:", error)
      setError(error.message || "Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <video autoPlay muted loop id="bg-video">
        <source src="/videos/background.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la vidéo.
      </video>
      <div className="login-card animate__animated animate__fadeInDown">
        <img src="/images/logo-bankguard.png" alt="BankGuard Logo" className="logo mb-3" />
        <h3 className="text-white mb-3">Connexion à BankGuard</h3>
        {error && <div className="alert alert-danger w-100">{error}</div>}
        <form onSubmit={handleSubmit} className={loading ? "animate__animated animate__pulse" : ""}>
          <div className="mb-3 w-100">
            <input
              type="email"
              placeholder="Email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3 w-100">
            <input
              type="password"
              placeholder="Mot de passe"
              className="form-control"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>
          <div className="form-check text-start text-white mb-2 w-100">
            <input className="form-check-input" type="checkbox" id="souvenir" />
            <label className="form-check-label" htmlFor="souvenir">
              Souvenez-vous de moi
            </label>
          </div>
          <button type="submit" className="btn btn-light w-100 fw-bold">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <div className="mt-3 text-white">
          Vous n'avez pas de compte ?{" "}
          <button className="btn btn-link text-white fw-bold p-0" disabled>
            S'enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
