"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import {
  Home,
  CreditCard,
  History,
  Users,
  User,
  LogOut,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Filter,
  Download,
  Calendar,
  Clock,
  Search,
  ChevronDown,
  ArrowRight,
  Moon,
  Sun,
  Cookie,
  Settings,
} from "lucide-react"
import Operations from "./operations"

interface DashboardProps {
  token: string
  utilisateur: {
    nom: string
    email: string
    role: string
    numeroCompte?: string
  }
  onLogout: () => void
  onGoToAdmin?: () => void
}

interface Transaction {
  _id: string
  type: "depot" | "retrait" | "virement"
  montant: number
  date: string
  description?: string
  compteSource?: string
  compteDestination?: string
  utilisateur?: string
}

interface Statistique {
  periode: string
  depots: number
  retraits: number
  virements: number
}

interface UtilisateurInfo {
  numeroCompte: string
  nom: string
  email: string
  role: string
}

// ==================== INTERFACES � AJOUTER ====================
interface JournalData {
  _id: string
  anciennete_jours: number
  montant: number
  heure: number
  nouveau_beneficiaire: number
  solde_avant: number
  nb_virements_1h: number
  changement_mdp: number
  minutes_depuis_chg_mdp: number
  localisation: number
  nb_virements_vers_benef: number
  numeroCompte?: string
  utilisateur?: string
  timestamp?: string
}

interface FraudeDetection extends JournalData {
  fraude: boolean
  prediction_timestamp: string
  confidence?: number
}

interface StatsFraude {
  total: number
  fraudes: number
  legitimes: number
  pourcentage: number
}

const PERIODES_FILTRE = [
  { value: "today", label: "Aujourd'hui" },
  { value: "3days", label: "3 derniers jours" },
  { value: "week", label: "Cette semaine" },
  { value: "15days", label: "15 derniers jours" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
]

const TYPES_OPERATION = [
  { value: "all", label: "Tous les types" },
  { value: "depot", label: "Dépots" },
  { value: "retrait", label: "Retraits" },
  { value: "virement", label: "Virements" },
]

const NOMBRE_OPERATIONS = [
  { value: 5, label: "5 opérations" },
  { value: 10, label: "10 opérations" },
  { value: 20, label: "20 opérations" },
  { value: 50, label: "50 opérations" },
]

const Dashboard: React.FC<DashboardProps> = ({ token, utilisateur, onLogout, onGoToAdmin }) => {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [solde, setSolde] = useState<number>(0)
  const [historique, setHistorique] = useState<Transaction[]>([])
  const [statistiques, setStatistiques] = useState<Statistique[]>([])
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [periodeGraphique, setPeriodeGraphique] = useState("month")
  const [periodeOperations, setPeriodeOperations] = useState("month")
  const [typeOperation, setTypeOperation] = useState("all")
  const [nombreOperations, setNombreOperations] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showCookieConsent, setShowCookieConsent] = useState(false)
  const [cookiesAccepted, setCookiesAccepted] = useState(false)

  // ==================== �TATS � AJOUTER ====================
  const [fraudeDetections, setFraudeDetections] = useState<FraudeDetection[]>([])
  const [statsFraude, setStatsFraude] = useState<StatsFraude>({
    total: 0,
    fraudes: 0,
    legitimes: 0,
    pourcentage: 0,
  })
  const [loadingFraude, setLoadingFraude] = useState(false)
  const [dernierJournalId, setDernierJournalId] = useState<string | null>(null)

  const numeroCompte = utilisateur?.numeroCompte || "1234567890"

  useEffect(() => {
    const savedCookieConsent = localStorage.getItem("bankguard-cookies-accepted")
    const savedDarkMode = localStorage.getItem("bankguard-dark-mode")
    if (savedCookieConsent === "true") {
      setCookiesAccepted(true)
      if (savedDarkMode === "true") {
        setDarkMode(true)
        document.documentElement.setAttribute("data-bs-theme", "dark")
      }
    } else {
      setShowCookieConsent(true)
    }
  }, [])

  const handleCookieAccept = () => {
    localStorage.setItem("bankguard-cookies-accepted", "true")
    localStorage.setItem("bankguard-dark-mode", darkMode.toString())
    setCookiesAccepted(true)
    setShowCookieConsent(false)
  }

  const handleCookieDecline = () => {
    localStorage.removeItem("bankguard-cookies-accepted")
    localStorage.removeItem("bankguard-dark-mode")
    setCookiesAccepted(false)
    setShowCookieConsent(false)
  }

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    if (newDarkMode) {
      document.documentElement.setAttribute("data-bs-theme", "dark")
    } else {
      document.documentElement.removeAttribute("data-bs-theme")
    }
    if (cookiesAccepted) {
      localStorage.setItem("bankguard-dark-mode", newDarkMode.toString())
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // ==================== FONCTIONS � AJOUTER ====================
  // Fonction pour surveiller les nouveaux journaux (similaire � watch_journals.py)
  const surveillerJournaux = async () => {
    if (utilisateur?.role !== "admin") return

    try {
      const response = await fetch(`http://localhost:5000/api/journals/dernier`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const journal = await response.json()

        // V�rifier s'il est nouveau
        if (journal && journal._id !== dernierJournalId) {
          setDernierJournalId(journal._id)

          // V�rification des champs requis (comme dans watch_journals.py)
          const champsRequis = [
            "anciennete_jours",
            "montant",
            "heure",
            "nouveau_beneficiaire",
            "solde_avant",
            "nb_virements_1h",
            "changement_mdp",
            "minutes_depuis_chg_mdp",
            "localisation",
            "nb_virements_vers_benef",
          ]

          if (champsRequis.every((champ) => champ in journal)) {
            console.log("Nouveau journal détecté:", journal._id)
            await analyserFraude(journal)
          } else {
            const champsAbsents = champsRequis.filter((champ) => !(champ in journal))
            console.warn("Journal incomplet, champs manquants:", champsAbsents)
          }
        }
      }
    } catch (error) {
      console.error("Erreur surveillance journaux:", error)
    }
  }

  // Fonction pour envoyer les donn�es � l'API Flask (comme watch_journals.py)
  const analyserFraude = async (journal: JournalData) => {
    try {
      const data = {
        anciennete_jours: journal.anciennete_jours,
        montant: journal.montant,
        heure: journal.heure,
        nouveau_beneficiaire: journal.nouveau_beneficiaire,
        solde_avant: journal.solde_avant,
        nb_virements_1h: journal.nb_virements_1h,
        changement_mdp: journal.changement_mdp,
        minutes_depuis_chg_mdp: journal.minutes_depuis_chg_mdp,
        localisation: journal.localisation,
        nb_virements_vers_benef: journal.nb_virements_vers_benef,
      }

      console.log("Données envoyées à l'API Flask:", data)

      const response = await fetch("http://localhost:5050/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const prediction = await response.json()
        console.log("Réponse de l'API Flask:", prediction)

        // Cr�er l'objet de d�tection avec le r�sultat
        const detection: FraudeDetection = {
          ...journal,
          fraude: prediction.prediction === 1 || prediction.fraude === true,
          prediction_timestamp: new Date().toISOString(),
          confidence: prediction.confidence || prediction.probability,
        }

        // Ajouter � la liste des d�tections
        setFraudeDetections((prev) => [detection, ...prev.slice(0, 19)]) // Garder les 20 derni�res

        // Mettre � jour les statistiques
        setStatsFraude((prev) => {
          const newTotal = prev.total + 1
          const newFraudes = prev.fraudes + (detection.fraude ? 1 : 0)
          const newLegitimes = newTotal - newFraudes
          const newPourcentage = newTotal > 0 ? Math.round((newFraudes / newTotal) * 100) : 0

          return {
            total: newTotal,
            fraudes: newFraudes,
            legitimes: newLegitimes,
            pourcentage: newPourcentage,
          }
        })
      } else {
        console.error("Erreur API Flask:", response.status)
      }
    } catch (error) {
      console.error("Erreur analyse fraude:", error)
    }
  }

  // Fonction pour charger les d�tections existantes
  const chargerDetectionsFraude = async () => {
    if (utilisateur?.role !== "admin") return

    setLoadingFraude(true)
    try {
      // Utiliser des donn�es de d�monstration si l'API n'est pas disponible
      const demoData: FraudeDetection[] = [
        {
          _id: "demo1",
          anciennete_jours: 36,
          montant: 2000,
          heure: 2,
          nouveau_beneficiaire: 1,
          solde_avant: 962224,
          nb_virements_1h: 7,
          changement_mdp: 0,
          minutes_depuis_chg_mdp: 9999,
          localisation: 0,
          nb_virements_vers_benef: 0,
          fraude: true,
          prediction_timestamp: new Date().toISOString(),
          numeroCompte: "1234567890",
          utilisateur: "Admin",
          confidence: 0.85,
        },
        {
          _id: "demo2",
          anciennete_jours: 36,
          montant: 2000,
          heure: 14,
          nouveau_beneficiaire: 0,
          solde_avant: 962224,
          nb_virements_1h: 2,
          changement_mdp: 0,
          minutes_depuis_chg_mdp: 9999,
          localisation: 0,
          nb_virements_vers_benef: 4,
          fraude: false,
          prediction_timestamp: new Date(Date.now() - 60000).toISOString(),
          numeroCompte: "4567123456",
          utilisateur: "Alice",
          confidence: 0.23,
        },
      ]

      setFraudeDetections(demoData)
      setStatsFraude({ total: 2, fraudes: 1, legitimes: 1, pourcentage: 50 })
    } catch (error) {
      console.error("Erreur chargement d�tections:", error)
    } finally {
      setLoadingFraude(false)
    }
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
      full: date.toLocaleString("fr-FR"),
    }
  }

  const getNomUtilisateur = (numeroCompte: string): string => {
    if (!numeroCompte) {
      return "Compte inconnu"
    }
    const user = utilisateurs.find((u) => u.numeroCompte === numeroCompte)
    if (user) {
      return user.nom
    }
    if (numeroCompte === "4567123456") return "Alice"
    if (numeroCompte === "0987654321") return "Admin"
    if (numeroCompte === "1234567890") return "Admin"
    return `Compte ${numeroCompte.slice(-4)}`
  }

  const formatParticipants = (transaction: Transaction) => {
    if (transaction.type === "virement") {
      const nomSource = transaction.compteSource ? getNomUtilisateur(transaction.compteSource) : "Inconnu"
      const nomDestination = transaction.compteDestination
        ? getNomUtilisateur(transaction.compteDestination)
        : "Inconnu"
      return {
        type: "virement",
        source: nomSource,
        destination: nomDestination,
        display: `${nomSource} → ${nomDestination}`,
      }
    } else {
      return {
        type: transaction.type,
        source: utilisateur?.nom || "Utilisateur",
        destination: "",
        display: utilisateur?.nom || "Utilisateur",
      }
    }
  }

  const filterByPeriod = (data: Transaction[], period: string) => {
    const now = new Date()
    const startDate = new Date()
    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0)
        break
      case "3days":
        startDate.setDate(now.getDate() - 3)
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case "15days":
        startDate.setDate(now.getDate() - 15)
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      default:
        return data
    }
    return data.filter((item) => new Date(item.date) >= startDate)
  }

  const groupDataByPeriod = (data: Transaction[], period: string) => {
    const grouped: { [key: string]: Statistique } = {}
    data.forEach((op) => {
      const date = new Date(op.date)
      let periodKey: string
      switch (period) {
        case "today":
        case "3days":
          periodKey = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          break
        case "week":
        case "15days":
          periodKey = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
          break
        case "month":
          const weekNumber = Math.ceil(date.getDate() / 7)
          periodKey = `Sem ${weekNumber}`
          break
        case "year":
          periodKey = date.toLocaleDateString("fr-FR", { month: "short" })
          break
        default:
          periodKey = date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
      }
      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          periode: periodKey,
          depots: 0,
          retraits: 0,
          virements: 0,
        }
      }
      switch (op.type) {
        case "depot":
          grouped[periodKey].depots += op.montant
          break
        case "retrait":
          grouped[periodKey].retraits += op.montant
          break
        case "virement":
          grouped[periodKey].virements += op.montant
          break
      }
    })
    return Object.values(grouped).sort((a, b) => {
      return a.periode.localeCompare(b.periode)
    })
  }

  const operationsFiltrees = useMemo(() => {
    let filtered = filterByPeriod(historique, periodeOperations)
    if (typeOperation !== "all") {
      filtered = filtered.filter((op) => op.type === typeOperation)
    }
    return filtered.slice(0, nombreOperations)
  }, [historique, periodeOperations, typeOperation, nombreOperations])

  const statistiquesFiltrees = useMemo(() => {
    const filtered = filterByPeriod(historique, periodeGraphique)
    return groupDataByPeriod(filtered, periodeGraphique)
  }, [historique, periodeGraphique])

  const exportToCSV = () => {
    const headers = ["Date", "Heure", "Type", "Montant", "Description", "De", "Vers"]
    const csvData = operationsFiltrees.map((op) => {
      const { date, time } = formatDateTime(op.date)
      const participants = formatParticipants(op)
      return [
        date,
        time,
        formatType(op.type),
        op.montant,
        op.description || "",
        participants.source,
        participants.destination,
      ]
    })
    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `operations_${numeroCompte}_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            fontSize: "14px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <p
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#000000",
              fontSize: "14px",
            }}
          >
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: entry.color,
                  borderRadius: "2px",
                  marginRight: "8px",
                }}
              />
              <span
                style={{
                  color: "#000000",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                {entry.name}: {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (utilisateur?.role === "admin") {
          try {
            const resUsers = await fetch(`http://localhost:5000/api/users/utilisateurs`, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            })
            if (resUsers.ok) {
              const dataUsers = await resUsers.json()
              setUtilisateurs(dataUsers)
            } else {
              setUtilisateurs([
                { numeroCompte: "0987654321", nom: "Admin", email: "admin@bankguard.sn", role: "admin" },
                { numeroCompte: "4567123456", nom: "Alice", email: "alice3@bankguard.sn", role: "client" },
                { numeroCompte: "1234567890", nom: "Admin", email: "admin@bankguard.sn", role: "admin" },
              ])
            }
          } catch (err) {
            setUtilisateurs([
              { numeroCompte: "0987654321", nom: "Admin", email: "admin@bankguard.sn", role: "admin" },
              { numeroCompte: "4567123456", nom: "Alice", email: "alice3@bankguard.sn", role: "client" },
              { numeroCompte: "1234567890", nom: "Admin", email: "admin@bankguard.sn", role: "admin" },
            ])
          }
        } else {
          setUtilisateurs([
            {
              numeroCompte: numeroCompte,
              nom: utilisateur.nom,
              email: utilisateur.email,
              role: utilisateur.role,
            },
            { numeroCompte: "4567123456", nom: "Alice", email: "alice@bankguard.sn", role: "client" },
            { numeroCompte: "0987654321", nom: "Bob", email: "bob@bankguard.sn", role: "client" },
            { numeroCompte: "1234567890", nom: "Admin", email: "admin@bankguard.sn", role: "admin" },
          ])
        }
        try {
          const resSolde = await fetch(`http://localhost:5000/api/comptes/${numeroCompte}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (resSolde.ok) {
            const dataSolde = await resSolde.json()
            setSolde(dataSolde.solde || 6000)
          } else {
            setSolde(6000)
          }
        } catch (err) {
          setSolde(6000)
        }
        try {
          const resHisto = await fetch(`http://localhost:5000/api/operations/${numeroCompte}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (resHisto.ok) {
            const dataHisto = await resHisto.json()
            const transformedHisto = Array.isArray(dataHisto)
              ? dataHisto.map((op: any, index: number) => ({
                  id: index + 1,
                  _id: op._id,
                  type: op.type,
                  montant: op.montant,
                  date: op.date,
                  description: op.description || `${formatType(op.type)} - ${formatDateTime(op.date).full}`,
                  compteSource: op.compteSource,
                  compteDestination: op.compteDestination,
                  utilisateur: op.utilisateur,
                }))
              : []
            setHistorique(transformedHisto)
          }
        } catch (err) {
          setHistorique([])
        }
        try {
          const resStats = await fetch(`http://localhost:5000/api/stats/${numeroCompte}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (resStats.ok) {
            const dataStats = await resStats.json()
            if (Array.isArray(dataStats) && dataStats.length > 0) {
              const realStats = dataStats.map((stat: any) => ({
                periode: stat.mois.charAt(0).toUpperCase() + stat.mois.slice(1),
                depots: stat.depots || 0,
                retraits: stat.retraits || 0,
                virements: stat.virements || 0,
              }))
              setStatistiques(realStats)
            } else {
              setStatistiques([])
            }
          } else {
            setStatistiques([])
          }
        } catch (err) {
          setStatistiques([])
        }
      } catch (error) {
        console.error("Erreur:", error)
        setSolde(6000)
        setHistorique([])
        setStatistiques([])
      } finally {
        setLoading(false)
      }
    }
    if (token && utilisateur) {
      fetchData()
    }
  }, [token, numeroCompte, utilisateur])

  // ==================== USEEFFECT � AJOUTER ====================
  // Surveillance en temps r�el des journaux (comme watch_journals.py)
  useEffect(() => {
    if (utilisateur?.role !== "admin") return

    // Charger les d�tections existantes au d�marrage
    chargerDetectionsFraude()

    // D�marrer la surveillance en temps r�el
    const interval = setInterval(() => {
      surveillerJournaux()
    }, 2000) // Toutes les 2 secondes comme dans watch_journals.py

    return () => clearInterval(interval)
  }, [utilisateur?.role, token, dernierJournalId])

  const navigationItems = [
    { id: "dashboard", label: "Tableau de bord", icon: Home },
    { id: "operations", label: "Opérations", icon: CreditCard },
    { id: "historique", label: "Historique", icon: History },
    ...(utilisateur?.role === "admin" ? [{ id: "users", label: "Utilisateurs", icon: Users }] : []),
    { id: "profile", label: "Profil", icon: User },
  ]

  const handleLogout = () => {
    console.log("Déconnexion depuis le dashboard")
    onLogout()
  }

  const handleOperationComplete = () => {
    console.log("DASHBOARD - Rechargement après opération")
    const fetchUpdatedData = async () => {
      try {
        const resSolde = await fetch(`http://localhost:5000/api/comptes/${numeroCompte}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        })
        if (resSolde.ok) {
          const dataSolde = await resSolde.json()
          setSolde(dataSolde.solde || 0)
        }
        const resHisto = await fetch(`http://localhost:5000/api/operations/${numeroCompte}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        })
        if (resHisto.ok) {
          const dataHisto = await resHisto.json()
          const transformedHisto = Array.isArray(dataHisto)
            ? dataHisto.map((op: any, index: number) => ({
                id: index + 1,
                _id: op._id,
                type: op.type,
                montant: op.montant,
                date: op.date,
                description: op.description || `${formatType(op.type)} - ${formatDateTime(op.date).full}`,
                compteSource: op.compteSource,
                compteDestination: op.compteDestination,
                utilisateur: op.utilisateur,
              }))
            : []
          setHistorique(transformedHisto)
        }
      } catch (error) {
        console.error("Erreur lors du rechargement des donn�es:", error)
      }
    }
    fetchUpdatedData()
  }

  if (loading) {
    return (
      <>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <div
          className="min-vh-100 d-flex align-items-center justify-content-center"
          style={{ background: "linear-gradient(135deg, #e3f2fd, #f3e5f5)" }}
        >
          <div className="text-center">
            <div className="position-relative mx-auto mb-4" style={{ width: "120px", height: "120px" }}>
              <div className="spinner-border text-primary" role="status" style={{ width: "120px", height: "120px" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <Shield className="position-absolute top-50 start-50 translate-middle text-primary" size={32} />
            </div>
            <h3 className="h4 fw-semibold text-dark mb-2">BankGuard</h3>
            <p className="text-muted mb-1">Connexion à MongoDB...</p>
            <p className="small text-muted">Chargement des données de {utilisateur?.nom}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 280px;
          background: linear-gradient(180deg, #1a202c 0%, #2d3748 50%, #1a202c 100%);
          z-index: 1050;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border-right: 1px solid #4a5568;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }
        
        .sidebar.show {
          transform: translateX(0);
        }
        
        @media (min-width: 992px) {
          .sidebar {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 280px;
          }
        }
        
        .sidebar-header {
          height: 80px;
          background: rgba(45, 55, 72, 0.5);
          border-bottom: 1px solid #4a5568;
        }
        
        .nav-item-custom {
          margin-bottom: 0.5rem;
        }
        
        .nav-link-custom {
          color: #cbd5e0;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          transition: all 0.2s;
          text-decoration: none;
          display: flex;
          align-items: center;
          font-weight: 500;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }
        
        .nav-link-custom:hover {
          background-color: rgba(74, 85, 104, 0.5);
          color: white;
          transform: scale(1.02);
        }
        
        .nav-link-custom.active {
          background: linear-gradient(90deg, #3182ce, #2c5aa0);
          color: white;
          box-shadow: 0 4px 12px rgba(49, 130, 206, 0.4);
          transform: scale(1.02);
        }
        
        .nav-link-logout {
          color: #fc8181;
        }
        
        .nav-link-logout:hover {
          background-color: rgba(220, 38, 38, 0.2);
          color: #fca5a5;
        }
        
        .card-gradient-blue {
          background: linear-gradient(135deg, #3182ce, #2c5aa0, #2a4a7c);
          color: white;
        }
        
        .card-hover {
          transition: transform 0.3s ease;
        }
        
        .card-hover:hover {
          transform: translateY(-5px);
        }
        
        .badge-depot {
          background-color: #d4edda;
          color: #155724;
        }
        
        .badge-retrait {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .badge-virement {
          background-color: #e1f5fe;
          color: #0277bd;
        }
        
        .table-hover tbody tr:hover {
          background-color: var(--bs-gray-100);
        }
        
        .header-sticky {
          position: sticky;
          top: 0;
          z-index: 1040;
        }
        
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1040;
        }
        
        .filter-panel {
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #cbd5e0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .tooltip-hover {
          cursor: help;
        }
        
        .operation-row {
          transition: all 0.2s ease;
        }
        
        .operation-row:hover {
          background-color: var(--bs-gray-100) !important;
          transform: translateX(2px);
        }
        
        .virement-info {
          background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
          border: 1px solid #3182ce;
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 6px;
        }
        
        .user-badge {
          background: linear-gradient(45deg, #3182ce, #805ad5);
          color: white;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 2px 4px rgba(49, 130, 206, 0.3);
        }
        
        .participants-display {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .dark-mode-toggle {
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.3s ease;
        }
        
        .dark-mode-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        }
        
        .cookie-consent {
          position: fixed;
          bottom: 20px;
          right: 20px;
          max-width: 400px;
          z-index: 1060;
          animation: slideInUp 0.5s ease-out;
        }
        
        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        [data-bs-theme="dark"] .sidebar {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          border-right-color: #334155;
        }
        
        [data-bs-theme="dark"] .sidebar-header {
          background: rgba(15, 23, 42, 0.8);
          border-bottom-color: #334155;
        }
        
        [data-bs-theme="dark"] .card-gradient-blue {
          background: linear-gradient(135deg, #1e40af, #1e3a8a, #1e3a8a);
        }
        
        [data-bs-theme="dark"] .filter-panel {
          background: linear-gradient(135deg, #1e293b, #334155);
          border-color: #475569;
          color: #e2e8f0;
        }
        
        [data-bs-theme="dark"] .virement-info {
          background: linear-gradient(135deg, #1e3a8a, #3730a3);
          border-color: #3b82f6;
          color: #dbeafe;
        }
        
        [data-bs-theme="dark"] .user-badge {
          background: linear-gradient(45deg, #1e40af, #7c3aed);
        }
      `}</style>
      <div className="min-vh-100" style={{ backgroundColor: darkMode ? "#1a1a1a" : "#f8f9fa" }}>
        <div className={`sidebar ${sidebarOpen ? "show" : ""}`}>
          <div className="sidebar-header d-flex align-items-center justify-content-between px-4">
            <div className="d-flex align-items-center">
              <div className="p-2 bg-primary rounded me-3">
                <Shield className="text-white" size={32} />
              </div>
              <div>
                <h5 className="text-white mb-0 fw-bold">BankGuard</h5>
                <small className="text-light opacity-75">Sécurité Bancaire</small>
              </div>
            </div>
            <button className="btn btn-link text-light d-lg-none p-2" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <nav className="px-3 mt-4">
            <div className="nav flex-column">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="nav-item-custom">
                    <button
                      type="button"
                      className={`nav-link-custom ${activeSection === item.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveSection(item.id)
                        setSidebarOpen(false)
                      }}
                    >
                      <Icon size={24} className="me-3" />
                      {item.label}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid #4a5568" }}>
              <div className="nav-item-custom">
                <button type="button" className="nav-link-custom nav-link-logout" onClick={handleLogout}>
                  <LogOut size={24} className="me-3" />
                  Déconnexion
                </button>
              </div>
            </div>
          </nav>
        </div>
        {sidebarOpen && <div className="overlay d-lg-none" onClick={() => setSidebarOpen(false)} />}
        <div className="main-content">
          <header className="bg-body shadow-sm border-bottom header-sticky">
            <div className="d-flex align-items-center justify-content-between p-4">
              <div className="d-flex align-items-center">
                <button className="btn btn-outline-secondary d-lg-none me-3" onClick={() => setSidebarOpen(true)}>
                  <Menu size={24} />
                </button>
                <div>
                  <h1 className="h2 mb-1 fw-bold">
                    {activeSection === "dashboard" && "Tableau de bord"}
                    {activeSection === "operations" && "Opérations"}
                    {activeSection === "historique" && "Historique"}
                    {activeSection === "users" && "Gestion des utilisateurs"}
                    {activeSection === "profile" && "Mon profil"}
                  </h1>
                  <p className="text-muted small mb-0">
                    Connecté en tant que {utilisateur?.nom} ({utilisateur?.role})
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <button className="dark-mode-toggle" onClick={toggleDarkMode} title="Basculer le mode sombre">
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div className="position-relative">
                  <button className="btn btn-outline-secondary rounded-circle p-2">
                    <Bell size={20} />
                  </button>
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    3
                  </span>
                </div>
                <div className="d-flex align-items-center bg-body-secondary rounded-3 px-3 py-2">
                  <div className="text-end me-3">
                    <div className="fw-semibold">{utilisateur?.nom || "Utilisateur"}</div>
                    <small className="text-muted text-capitalize">{utilisateur?.role || "client"}</small>
                  </div>
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                      width: "48px",
                      height: "48px",
                      background: "linear-gradient(45deg, #3182ce, #805ad5)",
                    }}
                  >
                    {utilisateur?.nom?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="p-4">
            {activeSection === "dashboard" && (
              <div>
                <div className="alert alert-success d-flex align-items-center mb-4">
                  <Shield size={20} className="me-2" />
                  <span>
                    Compte: {numeroCompte} ({utilisateur?.nom})
                  </span>
                </div>
                <div className="row g-4 mb-5">
                  <div className="col-lg-3 col-md-6">
                    <div className="card card-gradient-blue card-hover h-100 border-0 shadow">
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <p className="card-text opacity-75 mb-2">Solde actuel</p>
                            <div className="d-flex align-items-center">
                              <h3 className="card-title mb-0 me-3">
                                {showBalance ? formatCurrency(solde) : "••••••••"}
                              </h3>
                              <button
                                className="btn btn-link text-white p-1"
                                onClick={() => setShowBalance(!showBalance)}
                              >
                                {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </div>
                          <div className="p-3 bg-white bg-opacity-25 rounded-circle">
                            <DollarSign size={32} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6">
                    <div className="card card-hover h-100 shadow border-0">
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <p className="card-text text-muted mb-2">Compte Numero :</p>
                            <h3 className="card-title mb-0">{numeroCompte}</h3>
                          </div>
                          <div className="p-3 bg-body-secondary rounded-circle">
                            <CreditCard size={32} className="text-secondary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6">
                    <div className="card card-hover h-100 shadow border-0">
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <p className="card-text text-muted mb-2">Opérations totales</p>
                            <h3 className="card-title mb-0">{historique.length}</h3>
                          </div>
                          <div className="p-3 bg-success bg-opacity-10 rounded-circle">
                            <Activity size={32} className="text-success" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6">
                    <div className="card card-hover h-100 shadow border-0">
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <p className="card-text text-muted mb-2">Statut du compte</p>
                            <h3 className="card-title mb-0 text-success">Actif</h3>
                          </div>
                          <div className="p-3 bg-success bg-opacity-10 rounded-circle">
                            <Shield size={32} className="text-success" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== MODULE UI � AJOUTER ==================== */}
                {/* Module de d�tection de fraude - Admin uniquement */}
                {utilisateur?.role === "admin" && (
                  <div className="row g-4 mb-5">
                    <div className="col-12">
                      <div className="card shadow border-0">
                        <div
                          className="card-header"
                          style={{
                            background: "linear-gradient(135deg, #dc3545, #c82333)",
                            color: "white",
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <Shield size={24} className="me-3" />
                              <div>
                                <h4 className="card-title mb-1 fw-bold">Détection de Fraude IA - Temps Réel</h4>
                                <p className="mb-0 opacity-75">
                                  Surveillance automatique à API Flask
                                </p>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <div className="text-center">
                                <div className="h5 mb-0 fw-bold">{statsFraude.total}</div>
                                <small className="opacity-75">Analysées</small>
                              </div>
                              <div className="text-center">
                                <div className="h5 mb-0 fw-bold text-warning">{statsFraude.fraudes}</div>
                                <small className="opacity-75">Fraudes</small>
                              </div>
                              <div className="text-center">
                                <div className="h5 mb-0 fw-bold">{statsFraude.pourcentage}%</div>
                                <small className="opacity-75">Risque</small>
                              </div>
                              <div className="text-center">
                                <div className={`spinner-border spinner-border-sm ${loadingFraude ? "" : "d-none"}`}>
                                  <span className="visually-hidden">Surveillance...</span>
                                </div>
                                <small className="opacity-75 d-block">Live</small>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="card-body">
                          <div className="row g-4">
                            {/* Graphique de synth�se */}
                            <div className="col-md-4">
                              <div className="text-center p-4 bg-light rounded">
                                <h6 className="fw-bold mb-3">Répartition en Temps Réel</h6>
                                <div className="position-relative d-inline-block">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                                    style={{
                                      width: "120px",
                                      height: "120px",
                                      background: `conic-gradient(#dc3545 0deg ${statsFraude.pourcentage * 3.6}deg, #28a745 ${
                                        statsFraude.pourcentage * 3.6
                                      }deg 360deg)`,
                                    }}
                                  >
                                    <div
                                      className="rounded-circle bg-white d-flex align-items-center justify-content-center"
                                      style={{ width: "80px", height: "80px" }}
                                    >
                                      <span className="h4 fw-bold mb-0">{statsFraude.pourcentage}%</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="d-flex justify-content-center gap-4">
                                  <div className="text-center">
                                    <div className="d-flex align-items-center mb-1">
                                      <div
                                        className="bg-danger rounded me-2"
                                        style={{ width: "12px", height: "12px" }}
                                      ></div>
                                      <small className="fw-medium">Fraudes</small>
                                    </div>
                                    <div className="fw-bold">{statsFraude.fraudes}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="d-flex align-items-center mb-1">
                                      <div
                                        className="bg-success rounded me-2"
                                        style={{ width: "12px", height: "12px" }}
                                      ></div>
                                      <small className="fw-medium">Légitimes</small>
                                    </div>
                                    <div className="fw-bold">{statsFraude.legitimes}</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Liste des d�tections r�centes */}
                            <div className="col-md-8">
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold mb-0">Détections en Temps Réel (API Flask)</h6>
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={chargerDetectionsFraude}
                                  disabled={loadingFraude}
                                >
                                  {loadingFraude ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-2"></span>
                                      Actualisation...
                                    </>
                                  ) : (
                                    <>
                                      <Activity size={16} className="me-2" />
                                      Actualiser
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                <table className="table table-sm table-hover mb-0">
                                  <thead className="table-light sticky-top">
                                    <tr>
                                      <th className="px-3 py-2">Heure</th>
                                      <th className="px-3 py-2">Montant</th>
                                      <th className="px-3 py-2">Indicateurs</th>
                                      <th className="px-3 py-2">Résultat IA</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fraudeDetections.map((detection) => (
                                      <tr
                                        key={detection._id}
                                        className={detection.fraude ? "table-danger" : "table-success"}
                                      >
                                        <td className="px-3 py-2">
                                          <div className="small">
                                            <div className="fw-medium">
                                              {new Date(detection.prediction_timestamp).toLocaleTimeString("fr-FR", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                              })}
                                            </div>
                                            <div className="text-muted">
                                              {detection.utilisateur ||
                                                `Compte ${detection.numeroCompte?.slice(-4) || "XXX"}`}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="fw-bold">{formatCurrency(detection.montant)}</div>
                                          <small className="text-muted">
                                            Solde: {formatCurrency(detection.solde_avant)}
                                          </small>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="d-flex flex-wrap gap-1">
                                            {detection.nouveau_beneficiaire === 1 && (
                                              <span
                                                className="badge bg-warning text-dark"
                                                style={{ fontSize: "0.7rem" }}
                                              >
                                                Nouveau bénéf.
                                              </span>
                                            )}
                                            {detection.nb_virements_1h > 5 && (
                                              <span className="badge bg-info text-dark" style={{ fontSize: "0.7rem" }}>
                                                {detection.nb_virements_1h} vir./h
                                              </span>
                                            )}
                                            {(detection.heure < 6 || detection.heure > 22) && (
                                              <span className="badge bg-secondary" style={{ fontSize: "0.7rem" }}>
                                                Heure suspecte ({detection.heure}h)
                                              </span>
                                            )}
                                            {detection.changement_mdp === 1 && (
                                              <span className="badge bg-danger" style={{ fontSize: "0.7rem" }}>
                                                MDP chang�
                                              </span>
                                            )}
                                            {detection.localisation === 1 && (
                                              <span
                                                className="badge bg-warning text-dark"
                                                style={{ fontSize: "0.7rem" }}
                                              >
                                                Localisation suspecte
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="d-flex align-items-center">
                                            {detection.fraude ? (
                                              <>
                                                <div
                                                  className="bg-danger rounded-circle me-2"
                                                  style={{ width: "12px", height: "12px" }}
                                                ></div>
                                                <span className="badge bg-danger fw-bold">FRAUDE</span>
                                                {detection.confidence && (
                                                  <small className="text-muted ms-2">
                                                    {Math.round(detection.confidence * 100)}%
                                                  </small>
                                                )}
                                              </>
                                            ) : (
                                              <>
                                                <div
                                                  className="bg-success rounded-circle me-2"
                                                  style={{ width: "12px", height: "12px" }}
                                                ></div>
                                                <span className="badge bg-success fw-bold">LEGITIME</span>
                                                {detection.confidence && (
                                                  <small className="text-muted ms-2">
                                                    {Math.round((1 - detection.confidence) * 100)}%
                                                  </small>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {fraudeDetections.length === 0 && (
                                <div className="text-center py-4">
                                  <Activity size={48} className="text-muted mb-3" />
                                  <p className="text-muted">En attente de nouvelles transactions...</p>
                                  <small className="text-muted">
                                    Les analyses de l'API Flask (port 5050) appara�tront ici automatiquement
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="filter-panel">
                  <div className="d-flex align-items-center justify-content-between flex-wrap">
                    <h6 className="mb-0 d-flex align-items-center">
                      <Filter size={18} className="me-2" />
                      Filtres des graphiques
                      <span className="badge bg-primary ms-2">{statistiquesFiltrees.length} période(s)</span>
                    </h6>
                    <div className="d-flex gap-3 flex-wrap">
                      <div className="d-flex align-items-center">
                        <Calendar size={16} className="me-2 text-muted" />
                        <select
                          className="form-select form-select-sm"
                          value={periodeGraphique}
                          onChange={(e) => setPeriodeGraphique(e.target.value)}
                        >
                          {PERIODES_FILTRE.map((periode) => (
                            <option key={periode.value} value={periode.value}>
                              {periode.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row g-4 mb-5">
                  <div className="col-xl-6">
                    <div className="card shadow border-0 h-100">
                      <div className="card-body">
                        <h4 className="card-title fw-bold mb-2">Evolution des transactions</h4>
                        <p className="card-text text-muted mb-4">
                          {statistiquesFiltrees.length > 0
                            ? `${statistiquesFiltrees.length} période(s) - Filtre: ${
                                PERIODES_FILTRE.find((p) => p.value === periodeGraphique)?.label
                              }`
                            : "Aucune donnée pour la période sélectionnée"}
                        </p>
                        <div style={{ height: "350px" }}>
                          {statistiquesFiltrees.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={statistiquesFiltrees}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="0 0" stroke="transparent" />
                                <XAxis dataKey="periode" tick={{ fontSize: 12 }} axisLine={{ stroke: "#e0e0e0" }} />
                                <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: "#e0e0e0" }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="depots" fill="#3182ce" name="Dépots" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="retraits" fill="#e53e3e" name="Retraits" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="virements" fill="#f59e0b" name="Virements" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="d-flex align-items-center justify-content-center h-100">
                              <div className="text-center">
                                <Activity size={48} className="text-muted mb-3" />
                                <p className="text-muted">Aucune donnée pour cette période</p>
                                <small className="text-muted">
                                  Essayez "Ce mois" ou "Cette année" pour voir plus de données
                                </small>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-xl-6">
                    <div className="card shadow border-0 h-100">
                      <div className="card-body">
                        <h4 className="card-title fw-bold mb-2">Tendance mensuelle</h4>
                        <p className="card-text text-muted mb-4">
                          {statistiquesFiltrees.length > 0
                            ? "Evolution de vos flux financiers réels"
                            : "Graphique vide - Changez la période"}
                        </p>
                        <div style={{ height: "350px" }}>
                          {statistiquesFiltrees.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={statistiquesFiltrees}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="0 0" stroke="transparent" />
                                <XAxis dataKey="periode" tick={{ fontSize: 12 }} axisLine={{ stroke: "#e0e0e0" }} />
                                <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: "#e0e0e0" }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                  type="monotone"
                                  dataKey="depots"
                                  stroke="#3182ce"
                                  strokeWidth={4}
                                  name="Dépots"
                                  dot={{ fill: "#3182ce", strokeWidth: 2, r: 6 }}
                                  activeDot={{ r: 8, stroke: "#3182ce", strokeWidth: 2 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="retraits"
                                  stroke="#e53e3e"
                                  strokeWidth={4}
                                  name="Retraits"
                                  dot={{ fill: "#e53e3e", strokeWidth: 2, r: 6 }}
                                  activeDot={{ r: 8, stroke: "#e53e3e", strokeWidth: 2 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="virements"
                                  stroke="#f59e0b"
                                  strokeWidth={4}
                                  name="Virements"
                                  dot={{ fill: "#f59e0b", strokeWidth: 2, r: 6 }}
                                  activeDot={{ r: 8, stroke: "#f59e0b", strokeWidth: 2 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="d-flex align-items-center justify-content-center h-100">
                              <div className="text-center">
                                <TrendingUp size={48} className="text-muted mb-3" />
                                <p className="text-muted">Sélectionnez une autre période</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card shadow border-0">
                  <div className="card-header bg-body-secondary">
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                      <div>
                        <h4 className="card-title fw-bold mb-2">Opérations récentes</h4>
                        <p className="card-text text-muted mb-0">
                          {operationsFiltrees.length} opération(s) - Participants résolus
                        </p>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => setShowFilters(!showFilters)}>
                          <Filter size={16} className="me-1" />
                          Filtres
                          <ChevronDown size={16} className="ms-1" />
                        </button>
                        <button className="btn btn-success btn-sm" onClick={exportToCSV}>
                          <Download size={16} className="me-1" />
                          Export CSV
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setActiveSection("historique")}>
                          Voir tout
                        </button>
                      </div>
                    </div>
                    {showFilters && (
                      <div className="mt-3 p-3 bg-body rounded border">
                        <div className="row g-3">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Période</label>
                            <select
                              className="form-select form-select-sm"
                              value={periodeOperations}
                              onChange={(e) => setPeriodeOperations(e.target.value)}
                            >
                              {PERIODES_FILTRE.map((periode) => (
                                <option key={periode.value} value={periode.value}>
                                  {periode.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Type d'opération</label>
                            <select
                              className="form-select form-select-sm"
                              value={typeOperation}
                              onChange={(e) => setTypeOperation(e.target.value)}
                            >
                              {TYPES_OPERATION.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold">Nombre à afficher</label>
                            <select
                              className="form-select form-select-sm"
                              value={nombreOperations}
                              onChange={(e) => setNombreOperations(Number(e.target.value))}
                            >
                              {NOMBRE_OPERATIONS.map((nombre) => (
                                <option key={nombre.value} value={nombre.value}>
                                  {nombre.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3 d-flex align-items-end">
                            <button
                              className="btn btn-outline-secondary btn-sm w-100"
                              onClick={() => {
                                setPeriodeOperations("month")
                                setTypeOperation("all")
                                setNombreOperations(10)
                              }}
                            >
                              Réinitialiser
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card-body p-0">
                    {operationsFiltrees.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="px-4 py-3 fw-semibold text-uppercase small">Date</th>
                              <th className="px-4 py-3 fw-semibold text-uppercase small">Type</th>
                              <th className="px-4 py-3 fw-semibold text-uppercase small">Description</th>
                              <th className="px-4 py-3 fw-semibold text-uppercase small text-end">Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {operationsFiltrees.map((transaction) => {
                              const { date, time, full } = formatDateTime(transaction.date)
                              const participants = formatParticipants(transaction)
                              return (
                                <tr key={transaction._id} className="operation-row">
                                  <td className="px-4 py-3 fw-medium">
                                    <div className="tooltip-hover" title={`Heure exacte: ${time} - ${full}`}>
                                      <div className="d-flex align-items-center">
                                        <Calendar size={14} className="me-2 text-muted" />
                                        {date}
                                      </div>
                                      <small className="text-muted d-flex align-items-center mt-1">
                                        <Clock size={12} className="me-1" />
                                        {time}
                                      </small>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`badge d-inline-flex align-items-center ${
                                        transaction.type === "depot"
                                          ? "badge-depot"
                                          : transaction.type === "retrait"
                                            ? "badge-retrait"
                                            : "badge-virement"
                                      }`}
                                    >
                                      {transaction.type === "depot" ? (
                                        <TrendingUp size={16} className="me-2" />
                                      ) : transaction.type === "retrait" ? (
                                        <TrendingDown size={16} className="me-2" />
                                      ) : (
                                        <ArrowRight size={16} className="me-2" />
                                      )}
                                      {formatType(transaction.type)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="d-flex flex-column">
                                      <span className="fw-medium">
                                        {transaction.description || `${formatType(transaction.type)} - ${date}`}
                                      </span>
                                      {participants.type === "virement" && (
                                        <div className="virement-info">
                                          <div className="participants-display">
                                            <span className="user-badge">{participants.source}</span>
                                            <ArrowRight size={14} className="text-muted" />
                                            <span className="user-badge">{participants.destination}</span>
                                          </div>
                                          <small className="text-muted d-block mt-1">
                                            Virement de {formatCurrency(transaction.montant)} à {time}
                                          </small>
                                        </div>
                                      )}
                                      {transaction.utilisateur && (
                                        <small className="text-muted">Initié par: {transaction.utilisateur}</small>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className={`px-4 py-3 text-end fw-bold fs-5 ${
                                      transaction.type === "depot"
                                        ? "text-success"
                                        : transaction.type === "retrait"
                                          ? "text-danger"
                                          : "text-warning"
                                    }`}
                                  >
                                    {transaction.type === "depot" ? "+" : transaction.type === "retrait" ? "-" : "→"}
                                    {formatCurrency(transaction.montant)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <Activity size={64} className="text-muted mb-3" />
                        <h5 className="fw-medium mb-2">Aucune opération trouvée</h5>
                        <p className="text-muted">Modifiez les filtres pour voir plus d'opérations</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeSection === "historique" && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h3 className="fw-bold mb-2">Historique complet des opérations</h3>
                    <p className="text-muted">Toutes vos transactions avec participants détaillés</p>
                  </div>
                  <button className="btn btn-success" onClick={exportToCSV}>
                    <Download size={20} className="me-2" />
                    Exporter tout en CSV
                  </button>
                </div>
                <div className="card mb-4">
                  <div className="card-body">
                    <h6 className="card-title mb-3">
                      <Search size={18} className="me-2" />
                      Recherche et filtres avancés
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label">Période</label>
                        <select
                          className="form-select"
                          value={periodeOperations}
                          onChange={(e) => setPeriodeOperations(e.target.value)}
                        >
                          {PERIODES_FILTRE.map((periode) => (
                            <option key={periode.value} value={periode.value}>
                              {periode.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Type d'opération</label>
                        <select
                          className="form-select"
                          value={typeOperation}
                          onChange={(e) => setTypeOperation(e.target.value)}
                        >
                          {TYPES_OPERATION.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Résultats par page</label>
                        <select
                          className="form-select"
                          value={nombreOperations}
                          onChange={(e) => setNombreOperations(Number(e.target.value))}
                        >
                          {NOMBRE_OPERATIONS.map((nombre) => (
                            <option key={nombre.value} value={nombre.value}>
                              {nombre.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3 d-flex align-items-end">
                        <button className="btn btn-primary w-100">
                          <Search size={16} className="me-2" />
                          Rechercher
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="px-4 py-3">Date & Heure</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description complète</th>
                            <th className="px-4 py-3">Participants</th>
                            <th className="px-4 py-3 text-end">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operationsFiltrees.map((transaction) => {
                            const { date, time } = formatDateTime(transaction.date)
                            const participants = formatParticipants(transaction)
                            return (
                              <tr key={transaction._id}>
                                <td className="px-4 py-3">
                                  <div>
                                    <div className="fw-medium">{date}</div>
                                    <small className="text-muted">{time}</small>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`badge ${
                                      transaction.type === "depot"
                                        ? "badge-depot"
                                        : transaction.type === "retrait"
                                          ? "badge-retrait"
                                          : "badge-virement"
                                    }`}
                                  >
                                    {formatType(transaction.type)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div>
                                    <div className="fw-medium">{transaction.description}</div>
                                    {transaction.utilisateur && (
                                      <small className="text-muted">Initié par: {transaction.utilisateur}</small>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {participants.type === "virement" ? (
                                    <div className="participants-display">
                                      <span className="user-badge">{participants.source}</span>
                                      <ArrowRight size={14} className="text-muted" />
                                      <span className="user-badge">{participants.destination}</span>
                                    </div>
                                  ) : (
                                    <span className="user-badge">{participants.display}</span>
                                  )}
                                </td>
                                <td
                                  className={`px-4 py-3 text-end fw-bold ${
                                    transaction.type === "depot"
                                      ? "text-success"
                                      : transaction.type === "retrait"
                                        ? "text-danger"
                                        : "text-warning"
                                  }`}
                                >
                                  {transaction.type === "depot" ? "+" : transaction.type === "retrait" ? "-" : "→"}
                                  {formatCurrency(transaction.montant)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeSection === "operations" && (
              <Operations token={token} utilisateur={utilisateur} onOperationComplete={handleOperationComplete} />
            )}
            {activeSection === "users" && utilisateur?.role === "admin" && (
              <div className="text-center py-5">
                <div className="p-4 bg-warning bg-opacity-10 rounded-circle d-inline-flex mb-4">
                  <Users size={48} className="text-warning" />
                </div>
                <h3 className="fw-bold mb-3">Gestion des utilisateurs</h3>
                <p className="text-muted mb-4 fs-5">Administrez les utilisateurs et leurs permissions.</p>
                <button className="btn btn-warning btn-lg" onClick={onGoToAdmin}>
                  <Settings size={20} className="me-2" />
                  Ouvrir le panneau d'administration
                </button>
              </div>
            )}
            {activeSection === "profile" && (
              <div className="text-center py-5">
                <div className="p-4 bg-info bg-opacity-10 rounded-circle d-inline-flex mb-4">
                  <User size={48} className="text-info" />
                </div>
                <h3 className="fw-bold mb-3">Profil de {utilisateur?.nom}</h3>
                <p className="text-muted mb-4 fs-5">Gérez vos informations personnelles et paramètres de sécurité.</p>
                <button className="btn btn-info btn-lg">Modifier le profil</button>
              </div>
            )}
          </main>
        </div>
      </div>
      {showCookieConsent && (
        <div className="cookie-consent">
          <div className="card shadow-lg border-0">
            <div className="card-body">
              <div className="d-flex align-items-start">
                <Cookie size={24} className="text-warning me-3 mt-1" />
                <div className="flex-grow-1">
                  <h6 className="card-title fw-bold mb-2">Gestion des cookies</h6>
                  <p className="card-text small mb-3">
                    Nous utilisons des cookies pour sauvegarder vos préférences (mode sombre, filtres) et améliorer
                    votre expérience. Acceptez-vous l'utilisation de cookies ?
                  </p>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={handleCookieAccept}>
                      Accepter
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={handleCookieDecline}>
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </>
  )
}

export default Dashboard