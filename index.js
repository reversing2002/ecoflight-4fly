/**
 * EcoFlight - Calculateur de compensation carbone pour 4Fly
 * Version Sans Base de Données - Lecture seule des données 4Fly
 * Calculs de compensation en temps réel
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const FourFlySimpleSDK = require("./fourfly-simple-sdk");

const app = express();
// Sur Railway/PAAS, PORT est injecté; éviter de forcer un port statique
const RAW_PORT = process.env.PORT;
const PORT = (RAW_PORT && Number(RAW_PORT)) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// Configuration SDK
const SDK_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
};

// Vérification des variables d'environnement
if (!SDK_CONFIG.supabaseUrl || !SDK_CONFIG.supabaseAnonKey) {
  console.error("❌ Variables d'environnement manquantes:");
  console.error("- SUPABASE_URL:", SDK_CONFIG.supabaseUrl ? "✓" : "❌");
  console.error(
    "- SUPABASE_ANON_KEY:",
    SDK_CONFIG.supabaseAnonKey ? "✓" : "❌"
  );
  console.log(
    "⚠️  L'app continuera mais les fonctions d'authentification ne marcheront pas"
  );
}

// Configuration CORS simplifiée pour Railway
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://app.4fly.io",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Headers CORS manuels en plus pour Railway
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    origin &&
    (origin === "https://app.4fly.io" ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin === process.env.FRONTEND_URL)
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Accept"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route racine simple pour health-check
app.get("/", (_req, res) => {
  res.status(200).send("EcoFlight OK");
});

// Endpoint pour recevoir le token 4Fly après connexion
app.post("/auth/4fly-login", async (req, res) => {
  try {
    const { token, club_id, reason } = req.body || {};
    if (!token)
      return res.status(400).json({ success: false, error: "token requis" });

    // Vérifier que le SDK peut être initialisé
    if (!SDK_CONFIG.supabaseUrl || !SDK_CONFIG.supabaseAnonKey) {
      return res.status(503).json({
        success: false,
        error: "Service temporairement indisponible - configuration manquante",
      });
    }

    // Log d'arrivée de token (masque la majorité du JWT)
    try {
      const preview =
        typeof token === "string" ? `${token.slice(0, 12)}…` : "(invalid)";
      console.log(
        `🔐 [EcoFlight] Token reçu | reason=${reason || "login"} club=${
          club_id || "N/A"
        } token=${preview}`
      );
    } catch (_) {}

    const sdk = new FourFlySimpleSDK(SDK_CONFIG);
    const result = await sdk.setUserToken(token);
    if (!result.success) {
      return res.status(401).json({ success: false, error: "JWT invalide" });
    }

    // Optionnel: vérifier que l'app est installée pour ce club
    if (club_id) {
      const installed = await sdk.isAppInstalled("ecoflight");
      if (!installed) {
        return res
          .status(403)
          .json({ success: false, error: "App non installée pour ce club" });
      }
    }

    // Log succès avec identité utilisateur masquée/compacte
    try {
      const email = result?.user?.email || result?.user?.id || "unknown-user";
      console.log(
        `✅ [EcoFlight] Auth OK | user=${email} club=${
          club_id || "N/A"
        } reason=${reason || "login"}`
      );
    } catch (_) {}

    // Répondre OK; l'app peut créer des cookies de session si nécessaire
    return res.json({ success: true, reason: reason || "login" });
  } catch (e) {
    console.error("/auth/4fly-login error:", e);
    return res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// Page embarquable (iframe) qui récupère le token via postMessage
app.get("/embed", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>EcoFlight - Embed</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .header { padding: 12px 16px; background: #0e7a0d; color: white; font-weight: 600; }
        .content { padding: 16px; }
        .error { color: #b91c1c; }
        .muted { color: #6b7280; }
        .card { background: white; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <div class="header">🌱 EcoFlight – Analyse Carbone (Embed)</div>
      <div class="content">
        <div id="status" class="muted">En attente d'authentification…</div>
        <div id="root" style="margin-top: 12px;"></div>
      </div>
      <script>
        let bearer = null;
        let clubId = null;
        function masked(tok){return (tok||'').slice(0,12)+'…'}
        window.addEventListener('message', async (event) => {
          try {
            const data = event.data || {};
            if (data.type !== '4fly-auth' || !data.token) return;
            bearer = data.token;
            clubId = data.club_id || null;
            document.getElementById('status').textContent = 'Authentifié (token '+masked(bearer)+')';
            await load();
          } catch (e) {
            document.getElementById('status').innerHTML = '<span class="error">Erreur auth: '+e.message+'</span>';
          }
        });
        async function load(){
          try {
            const resp = await fetch('/api/carbon-analysis', {
              headers: { 'Authorization': 'Bearer '+bearer }
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error||'Erreur API');
            const total = (data.stats && data.stats.total_co2 != null) ? Number(data.stats.total_co2).toFixed(1) : '-';
            const flights = Array.isArray(data.flights) ? data.flights : [];
            const items = flights.slice(0,5).map(function(f){
              try {
                var v = (f.co2_kg != null) ? Number(f.co2_kg).toFixed(1) : '-';
                return '<li>'+ (f.date||'') +' – '+ (f.aircraft_name||'') +' – '+ v +' kg</li>';
              } catch (e) {
                return '<li>'+ (f.date||'') +' – '+ (f.aircraft_name||'') +'</li>';
              }
            }).join('');
            document.getElementById('root').innerHTML =
              '<div class="card">'
              + '<div style="font-weight:600; margin-bottom:8px;">Synthèse</div>'
              + '<div>CO₂ total estimé: <strong>' + total + ' kg</strong></div>'
              + '<div style="margin-top:12px; font-weight:600;">Derniers vols analysés</div>'
              + '<ul style="margin:8px 0 0 16px; padding:0;">' + items + '</ul>'
              + '</div>';
          } catch(e){
            document.getElementById('root').innerHTML = '<div class="error">'+e.message+'</div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Calculateur de compensation carbone
class CarbonCalculator {
  static calculateCO2(fuelUsed, emissionFactor = 2.31) {
    return fuelUsed * emissionFactor;
  }

  static calculateOffsetCost(co2Kg, pricePerTonne = 25) {
    return (co2Kg / 1000) * pricePerTonne;
  }

  static getEmissionLevel(co2Kg) {
    if (co2Kg > 50) return { level: "high", color: "#f44336", label: "Élevé" };
    if (co2Kg > 20)
      return { level: "medium", color: "#ff9800", label: "Moyen" };
    return { level: "low", color: "#4CAF50", label: "Faible" };
  }

  static generateRecommendations(co2Kg) {
    const recommendations = [];

    if (co2Kg > 30) {
      recommendations.push(
        "Considérez des vols plus courts pour réduire la consommation"
      );
      recommendations.push(
        "Optimisez votre plan de vol pour économiser du carburant"
      );
    }

    if (co2Kg > 10) {
      recommendations.push(
        "Compensez vos émissions avec des crédits carbone certifiés"
      );
    }

    recommendations.push("Partagez vos vols pour répartir les émissions");

    return recommendations;
  }
}

// Route d'installation simplifiée
app.get("/install", (req, res) => {
  const { club_id, return_url } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Installation EcoFlight - Calculateur Carbone</title>
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
            <h1>🌱 EcoFlight - Calculateur Carbone</h1>
            <p>Analysez l'impact environnemental de vos vols en temps réel.</p>
            
            <div class="simple">
                <h3>🧮 Calculateur Pur :</h3>
                <p>✅ <strong>Aucune base de données</strong> - Calculs en temps réel</p>
                <p>✅ <strong>Lecture seule</strong> des données 4Fly</p>
                <p>✅ <strong>Compensation instantanée</strong> - Pas de stockage</p>
            </div>
            
            <h2>✨ Fonctionnalités :</h2>
            <div class="feature">📊 Calcul automatique des émissions CO₂</div>
            <div class="feature">🎯 Recommandations personnalisées</div>
            <div class="feature">💰 Estimation des coûts de compensation</div>
            <div class="feature">📈 Statistiques par pilote et par club</div>
            
            <p>
                <a class="button" href="/complete-install?club_id=${encodeURIComponent(
                  club_id || ""
                )}&return_url=${encodeURIComponent(
    return_url || "https://app.4fly.io"
  )}">Activer EcoFlight</a>
            </p>
            
            <p><small>EcoFlight utilise uniquement vos identifiants 4Fly. Aucune donnée stockée.</small></p>
        </div>
    </body>
    </html>
  `);
});

app.post("/complete-install", async (req, res) => {
  const { return_url } = req.body || {};
  const target = return_url || "https://app.4fly.io";
  return res.redirect(302, target);
});

// GET version to avoid CSP form-action restrictions
app.get("/complete-install", (req, res) => {
  const { return_url } = req.query || {};
  const target = return_url || "https://app.4fly.io";
  return res.redirect(302, target);
});

// Page de connexion
app.get("/login", (req, res) => {
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
                <input type="email" id="email" placeholder="Email 4Fly" required>
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Mot de passe" required>
            </div>
            <button type="submit">Analyser mes Vols</button>
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
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password, club_id } = req.body;

    const sdk = new FourFlySimpleSDK(SDK_CONFIG);
    const loginResult = await sdk.signIn(email, password);

    if (!loginResult.success) {
      return res.json({ success: false, error: loginResult.error });
    }

    res.json({
      success: true,
      token: loginResult.token,
      user: loginResult.user,
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
    res.json({ success: false, error: error.message });
  }
});

// Dashboard EcoFlight - Calculateur pur
app.get("/dashboard", (req, res) => {
  const { token, club_id } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>EcoFlight - Calculateur Carbone</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
            .header { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
            .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .stat-value { font-size: 2em; font-weight: bold; }
            .co2-high { color: #f44336; }
            .co2-medium { color: #ff9800; }
            .co2-low { color: #4CAF50; }
            .flights-list { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .flight-item { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .flight-info h4 { margin: 0 0 5px 0; }
            .flight-info small { color: #666; }
            .carbon-info { text-align: right; }
            .carbon-value { font-size: 1.2em; font-weight: bold; }
            .offset-cost { font-size: 0.9em; color: #666; margin-top: 5px; }
            .recommendations { background: #e8f5e8; padding: 15px; border-radius: 10px; margin-top: 20px; }
            .recommendation { margin: 5px 0; padding: 5px 10px; background: white; border-radius: 5px; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌱 EcoFlight - Calculateur Carbone</h1>
            <p>Impact environnemental de vos vols en temps réel</p>
            <div id="user-info"></div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value co2-medium" id="total-flights">-</div>
                <div>Vols analysés</div>
            </div>
            <div class="stat-card">
                <div class="stat-value co2-high" id="total-co2">- kg</div>
                <div>CO₂ total émis</div>
            </div>
            <div class="stat-card">
                <div class="stat-value co2-low" id="avg-co2">- kg</div>
                <div>CO₂ moyen par vol</div>
            </div>
            <div class="stat-card">
                <div class="stat-value co2-medium" id="offset-cost">- €</div>
                <div>Coût compensation totale</div>
            </div>
        </div>
        
        <div class="flights-list">
            <h2>📊 Analyse Carbone de vos Vols</h2>
            <div id="flights-container">
                <p>Analyse en cours...</p>
            </div>
        </div>
        
        <div class="recommendations" id="recommendations" style="display: none;">
            <h3>💡 Recommandations Personnalisées</h3>
            <div id="recommendations-list"></div>
        </div>

        <script>
            const token = '${token || ""}';
            const clubId = '${club_id || ""}';
            
            async function loadDashboard() {
                try {
                    const response = await fetch('/api/carbon-analysis', {
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
                        \`Connecté : <strong>\${data.user.email}</strong> | Club : <strong>\${data.stats.total_flights} vols analysés</strong>\`;
                    
                    // Mettre à jour les statistiques
                    document.getElementById('total-flights').textContent = data.stats.total_flights;
                    document.getElementById('total-co2').textContent = data.stats.total_co2.toFixed(1) + ' kg';
                    document.getElementById('avg-co2').textContent = data.stats.avg_co2.toFixed(1) + ' kg';
                    document.getElementById('offset-cost').textContent = data.stats.offset_cost.toFixed(2) + ' €';
                    
                    // Afficher les vols avec analyse carbone
                    const container = document.getElementById('flights-container');
                    if (data.flights.length === 0) {
                        container.innerHTML = '<p>Aucun vol trouvé pour l\\'analyse.</p>';
                        return;
                    }
                    
                    container.innerHTML = data.flights.map(flight => {
                        const level = flight.emission_level;
                        return \`
                            <div class="flight-item">
                                <div class="flight-info">
                                    <h4>\${flight.date} - \${flight.aircraft_name}</h4>
                                    <small>Pilote: \${flight.pilot_name} | \${flight.destination || 'Local'} (\${flight.duration}min, \${flight.fuel_used.toFixed(1)}L)</small>
                                </div>
                                <div class="carbon-info">
                                    <div class="carbon-value" style="color: \${level.color}">
                                        \${flight.co2_kg.toFixed(1)} kg CO₂
                                    </div>
                                    <div class="offset-cost">
                                        Compensation: \${flight.offset_cost.toFixed(2)}€
                                    </div>
                                    <small style="color: \${level.color}">Impact \${level.label}</small>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    
                    // Afficher les recommandations
                    if (data.recommendations.length > 0) {
                        document.getElementById('recommendations').style.display = 'block';
                        document.getElementById('recommendations-list').innerHTML = 
                            data.recommendations.map(rec => \`<div class="recommendation">• \${rec}</div>\`).join('');
                    }
                    
                } catch (error) {
                    console.error('Erreur chargement dashboard:', error);
                    document.getElementById('flights-container').innerHTML = 
                        '<p style="color: red;">Erreur: ' + error.message + '</p>';
                }
            }
            
            // Charger au démarrage
            if (!token) {
                document.getElementById('flights-container').innerHTML = '<p style="color: red;">Token manquant. Veuillez vous reconnecter.</p>';
            } else {
                loadDashboard();
            }
        </script>
    </body>
    </html>
  `);
});

// Middleware d'authentification
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token d'authentification requis" });
    }

    // Vérifier que le SDK peut être initialisé
    if (!SDK_CONFIG.supabaseUrl || !SDK_CONFIG.supabaseAnonKey) {
      return res.status(503).json({
        error: "Service temporairement indisponible - configuration manquante",
      });
    }

    const sdk = new FourFlySimpleSDK(SDK_CONFIG);
    const result = await sdk.setUserToken(token);

    if (!result.success) {
      return res.status(401).json({ error: "Token invalide" });
    }

    req.sdk = sdk;
    req.user = result.user;
    next();
  } catch (error) {
    console.error("Erreur authentification:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// API d'analyse carbone (calculateur pur)
app.get("/api/carbon-analysis", authenticateUser, async (req, res) => {
  try {
    // Récupérer les vols avec données carbone calculées en temps réel
    const flights = await req.sdk.getFlightCarbonData({ limit: 50 });

    // Calculer l'analyse carbone pour chaque vol
    const analysisFlights = flights.map((flight) => {
      // Déterminer le débit conso (l/h): 33 l/h pour 4 places (100LL), 15 l/h pour ULM/2 places (SP98)
      const seats = flight.aircraft_capacity || null;
      const type = (flight.aircraft_type || "").toUpperCase();
      const isFourSeats = seats && seats >= 4;
      const isUltralightOrTwoSeats = type === "ULM" || (seats && seats <= 2);

      const litersPerHour = isFourSeats ? 33 : isUltralightOrTwoSeats ? 15 : 33;

      // La durée en base est en minutes; convertir en heures
      const hours = (flight.duration || 0) / 60;
      const fuel_estimated = litersPerHour * hours;

      const co2_kg = CarbonCalculator.calculateCO2(
        fuel_estimated,
        flight.emission_factor
      );
      const offset_cost = CarbonCalculator.calculateOffsetCost(co2_kg);
      const emission_level = CarbonCalculator.getEmissionLevel(co2_kg);

      return {
        ...flight,
        fuel_estimated,
        co2_kg,
        offset_cost,
        emission_level,
      };
    });

    // Calculer les statistiques globales
    const totalCO2 = analysisFlights.reduce((sum, f) => sum + f.co2_kg, 0);
    const avgCO2 = totalCO2 / Math.max(analysisFlights.length, 1);
    const totalOffsetCost = analysisFlights.reduce(
      (sum, f) => sum + f.offset_cost,
      0
    );

    // Générer des recommandations basées sur les données
    const recommendations = CarbonCalculator.generateRecommendations(avgCO2);

    res.json({
      success: true,
      user: req.user,
      stats: {
        total_flights: analysisFlights.length,
        total_co2: totalCO2,
        avg_co2: avgCO2,
        offset_cost: totalOffsetCost,
      },
      flights: analysisFlights.slice(0, 20), // Limiter l'affichage
      recommendations,
    });
  } catch (error) {
    console.error("Erreur analyse carbone:", error);
    res.status(500).json({ error: error.message });
  }
});

// Démarrage serveur
const server = app.listen(PORT, HOST, () => {
  console.log(`🌱 EcoFlight Calculateur Carbone démarré sur ${HOST}:${PORT}`);
  console.log(`🧮 Mode: Calculs temps réel - Aucune base de données`);
  console.log(`🔐 Authentification: 4Fly standard`);
});

// Arrêt gracieux (SIGTERM/SIGINT) pour éviter un kill brutal en déploiement
function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
  // Force exit si ça traîne
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
