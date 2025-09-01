"use client"

import type React from "react"
import { useState, useEffect } from "react"
import LoginForm from "./components/LoginForm"
import Dashboard from "./components/Dashboard"
import AdminPanel from "./components/AdminPanel"
import MfaVerification from "./components/MfaVerification"
import MfaSetup from "./components/MfaSetup"

export interface Utilisateur {
  id: string
  nom: string
  email: string
  role: string
  numeroCompte?: string
}

const App = (): React.JSX.Element => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<"login" | "mfa-verify" | "mfa-setup" | "dashboard" | "admin">("login")
  const [pendingLogin, setPendingLogin] = useState<{ user: Utilisateur; token: string } | null>(null)

  useEffect(() => {
    console.log("Vérification de l'authentification au démarrage...")
    const checkAuth = () => {
      const savedToken = localStorage.getItem("token")
      const savedUser = localStorage.getItem("user")
      console.log("Token sauvegardé:", savedToken ? "Présent" : "Absent")
      console.log("Utilisateur sauvegardé:", savedUser ? "Présent" : "Absent")

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          console.log("Utilisateur récupéré:", parsedUser)

          if (parsedUser && parsedUser.nom && parsedUser.role) {
            if (!parsedUser.email) {
              parsedUser.email = `${parsedUser.nom.toLowerCase()}@bankguard.sn`
            }
            setToken(savedToken)
            setUtilisateur(parsedUser)
            setCurrentPage("dashboard")
            console.log("Session restaurée avec succès")
          } else {
            console.log("Données utilisateur incomplètes")
            handleLogout()
          }
        } catch (error) {
          console.error("Erreur parsing utilisateur:", error)
          handleLogout()
        }
      } else {
        console.log("Pas de session sauvegardée")
      }
      setLoading(false)
    }

    if (typeof window !== "undefined") {
      setTimeout(checkAuth, 100)
    } else {
      setLoading(false)
    }
  }, [])

  const checkMfaStatus = async (email: string, authToken: string) => {
    try {
      console.log("Vérification statut MFA pour:", email)
      const response = await fetch(`http://localhost:5000/api/mfa/status/${email}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Statut MFA reçu:", data)
        return data
      } else {
        console.error("Erreur lors de la vérification du statut MFA:", response.status)
      }
    } catch (error) {
      console.error("Erreur vérification statut MFA:", error)
    }
    return { hasMFA: false, configured: false }
  }

  const handleLogin = async (user: Utilisateur, authToken: string) => {
    console.log("Connexion réussie pour:", user)
    console.log("Vérification du statut MFA...")

    // Générer l'email si pas présent
    const userEmail = user.email || `${user.nom.toLowerCase()}@bankguard.sn`
    console.log("Email utilisé pour MFA:", userEmail)

    // Vérifier si l'utilisateur a le MFA activé
    const mfaStatus = await checkMfaStatus(userEmail, authToken)
    console.log("Statut MFA reçu:", mfaStatus)

    if (mfaStatus.hasMFA === true) {
      // L'utilisateur a le MFA activé, rediriger vers la vérification
      console.log("MFA activé détecté, redirection vers vérification")
      setPendingLogin({ user: { ...user, email: userEmail }, token: authToken })
      setCurrentPage("mfa-verify")
    } else if (mfaStatus.configured === false) {
      // L'utilisateur n'a pas encore configuré le MFA, proposer la configuration
      console.log("MFA non configuré, proposition de configuration")
      setPendingLogin({ user: { ...user, email: userEmail }, token: authToken })
      setCurrentPage("mfa-setup")
    } else {
      // MFA configuré mais pas activé - connexion directe
      console.log("MFA configuré mais non activé, connexion directe")
      completLogin({ ...user, email: userEmail }, authToken)
    }
  }

  const completLogin = (user: Utilisateur, authToken: string) => {
    localStorage.setItem("token", authToken)
    localStorage.setItem("user", JSON.stringify(user))
    setUtilisateur(user)
    setToken(authToken)
    setCurrentPage("dashboard")
    setPendingLogin(null)
    console.log("Connexion complète pour:", user.nom)
  }

  const handleMfaSuccess = () => {
    if (pendingLogin) {
      completLogin(pendingLogin.user, pendingLogin.token)
    }
  }

  const handleMfaSetupComplete = () => {
    if (pendingLogin) {
      completLogin(pendingLogin.user, pendingLogin.token)
    }
  }

  const handleMfaSkip = () => {
    if (pendingLogin) {
      completLogin(pendingLogin.user, pendingLogin.token)
    }
  }

  const handleBackToLogin = () => {
    setPendingLogin(null)
    setCurrentPage("login")
  }

  const handleLogout = () => {
    console.log("Déconnexion...")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUtilisateur(null)
    setToken(null)
    setPendingLogin(null)
    setCurrentPage("login")
  }

  const handleGoToAdmin = () => {
    if (utilisateur?.role === "admin") {
      setCurrentPage("admin")
    }
  }

  const handleBackToDashboard = () => {
    setCurrentPage("dashboard")
  }

  console.log("État actuel - utilisateur:", utilisateur?.nom || "null", "page:", currentPage)

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e3f2fd, #f3e5f5)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              border: "4px solid #007bff",
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          ></div>
          <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>BankGuard</h4>
          <p style={{ color: "#666", margin: 0 }}>Vérification de la session...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Rendu conditionnel selon la page actuelle
  if (currentPage === "login") {
    return <LoginForm onLogin={handleLogin} />
  }

  if (currentPage === "mfa-verify" && pendingLogin) {
    return (
      <MfaVerification email={pendingLogin.user.email} onMfaSuccess={handleMfaSuccess} onBack={handleBackToLogin} />
    )
  }

  if (currentPage === "mfa-setup" && pendingLogin) {
    return (
      <MfaSetup
        email={pendingLogin.user.email}
        token={pendingLogin.token}
        onSetupComplete={handleMfaSetupComplete}
        onSkip={handleMfaSkip}
      />
    )
  }

  if (currentPage === "admin" && utilisateur && token) {
    return <AdminPanel token={token} utilisateur={utilisateur} onBack={handleBackToDashboard} />
  }

  if (currentPage === "dashboard" && utilisateur && token) {
    return <Dashboard token={token} utilisateur={utilisateur} onLogout={handleLogout} onGoToAdmin={handleGoToAdmin} />
  }

  return <LoginForm onLogin={handleLogin} />
}

export default App
