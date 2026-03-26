# 🌱 EcoFlight - Module de suivi carbone pour [4Fly](https://4fly.io)

> Module open-source de suivi et compensation carbone pour l'écosystème [4Fly](https://4fly.io), la plateforme de gestion pour aéroclubs et écoles de pilotage.

[![4Fly Ecosystem](https://img.shields.io/badge/ecosystem-4Fly-blue)](https://4fly.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🎯 Description

EcoFlight permet aux clubs aériens utilisant [4Fly](https://4fly.io) de :
- **Calculer automatiquement** l'empreinte carbone des vols
- **Suivre les émissions** par pilote et par club
- **Proposer la compensation** carbone via des partenaires certifiés
- **Générer des rapports** environnementaux

## 🏗️ Architecture

Ce module s'intègre nativement avec la plateforme [4Fly](https://4fly.io) via l'authentification utilisateur standard :

```
Club Admin → Installe EcoFlight → Membres se connectent avec leurs identifiants 4Fly habituels
```

## 🚀 Installation Rapide

### 1. Cloner et installer
```bash
git clone https://github.com/reversing2002/ecoflight-4fly.git
cd ecoflight-4fly
npm install
```

### 2. Configuration
```bash
cp .env.example .env
# Éditer .env avec vos paramètres Supabase et base de données
```

### 3. Démarrer
```bash
npm start
# L'app sera disponible sur http://localhost:3001
```

## 🌐 Déploiement

### Railway (Recommandé)
1. Pusher vers GitHub
2. Connecter à [railway.app](https://railway.app)
3. Déployer depuis le repo GitHub
4. Configurer les variables d'environnement

### Variables d'environnement requises :
- `SUPABASE_URL` : URL de l'instance Supabase 4Fly
- `SUPABASE_ANON_KEY` : Clé publique Supabase
- `DATABASE_URL` : Base de données PostgreSQL pour les données EcoFlight
- `PORT` : Port de l'application (défaut: 3001)

## 📊 Fonctionnalités

### Calculs Carbone
- **Facteurs d'émission** configurables par type de carburant (100LL, UL91, Jet-A1, SP95)
- **Calcul automatique** basé sur la consommation réelle des vols
- **Historique complet** des émissions par pilote

### Interface Utilisateur
- **Dashboard intuitif** avec statistiques visuelles
- **Connexion 4Fly native** (même identifiants que la plateforme [4Fly](https://4fly.io))
- **Rapports exportables** par période

### Compensation Carbone
- **Partenaires certifiés** (Gold Standard, VCS)
- **Calcul des coûts** transparents
- **Suivi des compensations** effectuées

## 🔗 Intégration avec 4Fly

Ce module s'intègre automatiquement avec la plateforme [4Fly](https://4fly.io) :

### Données Accessibles
- ✅ **Vols du club** (date, durée, carburant, destination)
- ✅ **Avions du club** (type, facteurs d'émission)
- ✅ **Membres du club** (pilotes, données publiques)

### Permissions Héritées
L'utilisateur garde ses permissions 4Fly :
- **Admin** : Voir tous les vols du club
- **Instructeur** : Vols des élèves + ses vols
- **Pilote** : Ses propres vols

### Real-time
- **Nouveaux vols** traités automatiquement
- **Notifications** de compensation disponibles
- **Mise à jour** des statistiques en temps réel

## 🛠️ Développement

### Structure
```
├── index.js           # Serveur Express principal
├── package.json       # Dépendances Node.js
├── .env.example       # Template de configuration
└── README.md          # Cette documentation
```

### API Endpoints
- `GET /` - Page d'accueil
- `GET /install` - Installation pour un club
- `POST /complete-install` - Finaliser l'installation
- `GET /login` - Connexion utilisateur
- `POST /auth/login` - Authentification
- `GET /dashboard` - Dashboard principal
- `GET /api/dashboard` - API données dashboard
- `POST /api/offset` - Compensation carbone

## 📈 Métriques

L'application track automatiquement :
- **Nombre d'utilisations** par fonctionnalité
- **Volume de CO₂** calculé et compensé
- **Adoption** par club et par pilote

## 🌍 Écosystème 4Fly

EcoFlight fait partie de l'écosystème d'applications [4Fly](https://4fly.io), la plateforme tout-en-un pour la gestion des aéroclubs et écoles de pilotage :

- **[4Fly](https://4fly.io)** — Plateforme principale de gestion d'aéroclub (réservations, vols, membres, facturation)
- **[NOTAM Manager](https://github.com/reversing2002/notam-manager)** — Gestion des NOTAM avec intégration CDM DSNA
- **EcoFlight** (ce projet) — Suivi et compensation carbone des vols

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

Pour créer votre propre application pour l'écosystème 4Fly, consultez la [documentation développeur](https://4fly.io).

## 📜 Licence

MIT - Voir [LICENSE](LICENSE)

---

**EcoFlight** — Voler responsable avec [4Fly](https://4fly.io) 🌱✈️
