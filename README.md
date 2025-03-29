# 🏦 BankGuard – Logiciel Bancaire Sécurisé

**Projet réalisé dans le cadre du cours DevSecOps (DIC2-SSI), ESP/UCAD – Année 2023–2024**

## 🎯 Objectif
Créer une application bancaire sécurisée avec gestion des comptes, des opérations, des rôles utilisateurs et un haut niveau de sécurité.

## 🛠️ Stack technologique
- **Frontend :** React.js + Bootstrap
- **Backend :** Node.js + Express
- **Base de données :** MongoDB
- **Sécurité :** bcrypt, AES, journalisation, contrôle d'accès

## 📁 Structure du projet

## ✅ Fonctionnalités principales

- Authentification sécurisée (bcrypt + session/token)
- Tableau de bord utilisateur (solde, historique)
- Gestion d’opérations bancaires (dépôt, retrait, virement)
- Gestion des rôles (client, agent, administrateur)
- Audit de toutes les actions sensibles
- Chiffrement AES des données critiques (solde, transactions)

## 🔐 Éléments de sécurité intégrés

- **Authentification :** Hachage des mots de passe avec `bcrypt`
- **Autorisation :** Contrôle d’accès basé sur les rôles
- **Audit :** Log de toutes les actions sensibles (qui, quoi, quand)
- **Confidentialité :** Chiffrement AES des soldes et historiques
- **Intégrité :** Signature numérique des transactions (option bonus)
- **Communication sécurisée :** HTTPS prévu au déploiement

## 📌 Réalisé par

- **Vieux Mahindo**  
Élève ingénieur en sécurité des systèmes d’information, ESP/UCAD  
`vieux.mahindo@esp.sn`

