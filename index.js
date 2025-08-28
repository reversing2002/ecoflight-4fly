/**
 * EcoFlight v2.1.0 - Calculateur de compensation carbone pour 4Fly
 * Migré vers SDK v1.1.0 avec Express middleware et app factory
 * Version Sans Base de Données - Lecture seule des données 4Fly
 * Calculs de compensation en temps réel
 */
require("dotenv").config();
const { createFourFlyApp } = require("@4fly/external-apps-sdk");

// Configuration avec la nouvelle factory d'app SDK v1.1.0
const app = createFourFlyApp({
  appId: "ecoflight",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  allowedOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173", 
    "https://app.4fly.io",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  port: (process.env.PORT && Number(process.env.PORT)) || 3001,
  host: process.env.HOST || "0.0.0.0"
});

// Vérification des variables d'environnement
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("❌ Variables d'environnement manquantes:");
  console.error("- SUPABASE_URL:", process.env.SUPABASE_URL ? "✓" : "❌");
  console.error("- SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓" : "❌");
  console.log("⚠️  L'app continuera mais les fonctions d'authentification ne marcheront pas");
}

// Page embarquable personnalisée (surchargée de la version par défaut SDK)
app.get("/embed", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>EcoFlight - Analyse Carbone</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        .card { background: white; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body class="bg-gray-50">
      <div class="bg-green-700 text-white p-3 font-semibold">
        🌱 EcoFlight – Analyse Carbone
      </div>
      <div class="p-4">
        <div id="loading" class="flex items-center justify-center py-8">
          <div class="text-gray-500">Connexion à 4Fly...</div>
        </div>
        <div id="app-container" class="hidden">
          <div id="app-content"></div>
        </div>
      </div>
      <script>
        let authenticated = false;
        
        window.addEventListener('message', async (event) => {
          if (event.data.type === '4fly-auth' && event.data.token) {
            try {
              const response = await fetch('/auth/4fly-login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  token: event.data.token,
                  club_id: event.data.club_id,
                  app_id: 'ecoflight'
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('app-container').classList.remove('hidden');
                authenticated = true;
                await initializeApp(event.data.token, event.data.club_id);
              } else {
                document.getElementById('loading').innerHTML = 
                  '<div class="text-red-500">Erreur authentification: ' + result.error + '</div>';
              }
            } catch (error) {
              document.getElementById('loading').innerHTML = 
                '<div class="text-red-500">Erreur: ' + error.message + '</div>';
            }
          }
        });
        
        window.parent.postMessage({type: '4fly-embed-ready', appId: 'ecoflight'}, '*');
        
        async function initializeApp(token, clubId) {
          try {
            const resp = await fetch('/api/carbon-analysis', {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await resp.json();
            
            if (!data.success) throw new Error(data.error || 'Erreur API');
            
            const total = (data.stats && data.stats.total_co2 != null) ? Number(data.stats.total_co2).toFixed(1) : '-';
            const flights = Array.isArray(data.flights) ? data.flights : [];
            const items = flights.slice(0,5).map(function(f){
              const co2 = (f.co2_kg != null) ? Number(f.co2_kg).toFixed(1) : '-';
              return '<li class="py-1">'+ (f.date||'') +' – '+ (f.aircraft_name||'') +' – '+ co2 +' kg CO₂</li>';
            }).join('');
            
            document.getElementById('app-content').innerHTML = 
              '<div class="card">' +
                '<div class="font-semibold mb-2">Synthèse Carbone</div>' +
                '<div class="text-2xl font-bold text-red-600 mb-4">' + total + ' kg CO₂</div>' +
                '<div class="font-medium mb-2">Derniers vols analysés</div>' +
                '<ul class="text-sm text-gray-700">' + items + '</ul>' +
              '</div>';
          } catch(e) {
            document.getElementById('app-content').innerHTML = 
              '<div class="text-red-500 p-4">Erreur: ' + e.message + '</div>';
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

// Routes personnalisées (surcharge les routes par défaut du SDK si nécessaire)

// Page d'installation personnalisée (SDK fournit une version par défaut)
app.get("/install", (req, res) => {
  const { club_id, return_url } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Installation EcoFlight - Calculateur Carbone</title>
        <meta charset="utf-8">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
        <div class="max-w-2xl mx-auto pt-8 p-4">
            <div class="bg-white rounded-lg p-8 shadow-lg">
                <h1 class="text-3xl font-bold text-green-700 mb-4">🌱 EcoFlight</h1>
                <h2 class="text-xl font-semibold mb-4">Calculateur de Compensation Carbone</h2>
                <p class="text-gray-600 mb-6">Analysez l'impact environnemental de vos vols en temps réel.</p>
                
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 class="font-semibold text-green-800 mb-2">🧮 Calculateur Pur</h3>
                    <ul class="text-sm text-green-700 space-y-1">
                        <li>✅ <strong>Aucune base de données</strong> - Calculs en temps réel</li>
                        <li>✅ <strong>Lecture seule</strong> des données 4Fly</li>
                        <li>✅ <strong>Compensation instantanée</strong> - Pas de stockage</li>
                    </ul>
                </div>
                
                <h3 class="font-semibold mb-3">✨ Fonctionnalités</h3>
                <div class="grid md:grid-cols-2 gap-3 mb-6">
                    <div class="bg-gray-50 p-3 rounded">📊 Calcul automatique des émissions CO₂</div>
                    <div class="bg-gray-50 p-3 rounded">🎯 Recommandations personnalisées</div>
                    <div class="bg-gray-50 p-3 rounded">💰 Estimation des coûts de compensation</div>
                    <div class="bg-gray-50 p-3 rounded">📈 Statistiques par pilote et par club</div>
                </div>
                
                <div class="text-center">
                    <a href="/complete-install?club_id=${encodeURIComponent(
                      club_id || ""
                    )}&return_url=${encodeURIComponent(
                      return_url || "https://app.4fly.io"
                    )}" 
                       class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg inline-block transition-colors">
                        Activer EcoFlight
                    </a>
                </div>
                
                <p class="text-xs text-gray-500 mt-4 text-center">
                    EcoFlight utilise uniquement vos identifiants 4Fly. Aucune donnée stockée.
                </p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// API d'analyse carbone utilisant le nouveau middleware SDK v1.1.0
app.get("/api/carbon-analysis", app.authMiddleware, async (req, res) => {
  try {
    // Utiliser les nouvelles méthodes du SDK v1.1.0
    const flights = await req.sdk.getFlightsAdvanced({ limit: 50 });

    if (!flights.data) {
      return res.json({
        success: true,
        user: req.user,
        stats: { total_flights: 0, total_co2: 0, avg_co2: 0, offset_cost: 0 },
        flights: [],
        recommendations: []
      });
    }

    // Calculer l'analyse carbone pour chaque vol
    const analysisFlights = flights.data.map((flight) => {
      // Déterminer le débit conso (l/h): 33 l/h pour 4 places (100LL), 15 l/h pour ULM/2 places (SP98)
      const aircraftData = flight.aircraft;
      const seats = aircraftData?.capacity || null;
      const type = (aircraftData?.type || "").toUpperCase();
      const isFourSeats = seats && seats >= 4;
      const isUltralightOrTwoSeats = type === "ULM" || (seats && seats <= 2);

      const litersPerHour = isFourSeats ? 33 : isUltralightOrTwoSeats ? 15 : 33;

      // La durée en base est en minutes; convertir en heures
      const hours = (flight.duration || 0) / 60;
      const fuel_estimated = litersPerHour * hours;
      const emission_factor = 2.31; // Facteur CO₂ par défaut

      const co2_kg = CarbonCalculator.calculateCO2(fuel_estimated, emission_factor);
      const offset_cost = CarbonCalculator.calculateOffsetCost(co2_kg);
      const emission_level = CarbonCalculator.getEmissionLevel(co2_kg);

      return {
        id: flight.id,
        date: flight.date,
        duration: flight.duration,
        destination: flight.destination,
        pilot_name: flight.users ? `${flight.users.first_name} ${flight.users.last_name}` : "N/A",
        aircraft_name: aircraftData?.name || "Avion",
        aircraft_registration: aircraftData?.registration || "",
        fuel_estimated,
        co2_kg,
        offset_cost,
        emission_level,
      };
    });

    // Calculer les statistiques globales
    const totalCO2 = analysisFlights.reduce((sum, f) => sum + f.co2_kg, 0);
    const avgCO2 = totalCO2 / Math.max(analysisFlights.length, 1);
    const totalOffsetCost = analysisFlights.reduce((sum, f) => sum + f.offset_cost, 0);

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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Démarrage serveur avec la nouvelle méthode SDK v1.1.0
app.startServer((server) => {
  console.log(`🌱 EcoFlight v2.1.0 - SDK v1.1.0 Migration Complete`);
  console.log(`🧮 Mode: Calculs temps réel - Aucune base de données`);
  console.log(`🔐 Auth: SDK v1.1.0 middleware intégré`);
  console.log(`⚡ Features: Express factory, query builder, helpers intégrés`);
});
