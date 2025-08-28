/**
 * Script de test local pour EcoFlight
 * Teste l'authentification et la récupération des vols
 */

require('dotenv').config();

async function testEcoFlight() {
  try {
    // Simuler un JWT token 4Fly (remplacer par un vrai token pour test réel)
    const token = process.env.TEST_JWT_TOKEN || 'YOUR_TEST_TOKEN';
    const clubId = process.env.TEST_CLUB_ID || 'YOUR_CLUB_ID';
    
    console.log('🔍 Testing EcoFlight locally...');
    console.log('📍 Server: http://localhost:3001');
    console.log('🎫 Using club_id:', clubId);
    
    // Test de l'endpoint de santé
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const health = await healthResponse.json();
    console.log('✅ Health check:', health);
    
    // Test de l'authentification 4Fly
    console.log('\n2️⃣ Testing 4fly-login...');
    const authResponse = await fetch('http://localhost:3001/auth/4fly-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        club_id: clubId,
      }),
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      console.error('❌ Auth failed:', error);
      return;
    }
    
    const authResult = await authResponse.json();
    console.log('✅ Auth successful:', authResult.success, '- User:', authResult.user?.email);
    
    // Test de l'API carbon-analysis
    console.log('\n3️⃣ Testing carbon-analysis API...');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-club-id': clubId,
    };
    
    const analysisResponse = await fetch('http://localhost:3001/api/carbon-analysis', {
      headers: headers,
    });
    
    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      console.error('❌ Analysis failed:', error);
      return;
    }
    
    const analysis = await analysisResponse.json();
    console.log('✅ Analysis successful!');
    console.log('📊 Stats:', {
      total_flights: analysis.stats?.total_flights,
      total_co2: analysis.stats?.total_co2,
      flights_count: analysis.flights?.length || 0,
    });
    
    if (analysis.flights && analysis.flights.length > 0) {
      console.log('\n📋 First 3 flights:');
      analysis.flights.slice(0, 3).forEach((flight, i) => {
        console.log(`  ${i + 1}. Date: ${flight.date}, Aircraft: ${flight.aircraft_name}, CO2: ${flight.co2_kg?.toFixed(1)} kg`);
      });
    } else {
      console.log('\n⚠️  No flights found for this user/club');
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  testEcoFlight().then(() => process.exit(0));
}

module.exports = { testEcoFlight };