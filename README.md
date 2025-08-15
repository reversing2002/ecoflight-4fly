# 🌱 EcoFlight - Module 4Fly

Module de suivi et compensation carbone pour l'écosystème d'applications 4Fly.

## 🎯 Description

EcoFlight permet aux clubs aériens utilisant 4Fly de :
- **Calculer automatiquement** l'empreinte carbone des vols
- **Suivre les émissions** par pilote et par club
- **Proposer la compensation** carbone via des partenaires certifiés
- **Générer des rapports** environnementaux

## 🏗️ Architecture

Cette application utilise l'architecture **4Fly Simplifiée** avec authentification utilisateur standard :

```
Club Admin → Installe EcoFlight → Membres se connectent avec leurs identifiants 4Fly habituels
```

Pas de tokens complexes, pas de configuration compliquée !

## 🚀 Installation Rapide

### 1. Cloner et installer
```bash
git clone <this-repo>
cd ecoflight-4fly-simple
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
5. L'URL sera générée automatiquement

### Variables d'environnement requises :
- `SUPABASE_URL` : URL de l'instance 4Fly Supabase
- `SUPABASE_ANON_KEY` : Clé publique Supabase
- `DATABASE_URL` : Base de données PostgreSQL pour les données EcoFlight
- `PORT` : Port de l'application (défaut: 3001)

## 📊 Fonctionnalités

### Calculs Carbone
- **Facteurs d'émission** configurables par type de carburant
- **Calcul automatique** basé sur la consommation réelle des vols
- **Historique complet** des émissions par pilote

### Interface Utilisateur
- **Dashboard intuitif** avec statistiques visuelles
- **Connexion 4Fly native** (même identifiants)
- **Rapports exportables** par période

### Compensation Carbone
- **Partenaires certifiés** (Gold Standard, VCS)
- **Calcul des coûts** transparents
- **Suivi des compensations** effectuées

## 🔗 Intégration 4Fly

Cette application s'intègre automatiquement avec 4Fly via :

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

### Base de Données
EcoFlight utilise sa propre base PostgreSQL pour :
- `installations` - Clubs ayant installé l'app
- `carbon_offsets` - Compensations effectuées

Les données des vols viennent directement de 4Fly via l'API.

## 📈 Métriques

L'application track automatiquement :
- **Nombre d'utilisations** par fonctionnalité
- **Volume de CO₂** calculé et compensé
- **Adoption** par club et par pilote

## 🤝 Contribution

Cette application est un **exemple** pour l'écosystème 4Fly. 

Pour créer votre propre application :
1. Utiliser le [SDK 4Fly Simplifié](../sdk/fourfly-simple-sdk.js)
2. Suivre la [documentation développeur](../docs/API_SIMPLE_DEVELOPERS.md)
3. S'inspirer de cette implémentation

## 📞 Support

- **Documentation** : Voir docs/API_SIMPLE_DEVELOPERS.md
- **SDK** : sdk/fourfly-simple-sdk.js
- **Issues** : Utiliser les issues GitHub

## 📜 Licence

MIT - Voir LICENSE

---

**EcoFlight** - Voler responsable avec 4Fly 🌱✈️