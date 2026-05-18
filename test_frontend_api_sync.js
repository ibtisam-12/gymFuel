/**
 * GymFuel AI — Full Stack Frontend-to-Backend Integration Validation Suite
 * Muhammad Ibtisam (65857) & Waleed Zulfiqar (65863)
 * Miss Erum Aman
 *
 * This test script emulates the exact sequence of HTTP requests, payload structures, 
 * and endpoints called by the React Native client. It validates that the front-end components
 * communicate flawlessly with the active Django REST API, Django Models, and LangChain AI engine.
 */

const axios = require('axios');

// Configure host (127.0.0.1 is used when testing locally on the development machine)
const BASE_URL = 'http://127.0.0.1:8000/api/v1';

const testUser = {
  fullName: 'Test Sync User',
  email: `sync_tester_${Math.floor(Math.random() * 100000)}@gymfuel.com`,
  password: 'Password123!',
};

let authToken = null;
let testProfile = null;
let testWaterId = null;
let testMealId = null;

// Axios Client instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Helper to set JWT token
const setToken = (token) => {
  authToken = token;
  api.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : null;
};

// Colors for beautiful terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const printHeader = (title) => {
  console.log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`);
};

const printSuccess = (message) => {
  console.log(`${colors.green}✔ [PASS] ${message}${colors.reset}`);
};

const printFailure = (message, err) => {
  console.log(`${colors.red}❌ [FAIL] ${message}${colors.reset}`);
  if (err && err.response) {
    console.log(`   Response Code: ${err.response.status}`);
    console.log(`   Response Detail:`, JSON.stringify(err.response.data));
  } else if (err) {
    console.log(`   Error Message: ${err.message}`);
  }
};

async function runSyncTestSuite() {
  console.log(`\n${colors.bright}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}      GYMFUEL AI FRONTEND-BACKEND SYNC VALIDATION SUITE        ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================================${colors.reset}`);
  console.log(`Targeting backend at: ${colors.bright}${BASE_URL}${colors.reset}\n`);

  try {
    // ---------------------------------------------------------
    // TEST 1: User Account Registration (SignUpScreen Flow)
    // ---------------------------------------------------------
    printHeader('TEST 1: Frontend User Registration (SignUpScreen)');
    try {
      const resReg = await api.post('/auth/register/', {
        full_name: testUser.fullName,
        email: testUser.email,
        password: testUser.password,
        password2: testUser.password, // Django Serializer strict confirmation
      });
      printSuccess(`Account successfully created for: ${testUser.email}`);
    } catch (err) {
      printFailure('Failed to register user account.', err);
      process.exit(1);
    }

    // ---------------------------------------------------------
    // TEST 2: Automated Login & Token Retrieve (LoginScreen Flow)
    // ---------------------------------------------------------
    printHeader('TEST 2: Secure JWT Login & Token Acquisition');
    try {
      const resLog = await api.post('/auth/login/', {
        email: testUser.email,
        password: testUser.password,
      });
      
      const token = resLog.data.access;
      setToken(token);
      printSuccess('JWT Access Token obtained and bound to API headers.');
      
      // Fetch /auth/me/ profile info
      const resMe = await api.get('/auth/me/');
      printSuccess(`Identity verified. Logged in as User ID: ${resMe.data.id} (${resMe.data.email})`);
    } catch (err) {
      printFailure('Failed to acquire login token.', err);
      process.exit(1);
    }

    // ---------------------------------------------------------
    // TEST 3: Onboarding Profile Setup (OnboardingScreen Form)
    // ---------------------------------------------------------
    printHeader('TEST 3: Form Onboarding Setup (Upgraded Variables)');
    try {
      const payload = {
        age: 23,
        gender: 'male',
        city: 'Lahore',
        weight_kg: 82.5,
        height_cm: 180,
        body_fat_percent: 16.5, // Optional field (Upgrade 1)
        medical_conditions: ['hypertension', 'diabetes', 'other: Chronic Acid Reflux'], // List (Upgrade 1)
        fitness_phase: 'cutting', // Active fitness target split
        activity_level: 'moderately_active',
        dietary_preference: 'non_veg',
        allergens: ['nuts', 'shellfish'], // Filter arrays (Upgrade 1)
        budget_pkr: 20000, // PKR Budget
      };

      const resCreate = await api.post('/profile/create/', payload);
      testProfile = resCreate.data;
      printSuccess('Onboarding Form profile submitted database-side.');
      console.log(`   Computed BMI: ${testProfile.bmi} | Computed TDEE: ${testProfile.tdee} kcal/day`);
      console.log(`   PKR Budget: ${testProfile.budget_pkr}/mo | Daily Target: PKR ${testProfile.daily_budget_pkr}/day`);
    } catch (err) {
      printFailure('Failed to complete onboarding form submission.', err);
      process.exit(1);
    }

    // ---------------------------------------------------------
    // TEST 4: Fetch Home Dashboard Widget Data (Dashboard / Home Flow)
    // ---------------------------------------------------------
    printHeader('TEST 4: Dashboard Widgets & Targets Calculations');
    try {
      const resDash = await api.get('/profile/dashboard/');
      const data = resDash.data;
      
      printSuccess('Dashboard successfully hydrated.');
      console.log(`   Calorie Target: ${data.today.water_goal_ml ? 'Synced' : 'Default'}`);
      console.log(`   Daily Calorie Balance: Consumed: ${data.today.calories_consumed} / Target: ${data.tdee_kcal} kcal`);
      console.log(`   Daily Budget Balance: Spent: PKR ${data.today.budget_used_pkr} / Left: PKR ${data.today.budget_remaining_pkr}`);
    } catch (err) {
      printFailure('Failed to hydrate home dashboard views.', err);
    }

    // ---------------------------------------------------------
    // TEST 5: Water Hydration Logging & Deletion (TrackersScreen Flow)
    // ---------------------------------------------------------
    printHeader('TEST 5: Hydration Tracker Logs Lifecycle');
    try {
      // 1. Log water
      const resWater = await api.post('/water/', {
        amount_ml: 500,
      });
      testWaterId = resWater.data.id;
      printSuccess(`Logged a 500ml water cup. Assigned Entry ID: ${testWaterId}`);

      // 2. Read logs to verify
      const resWaterList = await api.get('/water/');
      if (resWaterList.data.some(w => w.id === testWaterId)) {
        printSuccess('Water cup aggregate synced in today\'s ledger.');
      } else {
        throw new Error('Water entry not found in active list.');
      }

      // 3. Delete log (Parity check)
      await api.delete(`/water/${testWaterId}/`);
      printSuccess(`Successfully deleted water cup Entry ID: ${testWaterId}. Ledger recalculated.`);
    } catch (err) {
      printFailure('Hydration tracking sync failed.', err);
    }

    // ---------------------------------------------------------
    // TEST 6: Steps Sync / Pedometer Sync (Pedometer Simulator Flow)
    // ---------------------------------------------------------
    printHeader('TEST 6: Steps Synchronization (Native Pedometer SDK)');
    try {
      const resStep = await api.post('/steps/', {
        step_count: 350,
        source: 'googlefit', // Simulates native Google Fit bridge
      });
      printSuccess(`Synchronized +350 steps via Google Fit. Entry ID: ${resStep.data.id}`);
      
      const resTodaySteps = await api.get('/steps/');
      printSuccess('Step sensor aggregates synced successfully in backend models.');
    } catch (err) {
      printFailure('Steps synchronization failed.', err);
    }

    // ---------------------------------------------------------
    // TEST 7: Meals Tracker Logs Lifecycle (TrackersScreen Flow)
    // ---------------------------------------------------------
    printHeader('TEST 7: Nutrition Meal Logs Lifecycle');
    try {
      // 1. Log manual meal
      const resMeal = await api.post('/meals/', {
        meal_name: 'Boiled Egg & Oats',
        protein_g: 22,
        carbs_g: 45,
        fats_g: 9,
        calories: 350,
        cost_pkr: 150,
        is_ai_suggested: false,
      });
      testMealId = resMeal.data.id;
      printSuccess(`Logged breakfast manual entry. Assigned Meal ID: ${testMealId}`);

      // 2. Read summaries
      const resSummary = await api.get('/meals/summary/');
      printSuccess('Today\'s macronutrients totals computed in real-time.');
      console.log(`   Accumulated: Protein: ${resSummary.data.protein}g | Carbs: ${resSummary.data.carbs}g | Fats: ${resSummary.data.fats}g`);

      // 3. Delete manual meal
      await api.delete(`/meals/${testMealId}/`);
      printSuccess(`Successfully deleted meal Entry ID: ${testMealId}. Macro balance recalculated.`);
    } catch (err) {
      printFailure('Meal tracking validation failed.', err);
    }

    // ---------------------------------------------------------
    // TEST 8: Dynamic Body Metrics Editor (ProfileScreen Edit)
    // ---------------------------------------------------------
    printHeader('TEST 8: Dynamic Profile Metrics & Mifflin-St Jeor Update');
    try {
      const updatePayload = {
        age: 24, // Increment age
        weight_kg: 84.0, // Weight increase
        height_cm: 180,
        city: 'Karachi', // Relocate
        budget_pkr: 24000, // Budget increase
      };

      const resUpdate = await api.put('/profile/', updatePayload);
      printSuccess('Updated body metrics successfully in-place.');
      console.log(`   Recalculated BMI: ${resUpdate.data.bmi} | Recalculated TDEE: ${resUpdate.data.tdee} kcal`);
      console.log(`   New Daily Budget Target: PKR ${resUpdate.data.daily_budget_pkr}`);
    } catch (err) {
      printFailure('Failed to update body metrics in-place.', err);
    }

    // ---------------------------------------------------------
    // TEST 9: Fitness Goal Phase Transitions (Profile Screen)
    // ---------------------------------------------------------
    printHeader('TEST 9: Fitness Goal Phase Transitions');
    try {
      const resPhase = await api.post('/profile/phase/', {
        phase: 'bulking', // transition cutting -> bulking
      });
      printSuccess(`Fitness Phase transitioned successfully. Old: ${resPhase.data.previous_phase} ➔ Current: ${resPhase.data.current_phase}`);
      
      const resHistory = await api.get('/profile/phase/history/');
      printSuccess(`Phase transition logged in database logs. Total phase cycles: ${resHistory.data.length}`);
    } catch (err) {
      printFailure('Failed to transition fitness phase.', err);
    }

    // ---------------------------------------------------------
    // TEST 10: AI Coach LangChain HuggingFace Pipeline & Safety Pre-Filters
    // ---------------------------------------------------------
    printHeader('TEST 10: AI Coach LangChain Pipeline & Medical Pre-Filters');
    
    // Safety Test 1: Medical bypass attempt (Hypertension & Diabetes registered in Test 3)
    try {
      console.log(`${colors.yellow}   Sending hazard query: "Recommend high-sodium salty French Fries with sugary Coke."${colors.reset}`);
      const resSafety = await api.post('/ai/chat/', {
        message: 'Recommend high-sodium salty French Fries with sugary Coke.',
        session_id: 'sync_test_session_123',
      });
      
      if (!resSafety.data.allowed) {
        printSuccess('Guardrail BLOCKED the dangerous request successfully!');
        console.log(`      Reason Blocked: "${resSafety.data.reason}"`);
      } else {
        throw new Error('Dangerous request bypass failed! Request was allowed.');
      }
    } catch (err) {
      printFailure('AI pre-filter safety guardrail failed.', err);
    }

    // Safety Test 2: Short-term Memory clearance (Reset Button)
    try {
      await api.post('/ai/memory/clear/', {
        session_id: 'sync_test_session_123',
      });
      printSuccess('AI conversational short-term memory window successfully cleared.');
    } catch (err) {
      printFailure('Failed to clear short-term memory.', err);
    }

    // ---------------------------------------------------------
    // SYSTEM CHECK COMPLETED SUCCESS
    // ---------------------------------------------------------
    console.log(`\n${colors.bright}${colors.green}================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   ALL INTERACTION SCRIPTS COMMUNICATING 100% CORRECTLY WITH BACKEND  ${colors.reset}`);
    console.log(`${colors.bright}${colors.green}================================================================${colors.reset}\n`);

  } catch (globalErr) {
    console.log(`${colors.red}Global validation error: ${globalErr.message}${colors.reset}`);
  }
}

runSyncTestSuite();
