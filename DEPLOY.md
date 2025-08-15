# 🚀 Guide de Déploiement EcoFlight

## 📋 Prérequis

- Compte GitHub
- Compte Railway (ou autre plateforme)
- Accès aux paramètres 4Fly Supabase

## 🌐 Déploiement sur Railway

### 1. Pousser vers GitHub

```bash
# Créer un repo GitHub "ecoflight-4fly"
git remote add origin https://github.com/VOTRE-USERNAME/ecoflight-4fly.git
git branch -M main
git push -u origin main
```

### 2. Déployer sur Railway

1. **Se connecter** : [railway.app](https://railway.app)
2. **New Project** > **Deploy from GitHub repo**
3. **Sélectionner** votre repo `ecoflight-4fly`
4. **Attendre** le déploiement automatique

### 3. Configuration des Variables

Dans Railway > Variables :

```bash
SUPABASE_URL=https://VOTRE-PROJECT.supabase.co
SUPABASE_ANON_KEY=VOTRE-ANON-KEY
DATABASE_URL=postgresql://...  # Railway génère automatiquement
NODE_ENV=production
```

### 4. Obtenir l'URL de Production

Railway vous donnera une URL comme :
`https://ecoflight-production.up.railway.app`

## 🔄 Mettre à Jour 4Fly

### Script SQL à exécuter dans Supabase :

```sql
-- Remplacer par votre vraie URL Railway
UPDATE external_apps_catalog 
SET 
  app_url = 'https://ecoflight-production.up.railway.app',
  install_url = 'https://ecoflight-production.up.railway.app/install'
WHERE app_id = 'ecoflight';
```

## ✅ Test de l'Installation

1. **Admin 4Fly** : Settings > Applications
2. **Cliquer** "Installer" sur EcoFlight
3. **Redirection** vers votre app Railway
4. **Se connecter** avec identifiants 4Fly
5. **Vérifier** les données dans le dashboard

## 🔧 Autres Plateformes

### Render
- Même process, mais sur [render.com](https://render.com)
- Variables d'environnement dans l'interface Render

### Vercel (Serverless)
- Plus complexe car serverless
- Adapter l'app pour les fonctions Vercel

### Fly.io
- `fly launch` dans le répertoire
- Configuration via `fly.toml`

## 📊 Monitoring

Surveiller les logs Railway pour :
- Erreurs de connexion Supabase
- Problèmes d'authentification
- Performance des requêtes

## 🆘 Dépannage

### App ne démarre pas
- Vérifier `PORT` dans variables d'environnement
- Vérifier `NODE_ENV=production`

### Erreurs Supabase
- Vérifier `SUPABASE_URL` et `SUPABASE_ANON_KEY`
- Tester la connexion en local d'abord

### Base de données EcoFlight
- Railway créé automatiquement une DB PostgreSQL
- Vérifier `DATABASE_URL` dans les variables