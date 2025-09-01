"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Users,
  Shield,
  DollarSign,
  Settings,
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Filter,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Lock,
  Unlock,
} from "lucide-react"
import "bootstrap/dist/css/bootstrap.min.css"

interface AdminPanelProps {
  token: string
  utilisateur: {
    nom: string
    email: string
    role: string
    numeroCompte?: string
  }
  onBack: () => void
}

interface UtilisateurAdmin {
  id: string
  nom: string
  email: string
  role: "admin" | "client"
  numeroCompte: string
  statut: "actif" | "suspendu" | "inactif"
  dateCreation: string
  derniereConnexion?: string
  solde?: number
}

interface TransactionAdmin {
  id: string
  type: "depot" | "retrait" | "virement"
  montant: number
  date: string
  statut: "en_attente" | "approuve" | "rejete"
  compteSource: string
  compteDestination?: string
  utilisateur: string
  description: string
}

interface Compte {
  _id: string
  numeroCompte: string
  solde: number
  utilisateurId: string
  statut: string
  dateOuverture: string
}

const AdminPanel: React.FC<AdminPanelProps> = ({ token, utilisateur, onBack }) => {
  const [activeTab, setActiveTab] = useState("users")
  const [users, setUsers] = useState<UtilisateurAdmin[]>([])
  const [transactions, setTransactions] = useState<TransactionAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({
    nom: "",
    email: "",
    motDePasse: "",
    numeroCompte: "",
    role: "client",
  })
  const [addingUser, setAddingUser] = useState(false)

  // Fonction pour r�cup�rer le compte d'un utilisateur par son ID
  const getCompteByUserId = async (userId: string): Promise<Compte | null> => {
    try {
      const response = await fetch(`http://localhost:5000/api/comptes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const comptes = await response.json()
        const compte = comptes.find((c: Compte) => c.utilisateurId === userId)
        return compte || null
      } else {
        console.warn(`Erreur r�cup�ration comptes (${response.status})`)
        return null
      }
    } catch (error) {
      console.error(`Erreur r�cup�ration compte pour utilisateur ${userId}:`, error)
      return null
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        console.log("Chargement des donn�es...")

        // �tape 1: R�cup�rer tous les utilisateurs
        const resUsers = await fetch(`http://localhost:5000/api/users/utilisateurs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!resUsers.ok) {
          throw new Error("Erreur lors de la r�cup�ration des utilisateurs")
        }

        const dataUsers = await resUsers.json()
        console.log("Utilisateurs r�cup�r�s:", dataUsers)

        // �tape 2: Pour chaque utilisateur, r�cup�rer son compte
        const usersWithAccounts = await Promise.all(
          dataUsers.map(async (user: any) => {
            console.log(`Recherche compte pour ${user.nom} (ID: ${user._id})`)

            const compte = await getCompteByUserId(user._id)

            if (compte) {
              console.log(`Compte trouv� pour ${user.nom}: ${compte.numeroCompte} (${compte.solde} FCFA)`)
            } else {
              console.log(`Aucun compte trouv� pour ${user.nom}`)
            }

            return {
              id: user._id,
              nom: user.nom,
              email: user.email,
              role: user.role,
              numeroCompte: compte ? compte.numeroCompte : "Non attribué",
              statut: "actif",
              dateCreation: user.dateCreation,
              derniereConnexion: user.derniereConnexion || null,
              solde: compte ? compte.solde : 0,
            }
          }),
        )

        console.log("Donn�es finales:", usersWithAccounts)
        setUsers(usersWithAccounts)
      } catch (error) {
        console.error("Erreur de connexion à l'API:", error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingUser(true)

    try {
      console.log("Cr�ation de l'utilisateur:", newUser)

      // �tape 1: Cr�er l'utilisateur
      const responseUser = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nom: newUser.nom,
          email: newUser.email,
          motDePasse: newUser.motDePasse,
          role: newUser.role,
        }),
      })

      if (!responseUser.ok) {
        const error = await responseUser.json()
        throw new Error(error.message || "Erreur lors de la cr�ation de l'utilisateur")
      }

      const resultUser = await responseUser.json()
      console.log("Utilisateur cr��:", resultUser)

      // �tape 2: R�cup�rer l'_id de l'utilisateur cr��
      const resUserCreated = await fetch(`http://localhost:5000/api/users/utilisateurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!resUserCreated.ok) {
        throw new Error("Erreur lors de la r�cup�ration de l'utilisateur cr��")
      }

      const allUsers = await resUserCreated.json()
      const createdUser = allUsers.find((u: any) => u.email === newUser.email)

      if (!createdUser) {
        throw new Error("Utilisateur cr�� mais introuvable")
      }

      console.log("Utilisateur trouv� avec _id:", createdUser._id)

      // �tape 3: Cr�er le compte associ�
      const compteData = {
        numeroCompte: newUser.numeroCompte,
        solde: 0,
        utilisateurId: createdUser._id,
      }

      console.log("Cr�ation du compte:", compteData)

      const responseCompte = await fetch("http://localhost:5000/api/comptes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(compteData),
      })

      if (!responseCompte.ok) {
        const errorCompte = await responseCompte.json()
        console.error("Erreur cr�ation compte:", errorCompte)
        throw new Error(`Erreur lors de la cr�ation du compte: ${errorCompte.message}`)
      }

      const resultCompte = await responseCompte.json()
      console.log("Compte cr��:", resultCompte)

      // �tape 4: Recharger les donn�es
      window.location.reload()

      // R�initialiser le formulaire
      setNewUser({
        nom: "",
        email: "",
        motDePasse: "",
        numeroCompte: "",
        role: "client",
      })
      setShowAddUserModal(false)

      alert("Utilisateur et compte cr��s avec succ�s !")
    } catch (error: any) {
      console.error("Erreur:", error)
      alert(`Erreur: ${error.message}`)
    } finally {
      setAddingUser(false)
    }
  }

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
    }).format(montant)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatutBadge = (statut: string) => {
    const badges = {
      actif: "badge bg-success",
      suspendu: "badge bg-warning",
      inactif: "badge bg-secondary",
      approuve: "badge bg-success",
      en_attente: "badge bg-warning",
      rejete: "badge bg-danger",
    }
    return badges[statut as keyof typeof badges] || "badge bg-secondary"
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? "badge bg-primary" : "badge bg-info"
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.numeroCompte.includes(searchTerm)
    const matchesRole = filterRole === "all" || user.role === filterRole
    const matchesStatus = filterStatus === "all" || user.statut === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const exportUsersToCSV = () => {
    const headers = ["Nom", "Email", "Role", "Numéro de compte", "Statut", "Solde", "Date de création"]
    const csvData = filteredUsers.map((user) => [
      user.nom,
      user.email,
      user.role,
      user.numeroCompte,
      user.statut,
      user.solde || 0,
      formatDate(user.dateCreation),
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <h4 className="fw-semibold text-dark mb-2">Panneau d'administration</h4>
          <p className="text-muted">R�cup�ration des comptes depuis la collection...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

      <div className="min-vh-100 bg-light">
        {/* Header */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
          <div className="container-fluid">
            <div className="d-flex align-items-center">
              <button className="btn btn-outline-light me-3" onClick={onBack}>
                <ArrowLeft size={20} className="me-1" />
                Retour
              </button>
              <Shield size={32} className="text-white me-2" />
              <span className="navbar-brand mb-0 h1">Panneau d'Administration</span>
            </div>

            <div className="d-flex align-items-center text-white">
              <div className="me-3">
                <small>Connecté en tant que</small>
                <div className="fw-semibold">{utilisateur.nom}</div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-primary"
                style={{ width: "40px", height: "40px" }}
              >
                {utilisateur.nom?.charAt(0)?.toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </nav>

        {/* Navigation Tabs */}
        <div className="container-fluid mt-3">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "users" ? "active" : ""}`}
                onClick={() => setActiveTab("users")}
              >
                <Users size={16} className="me-1" />
                Gestion des utilisateurs
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "transactions" ? "active" : ""}`}
                onClick={() => setActiveTab("transactions")}
              >
                <DollarSign size={16} className="me-1" />
                Transactions
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <Shield size={16} className="me-1" />
                Sécurité
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <Settings size={16} className="me-1" />
                Paramètres
              </button>
            </li>
          </ul>
        </div>

        {/* Content */}
        <div className="container-fluid mt-4">
          {activeTab === "users" && (
            <div>
              {/* KPI Cards */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-subtitle mb-2 text-muted">Total Utilisateurs</h6>
                          <h4 className="card-title mb-0">{users.length}</h4>
                        </div>
                        <div className="bg-primary bg-opacity-10 p-3 rounded">
                          <Users size={24} className="text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-subtitle mb-2 text-muted">Comptes Trouvés</h6>
                          <h4 className="card-title mb-0">
                            {users.filter((u) => u.numeroCompte !== "Non attribué").length}
                          </h4>
                        </div>
                        <div className="bg-success bg-opacity-10 p-3 rounded">
                          <UserCheck size={24} className="text-success" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-subtitle mb-2 text-muted">Solde Total</h6>
                          <h4 className="card-title mb-0">
                            {formatMontant(users.reduce((total, user) => total + (user.solde || 0), 0))}
                          </h4>
                        </div>
                        <div className="bg-warning bg-opacity-10 p-3 rounded">
                          <DollarSign size={24} className="text-warning" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-subtitle mb-2 text-muted">Administrateurs</h6>
                          <h4 className="card-title mb-0">{users.filter((u) => u.role === "admin").length}</h4>
                        </div>
                        <div className="bg-info bg-opacity-10 p-3 rounded">
                          <Shield size={24} className="text-info" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="input-group">
                        <span className="input-group-text">
                          <Search size={16} />
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Rechercher par nom, email ou numéro de compte..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                      >
                        <option value="all">Tous les roles</option>
                        <option value="admin">Administrateurs</option>
                        <option value="client">Clients</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">Actifs</option>
                        <option value="suspendu">Suspendus</option>
                        <option value="inactif">Inactifs</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-primary" onClick={() => setShowAddUserModal(true)}>
                          <Plus size={16} className="me-1" />
                          Nouvel utilisateur
                        </button>
                        <button className="btn btn-outline-success" onClick={exportUsersToCSV}>
                          <Download size={16} className="me-1" />
                          Exporter CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="card">
                <div className="card-header bg-white">
                  <h5 className="card-title mb-0">Liste des utilisateurs ({filteredUsers.length})</h5>
                  <small className="text-muted">Données récupérées directement depuis la collection comptes</small>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="px-4 py-3">Utilisateur</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Numéro de compte</th>
                          <th className="px-4 py-3">Statut</th>
                          <th className="px-4 py-3">Solde</th>
                          <th className="px-4 py-3">Dernière connexion</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3"
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    background: user.role === "admin" ? "#0d6efd" : "#6f42c1",
                                  }}
                                >
                                  {user.nom.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-semibold">{user.nom}</div>
                                  <small className="text-muted">{user.email}</small>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={getRoleBadge(user.role)}>
                                {user.role === "admin" ? "Administrateur" : "Client"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {user.numeroCompte !== "Non attribué" ? (
                                <code className="bg-light px-2 py-1 rounded">{user.numeroCompte}</code>
                              ) : (
                                <span className="text-danger fw-bold">{user.numeroCompte}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={getStatutBadge(user.statut)}>
                                {user.statut.charAt(0).toUpperCase() + user.statut.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="fw-semibold">{formatMontant(user.solde || 0)}</span>
                            </td>
                            <td className="px-4 py-3">
                              {user.derniereConnexion ? (
                                <small className="text-muted">{formatDate(user.derniereConnexion)}</small>
                              ) : (
                                <small className="text-muted">Jamais</small>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="dropdown">
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                <ul className="dropdown-menu">
                                  <li>
                                    <button className="dropdown-item">
                                      <Eye size={14} className="me-2" />
                                      Voir d�tails
                                    </button>
                                  </li>
                                  <li>
                                    <button className="dropdown-item">
                                      <Edit size={14} className="me-2" />
                                      Modifier
                                    </button>
                                  </li>
                                  <li>
                                    <hr className="dropdown-divider" />
                                  </li>
                                  <li>
                                    <button className="dropdown-item">
                                      {user.statut === "actif" ? (
                                        <>
                                          <Lock size={14} className="me-2" />
                                          Suspendre
                                        </>
                                      ) : (
                                        <>
                                          <Unlock size={14} className="me-2" />
                                          Activer
                                        </>
                                      )}
                                    </button>
                                  </li>
                                  <li>
                                    <button className="dropdown-item text-danger">
                                      <Trash2 size={14} className="me-2" />
                                      Supprimer
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div>
              <div className="card">
                <div className="card-header bg-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Transactions récentes</h5>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-primary btn-sm">
                        <Filter size={16} className="me-1" />
                        Filtrer
                      </button>
                      <button className="btn btn-outline-success btn-sm">
                        <Download size={16} className="me-1" />
                        Exporter
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Utilisateur</th>
                          <th className="px-4 py-3">Montant</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Statut</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3">
                              <code className="bg-light px-2 py-1 rounded">{transaction.id}</code>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-capitalize">{transaction.type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="fw-semibold">{transaction.utilisateur}</div>
                                <small className="text-muted">{transaction.compteSource}</small>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="fw-semibold">{formatMontant(transaction.montant)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <small className="text-muted">{formatDate(transaction.date)}</small>
                            </td>
                            <td className="px-4 py-3">
                              <span className={getStatutBadge(transaction.statut)}>
                                {transaction.statut.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="d-flex gap-1">
                                <button className="btn btn-sm btn-outline-primary">
                                  <Eye size={14} />
                                </button>
                                {transaction.statut === "en_attente" && (
                                  <>
                                    <button className="btn btn-sm btn-outline-success">
                                      <UserCheck size={14} />
                                    </button>
                                    <button className="btn btn-sm btn-outline-danger">
                                      <UserX size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="text-center py-5">
              <div className="p-4 bg-warning bg-opacity-10 rounded-circle d-inline-flex mb-4">
                <Shield size={48} className="text-warning" />
              </div>
              <h3 className="fw-bold mb-3">Sécurité et Surveillance</h3>
              <p className="text-muted mb-4 fs-5">
                Surveillez les activités suspectes et gérez les paramètres de sécurité.
              </p>
              <button className="btn btn-warning btn-lg">Configurer la sécurité</button>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="text-center py-5">
              <div className="p-4 bg-info bg-opacity-10 rounded-circle d-inline-flex mb-4">
                <Settings size={48} className="text-info" />
              </div>
              <h3 className="fw-bold mb-3">Paramètres du système</h3>
              <p className="text-muted mb-4 fs-5">Configurez les paramètres globaux de l'application BankGuard.</p>
              <button className="btn btn-info btn-lg">Modifier les paramètres</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout d'utilisateur */}
      {showAddUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ajouter un nouvel utilisateur</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddUserModal(false)}></button>
              </div>
              <form onSubmit={handleAddUser}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <strong>Information :</strong> Le système vérifiera automatiquement si le numéro de compte existe
                    déjà avant la création.
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nom complet *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mot de passe *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newUser.motDePasse}
                      onChange={(e) => setNewUser({ ...newUser, motDePasse: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Numéro de compte * (unique)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newUser.numeroCompte}
                      onChange={(e) => setNewUser({ ...newUser, numeroCompte: e.target.value })}
                      required
                      placeholder="Ex: 9876543210"
                    />
                    <small className="text-muted">Utilisez un numéro unique diff�rent des existants</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="client">Client</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={addingUser}>
                    {addingUser ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Cr�ation en cours...
                      </>
                    ) : (
                      "Cr�er utilisateur + compte"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </>
  )
}

export default AdminPanel