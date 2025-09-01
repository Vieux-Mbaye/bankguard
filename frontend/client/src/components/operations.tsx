"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  CreditCard,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  User,
  Clock,
  Terminal,
  Trash2,
  Copy,
} from "lucide-react"

interface OperationsProps {
  token: string
  utilisateur: {
    nom: string
    email: string
    role: string
    numeroCompte?: string
  }
  onOperationComplete?: () => void
}

interface RecentOperation {
  _id: string
  type: "depot" | "retrait" | "virement"
  montant: number
  date: string
  description?: string
  compteSource?: string
  compteDestination?: string
  utilisateur?: string
}

interface DebugLog {
  id: string
  timestamp: string
  type: "info" | "success" | "error" | "warning"
  message: string
  details?: any
}

const Operations: React.FC<OperationsProps> = ({ token, utilisateur, onOperationComplete }) => {
  // �tats du formulaire
  const [typeOperation, setTypeOperation] = useState<"depot" | "retrait" | "virement">("depot")
  const [montant, setMontant] = useState("")
  const [compteDestinataire, setCompteDestinataire] = useState("")
  const [description, setDescription] = useState("")

  // �tats de l'interface
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info"
    message: string
    details?: string
  } | null>(null)

  // �tats pour les op�rations r�centes
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [solde, setSolde] = useState<number>(0)

  // �tats pour la console de d�bogage
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [showDebugConsole, setShowDebugConsole] = useState(true)

  const numeroCompte = utilisateur?.numeroCompte || "1234567890"

  // Fonction pour ajouter des logs de d�bogage
  const addDebugLog = (type: "info" | "success" | "error" | "warning", message: string, details?: any) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString("fr-FR"),
      type,
      message,
      details,
    }

    setDebugLogs((prev) => [newLog, ...prev].slice(0, 50)) // Garder seulement les 50 derniers logs

    // Aussi logger dans la vraie console
    const consoleMethod = type === "error" ? console.error : type === "warning" ? console.warn : console.log
    consoleMethod(`[${newLog.timestamp}] ${message}`, details || "")
  }

  // Charger les donn�es initiales
  useEffect(() => {
    addDebugLog("info", "Initialisation du composant Operations")
    addDebugLog("info", `Utilisateur: ${utilisateur?.nom} (${utilisateur?.email})`)
    addDebugLog("info", `Numéro de compte: ${numeroCompte}`)
    addDebugLog("info", `Token présent: ${!!token}`)
    addDebugLog("info", `Token valide: ${token && token.length > 10}`)

    loadRecentOperations()
    loadBalance()
  }, [])

  const loadBalance = async () => {
    addDebugLog("info", "Chargement du solde...")
    try {
      const url = `http://localhost:5000/api/comptes/${numeroCompte}`
      addDebugLog("info", `Appel API: GET ${url}`)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      addDebugLog("info", `Réponse: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        addDebugLog("success", `Solde chargé: ${data.solde} XOF`, data)
        setSolde(data.solde || 0)
      } else {
        const errorData = await response.json()
        addDebugLog("error", `L Erreur chargement solde: ${response.status}`, errorData)
      }
    } catch (error) {
      addDebugLog("error", "Erreur réseau lors du chargement du solde", error)
    }
  }

  const loadRecentOperations = async () => {
    setLoadingRecent(true)
    addDebugLog("info", "Chargement des opérations récentes...")

    try {
      const url = `http://localhost:5000/api/operations/${numeroCompte}`
      addDebugLog("info", `Appel API: GET ${url}`)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      addDebugLog("info", `Réponse: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        const recent = Array.isArray(data) ? data.slice(0, 5) : []
        addDebugLog("success", `${recent.length} opérations récentes chargées`, recent)
        setRecentOperations(recent)
      } else {
        const errorData = await response.json()
        addDebugLog("error", `L Erreur chargement opérations: ${response.status}`, errorData)
      }
    } catch (error) {
      addDebugLog("error", "Erreur réseau lors du chargement des opérations", error)
    } finally {
      setLoadingRecent(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }
  }

  const formatType = (type: string) => {
    switch (type) {
      case "depot":
        return "Dépot"
      case "retrait":
        return "Retrait"
      case "virement":
        return "Virement"
      default:
        return type
    }
  }

  const showNotification = (type: "success" | "error" | "info", message: string, details?: string) => {
    setNotification({ type, message, details })
    addDebugLog(type, `= Notification: ${message}`, details)
    setTimeout(() => setNotification(null), 5000)
  }

  const resetForm = () => {
    addDebugLog("info", "Réinitialisation du formulaire")
    setMontant("")
    setCompteDestinataire("")
    setDescription("")
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    addDebugLog("info", "Début de soumission du formulaire")
    addDebugLog("info", `Type d'opération: ${typeOperation}`)
    addDebugLog("info", `Montant: ${montant}`)
    addDebugLog("info", `Compte destinataire: ${compteDestinataire || "N/A"}`)

    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      addDebugLog("error", "L Montant invalide")
      showNotification("error", "Veuillez saisir un montant valide")
      return
    }

    if (typeOperation === "virement" && !compteDestinataire) {
      addDebugLog("error", "L Compte destinataire manquant pour virement")
      showNotification("error", "Veuillez saisir le num�ro du compte destinataire")
      return
    }

    setLoading(true)
    addDebugLog("info", "Début du traitement de l'opération...")

    try {
      let response: Response
      let requestBody: any
      let url: string

      if (typeOperation === "virement") {
        // API Virement
        url = "http://localhost:5000/api/virement"
        requestBody = {
          compteSource: numeroCompte,
          compteDestinataire: compteDestinataire,
          montant: Number(montant),
        }
        addDebugLog("info", `Pr�paration virement vers: ${url}`, requestBody)
      } else {
        // API D�p�t/Retrait
        url = "http://localhost:5000/api/operations"
        requestBody = {
          numeroCompte: numeroCompte,
          type: typeOperation,
          montant: Number(montant),
          description: description || `${formatType(typeOperation)} de ${formatCurrency(Number(montant))}`,
        }
        addDebugLog("info", `Pr�paration ${typeOperation} vers: ${url}`, requestBody)
      }

      addDebugLog("info", `Envoi requ�te POST vers ${url}`)
      addDebugLog("info", `Headers: Authorization: Bearer ${token.substring(0, 20)}...`)

      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      addDebugLog("info", `R�ponse re�ue: ${response.status} ${response.statusText}`)
      addDebugLog("info", `Headers r�ponse:`, Object.fromEntries(response.headers.entries()))

      const result = await response.json()
      addDebugLog("info", "Corps de la r�ponse:", result)

      if (response.ok) {
        addDebugLog("success", `${formatType(typeOperation)} r�ussi !`)
        showNotification(
          "success",
          `${formatType(typeOperation)} effectu� avec succ�s !`,
          `Montant: ${formatCurrency(Number(montant))}${
            typeOperation === "virement" ? ` vers ${compteDestinataire}` : ""
          }`,
        )

        // Recharger les donn�es
        addDebugLog("info", "Rechargement des données...")
        await loadRecentOperations()
        await loadBalance()

        // Notifier le parent si n�cessaire
        if (onOperationComplete) {
          addDebugLog("info", "Notification du composant parent")
          onOperationComplete()
        }

        resetForm()
      } else {
        addDebugLog("error", `L Erreur ${response.status}: ${response.statusText}`, result)

        if (response.status === 401) {
          addDebugLog("error", "ERREUR 401 - Token invalide ou expir& !")
          showNotification("error", "Erreur d'authentification", "Votre session a expiré. Veuillez vous reconnecter.")
        } else {
          showNotification("error", `Erreur lors du ${typeOperation}`, result.message || "Une erreur est survenue")
        }
      }
    } catch (error) {
      addDebugLog("error", "Erreur réseau complète:", error)
      showNotification("error", "Erreur de connexion", "Impossible de contacter le serveur")
    } finally {
      setLoading(false)
      addDebugLog("info", "Fin du traitement de l'opération")
    }
  }

  const clearDebugLogs = () => {
    setDebugLogs([])
    addDebugLog("info", "Console de débogage effacée")
  }

  const copyDebugLogs = () => {
    const logsText = debugLogs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${log.details ? "\n" + JSON.stringify(log.details, null, 2) : ""}`,
      )
      .join("\n\n")

    navigator.clipboard.writeText(logsText)
    addDebugLog("success", "Logs copiés dans le presse-papiers")
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "depot":
        return <ArrowUpCircle size={20} className="text-success" />
      case "retrait":
        return <ArrowDownCircle size={20} className="text-danger" />
      case "virement":
        return <ArrowRightCircle size={20} className="text-warning" />
      default:
        return <CreditCard size={20} />
    }
  }

  const getOperationColor = (type: string) => {
    switch (type) {
      case "depot":
        return "text-success"
      case "retrait":
        return "text-danger"
      case "virement":
        return "text-warning"
      default:
        return "text-muted"
    }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={16} className="text-success" />
      case "error":
        return <XCircle size={16} className="text-danger" />
      case "warning":
        return <AlertCircle size={16} className="text-warning" />
      default:
        return <AlertCircle size={16} className="text-info" />
    }
  }

  const getLogBadgeClass = (type: string) => {
    switch (type) {
      case "success":
        return "badge bg-success"
      case "error":
        return "badge bg-danger"
      case "warning":
        return "badge bg-warning"
      default:
        return "badge bg-info"
    }
  }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

      <style>{`
        .operation-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .operation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .operation-card.selected {
          border-color: #3182ce;
          background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1060;
          min-width: 300px;
          animation: slideInRight 0.3s ease-out;
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .recent-operation {
          transition: all 0.2s ease;
        }
        
        .recent-operation:hover {
          background-color: var(--bs-gray-100) !important;
          transform: translateX(4px);
        }
        
        .balance-card {
          background: linear-gradient(135deg, #3182ce, #2c5aa0, #2a4a7c);
          color: white;
        }
        
        .operation-type-selector {
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .debug-console {
          background: #1a1a1a;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-height: 400px;
          overflow-y: auto;
          border-radius: 8px;
        }

        .debug-log {
          padding: 8px 12px;
          border-bottom: 1px solid #333;
          word-wrap: break-word;
        }

        .debug-log:hover {
          background: #2a2a2a;
        }

        .debug-details {
          background: #2a2a2a;
          padding: 8px;
          margin-top: 4px;
          border-radius: 4px;
          font-size: 11px;
          white-space: pre-wrap;
        }
      `}</style>

      <div className="container-fluid p-4">
        {/* Notification */}
        {notification && (
          <div className="notification">
            <div
              className={`alert alert-${notification.type === "success" ? "success" : notification.type === "error" ? "danger" : "info"} alert-dismissible fade show`}
            >
              <div className="d-flex align-items-center">
                {notification.type === "success" && <CheckCircle size={20} className="me-2" />}
                {notification.type === "error" && <XCircle size={20} className="me-2" />}
                {notification.type === "info" && <AlertCircle size={20} className="me-2" />}
                <div>
                  <strong>{notification.message}</strong>
                  {notification.details && <div className="small mt-1">{notification.details}</div>}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setNotification(null)}></button>
            </div>
          </div>
        )}

        {/* Console de d�bogage */}
        {showDebugConsole && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-warning">
                <div className="card-header bg-warning text-dark">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">
                      <Terminal size={20} className="me-2" />
                      Console de débogage en temps réel
                    </h6>
                    <div>
                      <button className="btn btn-sm btn-outline-dark me-2" onClick={copyDebugLogs}>
                        <Copy size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-dark me-2" onClick={clearDebugLogs}>
                        <Trash2 size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-dark" onClick={() => setShowDebugConsole(false)}>
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="debug-console">
                    {debugLogs.length === 0 ? (
                      <div className="debug-log text-muted">Aucun log pour le moment...</div>
                    ) : (
                      debugLogs.map((log) => (
                        <div key={log.id} className="debug-log">
                          <div className="d-flex align-items-center">
                            <span className={getLogBadgeClass(log.type)}>{log.type.toUpperCase()}</span>
                            <span className="ms-2 text-muted">[{log.timestamp}]</span>
                            <span className="ms-2">{log.message}</span>
                          </div>
                          {log.details && (
                            <div className="debug-details">
                              {typeof log.details === "object" ? JSON.stringify(log.details, null, 2) : log.details}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bouton pour afficher/masquer la console */}
        {!showDebugConsole && (
          <div className="row mb-3">
            <div className="col-12">
              <button className="btn btn-warning btn-sm" onClick={() => setShowDebugConsole(true)}>
                <Terminal size={16} className="me-2" />
                Afficher la console de débogage
              </button>
            </div>
          </div>
        )}

        {/* En-t�te avec solde */}
        <div className="row mb-4">
          <div className="col-lg-8">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="fw-bold mb-1">Opérations bancaires</h2>
                <p className="text-muted mb-0">Gérez vos virements, dépots et retraits en toute sécurité</p>
              </div>
              {!showForm && (
                <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                  <CreditCard size={20} className="me-2" />
                  Nouvelle opération
                </button>
              )}
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card balance-card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="card-text opacity-75 mb-2">Solde actuel</p>
                    <div className="d-flex align-items-center">
                      <h4 className="card-title mb-0 me-3">{showBalance ? formatCurrency(solde) : "••••••••"}</h4>
                      <button className="btn btn-link text-white p-1" onClick={() => setShowBalance(!showBalance)}>
                        {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-white bg-opacity-25 rounded-circle">
                    <DollarSign size={28} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire d'op�ration */}
        {showForm && (
          <div className="row mb-5">
            <div className="col-lg-8 mx-auto">
              <div className="card shadow border-0">
                <div className="card-header bg-primary text-white">
                  <div className="d-flex align-items-center justify-content-between">
                    <h5 className="mb-0">
                      <Shield size={20} className="me-2" />
                      Nouvelle opération sécurisée
                    </h5>
                    <button className="btn btn-link text-white p-1" onClick={() => setShowForm(false)}>
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
                <div className="card-body p-4">
                  {/* S�lecteur de type d'op�ration */}
                  <div className="operation-type-selector">
                    <h6 className="fw-bold mb-3">Type d'opération</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div
                          className={`operation-card card h-100 cursor-pointer ${
                            typeOperation === "depot" ? "selected" : ""
                          }`}
                          onClick={() => setTypeOperation("depot")}
                        >
                          <div className="card-body text-center">
                            <ArrowUpCircle size={32} className="text-success mb-2" />
                            <h6 className="fw-bold">Dépot</h6>
                            <small className="text-muted">Ajouter des fonds</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div
                          className={`operation-card card h-100 cursor-pointer ${
                            typeOperation === "retrait" ? "selected" : ""
                          }`}
                          onClick={() => setTypeOperation("retrait")}
                        >
                          <div className="card-body text-center">
                            <ArrowDownCircle size={32} className="text-danger mb-2" />
                            <h6 className="fw-bold">Retrait</h6>
                            <small className="text-muted">Retirer des fonds</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div
                          className={`operation-card card h-100 cursor-pointer ${
                            typeOperation === "virement" ? "selected" : ""
                          }`}
                          onClick={() => setTypeOperation("virement")}
                        >
                          <div className="card-body text-center">
                            <ArrowRightCircle size={32} className="text-warning mb-2" />
                            <h6 className="fw-bold">Virement</h6>
                            <small className="text-muted">Transférer des fonds</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formulaire */}
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      {/* Compte source (lecture seule) */}
                      <div className="col-md-6">
                        <div className="form-floating">
                          <input
                            type="text"
                            className="form-control"
                            value={`${numeroCompte} (${utilisateur?.nom})`}
                            readOnly
                          />
                          <label>Compte source</label>
                        </div>
                      </div>

                      {/* Compte destinataire (seulement pour virement) */}
                      {typeOperation === "virement" && (
                        <div className="col-md-6">
                          <div className="form-floating">
                            <input
                              type="text"
                              className="form-control"
                              id="compteDestinataire"
                              value={compteDestinataire}
                              onChange={(e) => setCompteDestinataire(e.target.value)}
                              placeholder="Num�ro du compte destinataire"
                              required
                            />
                            <label htmlFor="compteDestinataire">Compte destinataire *</label>
                          </div>
                        </div>
                      )}

                      {/* Montant */}
                      <div className="col-md-6">
                        <div className="form-floating">
                          <input
                            type="number"
                            className="form-control"
                            id="montant"
                            value={montant}
                            onChange={(e) => setMontant(e.target.value)}
                            placeholder="Montant en XOF"
                            min="1"
                            step="1"
                            required
                          />
                          <label htmlFor="montant">Montant (XOF) *</label>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="col-12">
                        <div className="form-floating">
                          <textarea
                            className="form-control"
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optionnelle)"
                            style={{ height: "80px" }}
                          />
                          <label htmlFor="description">Description (optionnelle)</label>
                        </div>
                      </div>
                    </div>

                    {/* Boutons */}
                    <div className="d-flex gap-3 mt-4">
                      <button type="submit" className="btn btn-primary btn-lg flex-grow-1" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 size={20} className="me-2 spinner-border spinner-border-sm" />
                            Traitement...
                          </>
                        ) : (
                          <>
                            {getOperationIcon(typeOperation)}
                            <span className="ms-2">Effectuer le {formatType(typeOperation).toLowerCase()}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-lg"
                        onClick={resetForm}
                        disabled={loading}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Op�rations r�centes */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow border-0">
              <div className="card-header bg-body-secondary">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">
                    <Clock size={20} className="me-2" />
                    Opérations récentes
                  </h5>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={loadRecentOperations}
                    disabled={loadingRecent}
                  >
                    {loadingRecent ? <Loader2 size={16} className="spinner-border spinner-border-sm" /> : "Actualiser"}
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                {recentOperations.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-end">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOperations.map((operation) => {
                          const { date, time } = formatDateTime(operation.date)
                          return (
                            <tr key={operation._id} className="recent-operation">
                              <td className="px-4 py-3">
                                <div>
                                  <div className="fw-medium">{date}</div>
                                  <small className="text-muted">{time}</small>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="d-flex align-items-center">
                                  {getOperationIcon(operation.type)}
                                  <span className="ms-2">{formatType(operation.type)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <div className="fw-medium">
                                    {operation.description || `${formatType(operation.type)} - ${date}`}
                                  </div>
                                  {operation.utilisateur && (
                                    <small className="text-muted">
                                      <User size={12} className="me-1" />
                                      {operation.utilisateur}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-end fw-bold ${getOperationColor(operation.type)}`}>
                                {operation.type === "depot" ? "+" : operation.type === "retrait" ? "-" : "�"}
                                {formatCurrency(operation.montant)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <CreditCard size={48} className="text-muted mb-3" />
                    <h6 className="fw-medium mb-2">Aucune opération récente</h6>
                    <p className="text-muted">Vos dernières transactions apparaitront ici</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Operations