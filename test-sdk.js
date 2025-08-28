/**
 * Test du SDK local
 */

const FourFlySDK = require('../../sdk');

console.log('🔍 Testing SDK locally...\n');

// Créer une instance du SDK
const sdk = new FourFlySDK({
  supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'example-key',
});

console.log('✅ SDK instance created');

// Tester les méthodes disponibles
const methods = [
  'setUserToken',
  'setCurrentClub',
  'getFlights',
  'getFlightsAdvanced',
  'getAircraft',
  'isAuthenticated',
];

console.log('\n📋 Available SDK methods:');
methods.forEach(method => {
  const exists = typeof sdk[method] === 'function';
  console.log(`  ${exists ? '✅' : '❌'} ${method}`);
});

console.log('\n🔍 Testing club_id handling:');
// Simuler la définition d'un club_id
const testClubId = 'test-club-123';
sdk.setCurrentClub(testClubId);
console.log(`  ✅ Set club_id to: ${testClubId}`);
console.log(`  📍 Current club_id: ${sdk.currentClubId}`);

console.log('\n✨ SDK test completed!');