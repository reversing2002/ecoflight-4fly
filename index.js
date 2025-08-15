/**
 * EcoFlight - Module de compensation carbone pour 4Fly
 * Version Simplifiée - Utilise l'authentification utilisateur 4Fly standard
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const FourFlySimpleSDK = require('../sdk/fourfly-simple-sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration base de données PostgreSQL dédiée (pour nos données carbone)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ecoflight',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://app.4fly.io', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration SDK
const SDK_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
};

// Route d'installation simplifiée
app.get('/install', (req, res) => {
  const { club_id, return_url } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Installation EcoFlight - Version Simplifiée</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
            .success { color: #4CAF50; }
            .button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; }
            .feature { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
            .simple { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌱 EcoFlight - Version Simplifiée</h1>
            <p>Suivi et compensation carbone pour votre club 4Fly.</p>
            
            <div class="simple">
                <h3>🔓 Architecture Simplifiée :</h3>
                <p>✅ <strong>Connexion avec vos identifiants 4Fly habituels</strong></p>
                <p>✅ <strong>Permissions automatiques selon votre rôle dans le club</strong></p>
                <p>✅ <strong>Aucun token ou configuration complexe</strong></p>
            </div>
            
            <h2>✨ Fonctionnalités EcoFlight:</h2>
            <div class="feature">📊 Calculs carbone automatiques basés sur vos vols</div>
            <div class="feature">🌍 Suivi environnemental en temps réel</div>
            <div class="feature">💳 Système de compensation carbone intégré</div>
            <div class="feature">📈 Rapports par pilote et par club</div>
            
            <form action="/complete-install" method="POST">
                <input type="hidden" name="club_id" value="${club_id}">
                <input type="hidden" name="return_url" value="${return_url}">
                <p>
                    <button type="submit" class="button">Installer EcoFlight</button>
                </p>
            </form>
            
            <p><small>L'installation se contente d'enregistrer l'application pour votre club. Vous vous connecterez ensuite avec vos identifiants 4Fly habituels.</small></p>
        </div>
    </body>
    </html>
  `);
});

app.post('/complete-install', async (req, res) => {
  try {
    const { club_id, return_url } = req.body;
    
    // Enregistrer l'installation dans notre base locale
    await pool.query(`
      INSERT INTO installations (club_id, installed_at, is_active)
      VALUES ($1, NOW(), true)
      ON CONFLICT (club_id) DO UPDATE SET
        installed_at = NOW(),
        is_active = true
    `, [club_id]);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>EcoFlight Installé</title>
          <meta charset="utf-8">
          <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
              .success { color: #4CAF50; font-size: 24px; margin: 20px 0; }
              .button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
          </style>
      </head>
      <body>
          <h1>🎉 Installation EcoFlight Terminée!</h1>
          <div class="success">✅ Application installée avec succès</div>
          <p>EcoFlight est maintenant disponible pour votre club. Connectez-vous avec vos identifiants 4Fly pour commencer.</p>
          <a href="/login?club_id=${club_id}" class="button">Se Connecter</a>
          <a href="${return_url || 'https://app.4fly.io'}" class="button">Retour à 4Fly</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Erreur installation:', error);
    res.status(500).send(`Erreur lors de l'installation: ${error.message}`);
  }
});

// Page de connexion
app.get('/login', (req, res) => {
  const { club_id, redirect } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Connexion EcoFlight</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
            .form-group { margin: 15px 0; }
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            button { width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .error { color: red; margin: 10px 0; }
        </style>
    </head>
    <body>
        <h1>🌱 Connexion EcoFlight</h1>
        <p>Utilisez vos identifiants 4Fly habituels</p>
        
        <form id="loginForm">
            <div class="form-group">
                <input type="email" id="email" placeholder="Email" required>
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Mot de passe" required>
            </div>
            <button type="submit">Se Connecter</button>
        </form>
        
        <div id="error" class="error" style="display: none;"></div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, club_id: '${club_id}' })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Rediriger vers le dashboard avec le token
                        window.location.href = '/dashboard?token=' + result.token + '&club_id=${club_id}';
                    } else {
                        document.getElementById('error').textContent = result.error;
                        document.getElementById('error').style.display = 'block';
                    }
                } catch (error) {
                    document.getElementById('error').textContent = 'Erreur de connexion';
                    document.getElementById('error').style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Route d'authentification
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password, club_id } = req.body;
    
    // Créer une instance SDK temporaire pour la connexion
    const sdk = new FourFlySimpleSDK(SDK_CONFIG);
    const loginResult = await sdk.signIn(email, password);
    
    if (!loginResult.success) {
      return res.json({ success: false, error: loginResult.error });
    }
    
    // Vérifier que l'app est installée pour ce club
    const isInstalled = await sdk.isAppInstalled('ecoflight');
    if (!isInstalled) {
      return res.json({ success: false, error: 'EcoFlight n\'est pas installé pour ce club' });
    }
    
    // Logger l'utilisation
    await sdk.logAppUsage('ecoflight', 'login');
    
    // Retourner le token de session
    const session = await sdk.supabase.auth.getSession();
    
    res.json({
      success: true,
      token: session.data.session?.access_token,
      user: loginResult.user
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.json({ success: false, error: error.message });
  }
});

// Dashboard EcoFlight
app.get('/dashboard', (req, res) => {
  const { token, club_id } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>EcoFlight Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
            .header { background: #4CAF50; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
            .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .stat-value { font-size: 2em; font-weight: bold; color: #4CAF50; }
            .flights-list { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .flight-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .co2-high { color: #f44336; font-weight: bold; }
            .co2-medium { color: #ff9800; font-weight: bold; }
            .co2-low { color: #4CAF50; font-weight: bold; }
            .offset-btn { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; }
            .simple-info { background: #e8f5e8; padding: 10px; border-radius: 5px; margin-top: 20px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌱 EcoFlight Dashboard</h1>
            <p>Suivi environnemental - <strong>Version Simplifiée avec Auth Utilisateur</strong></p>
            <div id="user-info"></div>
        </div>
        
        <div class="simple-info">
            <strong>🔓 Architecture Simplifiée:</strong> Vous êtes connecté avec vos identifiants 4Fly. 
            L'application hérite automatiquement de vos permissions dans le club. Plus simple et plus sécurisé!
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value" id="total-flights">-</div>
                <div>Vols analysés</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="total-co2">- kg</div>
                <div>CO₂ total émis</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="offset-co2">- kg</div>
                <div>CO₂ compensé</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="offset-cost">- €</div>
                <div>Coût compensations</div>
            </div>
        </div>
        
        <div class="flights-list">
            <h2>Vos Vols Récents</h2>
            <div id="flights-container">
                <p>Chargement...</p>
            </div>
        </div>

        <script>
            const token = '${token}';
            const clubId = '${club_id}';
            
            async function loadDashboard() {
                try {
                    const response = await fetch('/api/dashboard', {
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (!data.success) {
                        throw new Error(data.error || 'Erreur API');
                    }
                    
                    // Afficher les infos utilisateur
                    document.getElementById('user-info').innerHTML = 
                        \`Connecté en tant que <strong>\${data.user.email}</strong>\`;
                    
                    // Mettre à jour les statistiques
                    document.getElementById('total-flights').textContent = data.stats.total_flights;
                    document.getElementById('total-co2').textContent = data.stats.total_co2.toFixed(1) + ' kg';
                    document.getElementById('offset-co2').textContent = data.stats.offset_co2.toFixed(1) + ' kg';
                    document.getElementById('offset-cost').textContent = data.stats.offset_cost.toFixed(2) + ' €';
                    
                    // Afficher les vols
                    const container = document.getElementById('flights-container');
                    if (data.flights.length === 0) {
                        container.innerHTML = '<p>Aucun vol trouvé.</p>';
                        return;
                    }
                    
                    container.innerHTML = data.flights.map(flight => {
                        const co2Class = flight.co2_kg > 50 ? 'co2-high' : flight.co2_kg > 20 ? 'co2-medium' : 'co2-low';
                        return \`
                            <div class="flight-item">
                                <div>
                                    <strong>\${flight.date}</strong> - \${flight.aircraft_name}<br>
                                    <small>Pilote: \${flight.pilot_name} | \${flight.destination || 'Local'} (\${flight.duration}h)</small>
                                </div>
                                <div>
                                    <span class="\${co2Class}">\${flight.co2_kg.toFixed(1)} kg CO₂</span>
                                    \${!flight.is_offset ? \`
                                        <button class="offset-btn" onclick="offsetFlight('\${flight.id}', \${flight.co2_kg})">
                                            Compenser (\${flight.offset_cost.toFixed(2)}€)
                                        </button>
                                    \` : '<span style="color: #4CAF50;">✅ Compensé</span>'}
                                </div>
                            </div>
                        \`;
                    }).join('');
                    
                } catch (error) {
                    console.error('Erreur chargement dashboard:', error);
                    document.getElementById('flights-container').innerHTML = 
                        '<p style="color: red;">Erreur: ' + error.message + '</p>';
                }
            }
            
            async function offsetFlight(flightId, co2Kg) {
                if (!confirm(\`Compenser \${co2Kg.toFixed(1)} kg de CO₂ ?\`)) return;
                
                try {
                    const response = await fetch('/api/offset', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            flight_id: flightId,
                            co2_kg: co2Kg
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('✅ Compensation effectuée avec succès!');
                        loadDashboard();
                    } else {
                        alert('❌ Erreur: ' + result.error);
                    }
                } catch (error) {
                    console.error('Erreur compensation:', error);
                    alert('❌ Erreur de connexion');
                }
            }
            
            // Charger au démarrage
            loadDashboard();
        </script>
    </body>
    </html>
  `);
});

// Middleware d'authentification
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }
    
    // Créer une instance SDK avec le token
    const sdk = new FourFlySimpleSDK(SDK_CONFIG);
    const result = await sdk.setUserToken(token);
    
    if (!result.success) {
      return res.status(401).json({ error: 'Token invalide' });
    }
    
    req.sdk = sdk;
    req.user = result.user;
    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// API Dashboard avec authentification utilisateur
app.get('/api/dashboard', authenticateUser, async (req, res) => {
  try {
    // Logger l'utilisation
    await req.sdk.logAppUsage('ecoflight', 'dashboard_view');
    
    // Récupérer les vols avec données carbone
    const flights = await req.sdk.getFlightCarbonData({ limit: 20 });
    
    // Calculer les compensations depuis notre base
    const flightsWithOffset = await Promise.all(flights.map(async (flight) => {
      const offsetResult = await pool.query(
        'SELECT * FROM carbon_offsets WHERE flight_id = $1',
        [flight.id]
      );
      
      return {
        ...flight,
        is_offset: offsetResult.rows.length > 0
      };
    }));
    
    // Calculer les statistiques
    const totalCO2 = flightsWithOffset.reduce((sum, f) => sum + f.co2_kg, 0);
    const offsetCO2 = flightsWithOffset.filter(f => f.is_offset).reduce((sum, f) => sum + f.co2_kg, 0);
    const offsetCost = flightsWithOffset.filter(f => f.is_offset).reduce((sum, f) => sum + f.offset_cost, 0);
    
    res.json({
      success: true,
      user: req.user,
      stats: {
        total_flights: flights.length,
        total_co2: totalCO2,
        offset_co2: offsetCO2,
        offset_cost: offsetCost
      },
      flights: flightsWithOffset
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Compensation
app.post('/api/offset', authenticateUser, async (req, res) => {
  try {
    const { flight_id, co2_kg } = req.body;
    const { clubId } = req.sdk.getCurrentUser();
    
    const offset_cost = co2_kg * 0.025; // 25€ par tonne
    
    // Enregistrer la compensation
    await pool.query(`
      INSERT INTO carbon_offsets (club_id, flight_id, co2_kg, offset_cost, offset_provider, created_at)
      VALUES ($1, $2, $3, $4, 'GoldStandard', NOW())
      ON CONFLICT (flight_id) DO NOTHING
    `, [clubId, flight_id, co2_kg, offset_cost]);
    
    // Logger l'action
    await req.sdk.logAppUsage('ecoflight', 'carbon_offset');
    
    res.json({
      success: true,
      message: 'Compensation enregistrée',
      co2_kg,
      offset_cost
    });
  } catch (error) {
    console.error('Erreur compensation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialisation base de données simplifiée
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS installations (
        id SERIAL PRIMARY KEY,
        club_id VARCHAR(255) UNIQUE NOT NULL,
        installed_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
      
      CREATE TABLE IF NOT EXISTS carbon_offsets (
        id SERIAL PRIMARY KEY,
        club_id VARCHAR(255) NOT NULL,
        flight_id VARCHAR(255) UNIQUE NOT NULL,
        co2_kg DECIMAL(10,2) NOT NULL,
        offset_cost DECIMAL(10,2) NOT NULL,
        offset_provider VARCHAR(100) DEFAULT 'GoldStandard',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Base de données EcoFlight initialisée (version simplifiée)');
  } catch (error) {
    console.error('❌ Erreur initialisation BD:', error);
  }
}

// Démarrage serveur
app.listen(PORT, async () => {
  console.log(`🌱 EcoFlight Version Simplifiée démarré sur le port ${PORT}`);
  console.log(`🔓 Mode: Authentification utilisateur 4Fly standard`);
  await initDatabase();
});