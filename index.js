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
const PORT = process.env.PORT || 3001;

// Configuration SDK
const SDK_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
};

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://app.4fly.io",
      process.env.FRONTEND_URL,
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
            
            <form action="/complete-install" method="POST">
                <input type="hidden" name="club_id" value="${club_id}">
                <input type="hidden" name="return_url" value="${return_url}">
                <p>
                    <button type="submit" class="button">Activer EcoFlight</button>
                </p>
            </form>
            
            <p><small>EcoFlight utilise uniquement vos identifiants 4Fly. Aucune donnée stockée.</small></p>
        </div>
    </body>
    </html>
  `);
});

app.post("/complete-install", async (req, res) => {
  const { club_id, return_url } = req.body;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>EcoFlight Activé</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .success { color: #4CAF50; font-size: 24px; margin: 20px 0; }
            .button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
        </style>
    </head>
    <body>
        <h1>🎉 EcoFlight Activé !</h1>
        <div class="success">✅ Calculateur carbone prêt à l'emploi</div>
        <p>EcoFlight va analyser vos vols 4Fly et calculer leur impact carbone en temps réel.</p>
        <a href="/login?club_id=${club_id}" class="button">Commencer l'Analyse</a>
        <a href="${
          return_url || "https://app.4fly.io"
        }" class="button">Retour à 4Fly</a>
    </body>
    </html>
  `);
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
                                    <small>Pilote: \${flight.pilot_name} | \${flight.destination || 'Local'} (\${flight.duration}h, \${flight.fuel_used.toFixed(1)}L)</small>
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
      const co2_kg = CarbonCalculator.calculateCO2(
        flight.fuel_used,
        flight.emission_factor
      );
      const offset_cost = CarbonCalculator.calculateOffsetCost(co2_kg);
      const emission_level = CarbonCalculator.getEmissionLevel(co2_kg);

      return {
        ...flight,
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
app.listen(PORT, () => {
  console.log(`🌱 EcoFlight Calculateur Carbone démarré sur le port ${PORT}`);
  console.log(`🧮 Mode: Calculs temps réel - Aucune base de données`);
  console.log(`🔐 Authentification: 4Fly standard`);
});
