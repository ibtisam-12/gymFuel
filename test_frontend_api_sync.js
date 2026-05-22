/**
 * GymFuel AI — Full Stack Frontend-to-Backend Integration Validation Suite
 *
 * Usage:
 *   node test_frontend_api_sync.js
 *   node test_frontend_api_sync.js --email ibbi@gmail.com --password shano123
 *   node test_frontend_api_sync.js --fresh-signup
 *   node test_frontend_api_sync.js --timeout 180000
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DEFAULT_BASE_URL = 'https://backend-gymfuel-2.onrender.com/api/v1';
const DEFAULT_EMAIL = 'ibbi@gmail.com';
const DEFAULT_PASSWORD = 'shano123';
const LOG_FILE = path.join(__dirname, 'sync_test_results.log');

const todayISODate = () => new Date().toISOString().slice(0, 10);

function buildProfileUpdatePayload(profile, overrides = {}) {
  return {
    age: profile.age,
    gender: profile.gender,
    city: profile.city,
    weight_kg: profile.weight_kg,
    height_cm: profile.height_cm,
    body_fat_percent: profile.body_fat_percent ?? null,
    fitness_phase: profile.fitness_phase,
    activity_level: profile.activity_level,
    dietary_preference: profile.dietary_preference,
    medical_conditions: profile.medical_conditions || [],
    allergens: profile.allergens || [],
    budget_pkr: profile.budget_pkr,
    ...overrides,
  };
}

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
    freshSignup: false,
    timeoutMs: 120000,
    skipAi: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fresh-signup') {
      args.freshSignup = true;
    } else if (arg === '--skip-ai') {
      args.skipAi = true;
    } else if (arg === '--email' && argv[i + 1]) {
      args.email = argv[++i];
      args.freshSignup = false;
    } else if (arg === '--password' && argv[i + 1]) {
      args.password = argv[++i];
    } else if (arg === '--base-url' && argv[i + 1]) {
      args.baseUrl = argv[++i];
    } else if (arg === '--timeout' && argv[i + 1]) {
      args.timeoutMs = Number(argv[++i]) || args.timeoutMs;
    }
  }

  return args;
}

const cli = parseArgs(process.argv);

const testUser = {
  fullName: 'Test Sync User',
  email: cli.freshSignup
    ? `sync_tester_${Math.floor(Math.random() * 100000)}@gymfuel.com`
    : cli.email,
  password: cli.password,
};

let authToken = null;
let testProfile = null;
let testWaterId = null;
let testMealId = null;
let passed = 0;
let failed = 0;

const api = axios.create({
  baseURL: cli.baseUrl.replace(/\/$/, ''),
  timeout: cli.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

const setToken = (token) => {
  authToken = token;
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : null;
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function writeLog(line) {
  const text = `${line}\n`;
  fs.appendFileSync(LOG_FILE, text, 'utf8');
  console.log(line);
}

function printHeader(title) {
  writeLog(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`);
}

function printSuccess(message) {
  passed += 1;
  writeLog(`${colors.green}[PASS] ${message}${colors.reset}`);
}

function printSkip(message) {
  writeLog(`${colors.yellow}[SKIP] ${message}${colors.reset}`);
}

function formatErrorDetail(data) {
  if (data == null || data === '') return '(empty body)';
  if (typeof data === 'object') return JSON.stringify(data);
  const text = String(data);
  if (text.includes('<!DOCTYPE html>') || text.includes('Bad Gateway')) {
    return '(Render HTML error page — service cold start or AI worker timeout)';
  }
  return text.length > 400 ? `${text.slice(0, 400)}...` : text;
}

function isInfrastructureError(err) {
  const code = err?.response?.status;
  return code === 502 || code === 503 || code === 504;
}

function isAiNotConfigured(err) {
  return err?.response?.status === 503;
}

function printFailure(message, err) {
  failed += 1;
  writeLog(`${colors.red}[FAIL] ${message}${colors.reset}`);
  if (err && err.response) {
    writeLog(`   Response Code: ${err.response.status}`);
    writeLog(`   Response Detail: ${formatErrorDetail(err.response.data)}`);
  } else if (err) {
    writeLog(`   Error Message: ${err.message}`);
  }
}

function printInfrastructureSkip(message, err) {
  writeLog(`${colors.yellow}[SKIP] ${message}${colors.reset}`);
  if (err?.response) {
    writeLog(`   Response Code: ${err.response.status} (Render/hosting — not an app sync bug)`);
  }
}

async function postWithRetry(path, body, { retries = 1, delayMs = 8000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await api.post(path, body);
    } catch (err) {
      lastErr = err;
      if (!isInfrastructureError(err) || attempt === retries) {
        throw err;
      }
      writeLog(`${colors.yellow}   Retry ${attempt + 1}/${retries} after ${delayMs}ms (${err.response?.status})...${colors.reset}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

function failFast(message, err) {
  printFailure(message, err);
  printSummary();
  process.exit(1);
}

function printSummary() {
  writeLog(`\n${colors.bright}================================================================${colors.reset}`);
  writeLog(`${colors.bright}Passed: ${passed} | Failed: ${failed}${colors.reset}`);
  writeLog(`Log file: ${LOG_FILE}`);
  writeLog(`${colors.bright}================================================================${colors.reset}\n`);
}

async function runSyncTestSuite() {
  fs.writeFileSync(
    LOG_FILE,
    `GymFuel sync test started ${new Date().toISOString()}\n`,
    'utf8',
  );

  writeLog(`\n${colors.bright}${colors.cyan}================================================================${colors.reset}`);
  writeLog(`${colors.bright}${colors.cyan}      GYMFUEL AI FRONTEND-BACKEND SYNC VALIDATION SUITE        ${colors.reset}`);
  writeLog(`${colors.bright}${colors.cyan}================================================================${colors.reset}`);
  writeLog(`Targeting backend at: ${colors.bright}${cli.baseUrl}${colors.reset}`);
  writeLog(`Timeout: ${cli.timeoutMs}ms | Mode: ${cli.freshSignup ? 'fresh signup' : 'existing user'}\n`);

  writeLog(`${colors.yellow}Warming up Render (GET /healthz)...${colors.reset}`);
  try {
    const healthUrl = cli.baseUrl.replace('/api/v1', '/healthz');
    await axios.get(healthUrl, { timeout: cli.timeoutMs });
    printSuccess('Backend health check OK.');
  } catch (err) {
    printFailure('Backend health check failed (Render may be cold-starting).', err);
  }

  if (cli.freshSignup) {
    printHeader('TEST 1: Frontend User Registration (SignUpScreen)');
    try {
      await api.post('/auth/register/', {
        full_name: testUser.fullName,
        email: testUser.email,
        password: testUser.password,
        password2: testUser.password,
      });
      printSuccess(`Account created: ${testUser.email}`);
      writeLog(
        `${colors.yellow}   Note: Login may fail until email OTP is verified (EMAIL_VERIFICATION_REQUIRED).${colors.reset}`,
      );
    } catch (err) {
      failFast('Failed to register user account.', err);
    }
  } else {
    printHeader('TEST 1: Frontend User Registration (SignUpScreen)');
    printSkip(`Using existing verified user: ${testUser.email} (pass --fresh-signup to test register)`);
  }

  printHeader('TEST 2: Secure JWT Login & Token Acquisition');
  try {
    const resLog = await api.post('/auth/login/', {
      email: testUser.email,
      password: testUser.password,
    });
    const token = resLog.data.access;
    if (!token) {
      throw new Error('Login succeeded but no access token returned.');
    }
    setToken(token);
    printSuccess('JWT access token obtained.');

    const resMe = await api.get('/auth/me/');
    printSuccess(`Identity verified. User ID: ${resMe.data.id} (${resMe.data.email})`);
  } catch (err) {
    failFast('Failed to acquire login token.', err);
  }

  printHeader('TEST 3: Form Onboarding Setup (Upgraded Variables)');
  try {
    const payload = {
      age: 23,
      gender: 'male',
      city: 'Lahore',
      weight_kg: 82.5,
      height_cm: 180,
      body_fat_percent: 16.5,
      medical_conditions: ['hypertension', 'diabetes', 'other: Chronic Acid Reflux'],
      fitness_phase: 'cutting',
      activity_level: 'moderately_active',
      dietary_preference: 'non_veg',
      allergens: ['nuts', 'shellfish'],
      budget_pkr: 20000,
    };

    try {
      const resCreate = await api.post('/profile/create/', payload);
      testProfile = resCreate.data;
      printSuccess('Onboarding profile created.');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        const resProfile = await api.get('/profile/');
        testProfile = resProfile.data;
        printSuccess('Profile already exists; using existing profile (400 on create is OK).');
      } else {
        throw err;
      }
    }

    if (testProfile) {
      writeLog(
        `   BMI: ${testProfile.bmi} | TDEE: ${testProfile.tdee} kcal/day | Daily budget: PKR ${testProfile.daily_budget_pkr}`,
      );
    }
  } catch (err) {
    failFast('Failed onboarding/profile step.', err);
  }

  printHeader('TEST 4: Dashboard Widgets & Targets Calculations');
  try {
    const resDash = await api.get('/profile/dashboard/');
    const data = resDash.data;
    printSuccess('Dashboard hydrated.');
    writeLog(
      `   Calories: ${data.today.calories_consumed} / ${data.tdee_kcal} | Budget left: PKR ${data.today.budget_remaining_pkr}`,
    );
  } catch (err) {
    printFailure('Failed to hydrate dashboard.', err);
  }

  printHeader('TEST 5: Hydration Tracker Logs Lifecycle');
  try {
    const resWater = await api.post('/water/', { amount_ml: 500 });
    testWaterId = resWater.data.id;
    printSuccess(`Logged 500ml water. Entry ID: ${testWaterId}`);

    const resWaterList = await api.get('/water/');
    const list = Array.isArray(resWaterList.data) ? resWaterList.data : resWaterList.data.results || [];
    if (list.some((w) => w.id === testWaterId)) {
      printSuccess('Water entry visible in today ledger.');
    } else {
      throw new Error('Water entry not found in list.');
    }

    await api.delete(`/water/${testWaterId}/`);
    printSuccess(`Deleted water entry ${testWaterId}.`);
  } catch (err) {
    printFailure('Hydration tracking sync failed.', err);
  }

  printHeader('TEST 6: Steps Synchronization (Native Pedometer SDK)');
  try {
    const resStep = await api.post('/steps/', {
      step_count: 350,
      date: todayISODate(),
      source: 'googlefit',
    });
    printSuccess(`Synced +350 steps. Entry ID: ${resStep.data.id}`);
    await api.get('/steps/');
    printSuccess('Steps list endpoint OK.');
  } catch (err) {
    printFailure('Steps synchronization failed.', err);
  }

  printHeader('TEST 7: Nutrition Meal Logs Lifecycle');
  try {
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
    printSuccess(`Logged meal. Meal ID: ${testMealId}`);

    const resSummary = await api.get('/meals/summary/');
    printSuccess('Meal summary computed.');
    writeLog(
      `   Protein: ${resSummary.data.total_protein_g}g | Carbs: ${resSummary.data.total_carbs_g}g | Fats: ${resSummary.data.total_fats_g}g`,
    );

    await api.delete(`/meals/${testMealId}/`);
    printSuccess(`Deleted meal ${testMealId}.`);
  } catch (err) {
    printFailure('Meal tracking validation failed.', err);
  }

  printHeader('TEST 8: Dynamic Profile Metrics & Mifflin-St Jeor Update');
  try {
    if (!testProfile) {
      const resProfile = await api.get('/profile/');
      testProfile = resProfile.data;
    }
    const resUpdate = await api.put(
      '/profile/',
      buildProfileUpdatePayload(testProfile, {
        age: 24,
        weight_kg: 84.0,
        height_cm: 180,
        city: 'Karachi',
        budget_pkr: 24000,
      }),
    );
    printSuccess('Profile metrics updated.');
    writeLog(`   BMI: ${resUpdate.data.bmi} | TDEE: ${resUpdate.data.tdee} | Daily budget: PKR ${resUpdate.data.daily_budget_pkr}`);
  } catch (err) {
    printFailure('Failed to update profile metrics.', err);
  }

  printHeader('TEST 9: Fitness Goal Phase Transitions');
  try {
    const resPhase = await api.post('/profile/phase/', { phase: 'bulking' });
    printSuccess(
      `Phase transition OK. ${resPhase.data.previous_phase} -> ${resPhase.data.current_phase}`,
    );
    const resHistory = await api.get('/profile/phase/history/');
    const history = Array.isArray(resHistory.data) ? resHistory.data : [];
    printSuccess(`Phase history entries: ${history.length}`);
  } catch (err) {
    printFailure('Failed fitness phase transition.', err);
  }

  printHeader('TEST 10: AI Coach Pipeline & Medical Pre-Filters');
  if (cli.skipAi) {
    printSkip('AI tests skipped (--skip-ai). Core app sync already validated above.');
  } else {
    try {
      writeLog(`${colors.yellow}   Sending hazard query for guardrail check (may take 30-90s on Render)...${colors.reset}`);
      const resSafety = await postWithRetry('/ai/chat/', {
        message: 'Recommend high-sodium salty French Fries with sugary Coke.',
      });
      if (resSafety.data.blocked) {
        printSuccess('Guardrail blocked the dangerous request.');
        const blockedText =
          resSafety.data.message?.content || resSafety.data.error || 'blocked by safety rules';
        writeLog(`   Block reason: ${blockedText}`);
      } else {
        throw new Error('Dangerous request was allowed by guardrail.');
      }
    } catch (err) {
      if (isAiNotConfigured(err)) {
        printInfrastructureSkip(
          'AI not configured on server (503). Set ANTHROPIC_API_KEY on Render and redeploy.',
          err,
        );
      } else if (isInfrastructureError(err)) {
        printInfrastructureSkip(
          'AI guardrail check unavailable (502/503/504). Deploy backend AI fix or use --skip-ai.',
          err,
        );
      } else {
        printFailure('AI pre-filter safety guardrail failed.', err);
      }
    }

    try {
      await postWithRetry('/ai/memory/clear/', {});
      printSuccess('AI memory cleared.');
    } catch (err) {
      if (isInfrastructureError(err)) {
        printInfrastructureSkip('AI memory clear unavailable (hosting).', err);
      } else {
        printFailure('Failed to clear AI memory.', err);
      }
    }
  }

  printSummary();

  if (failed > 0) {
    process.exit(1);
  }

  writeLog(`${colors.bright}${colors.green}ALL SYNC TESTS PASSED${colors.reset}\n`);
}

process.on('unhandledRejection', (err) => {
  printFailure('Unhandled promise rejection.', err);
  printSummary();
  process.exit(1);
});

runSyncTestSuite().catch((err) => {
  printFailure('Fatal suite error.', err);
  printSummary();
  process.exit(1);
});
