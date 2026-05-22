# Android step counter

GymFuel counts daily steps on **Android only** using the phone’s built-in step sensor. There is no manual step entry and no iOS step sensor integration.

## Overview

| Piece | Role |
|--------|------|
| `@dongminyu/react-native-step-counter` | Native module (hardware step counter / accelerometer fallback) |
| `src/services/stepSensor.ts` | Singleton: permissions, start/stop, live count, backend sync |
| `src/context/StepSensorContext.tsx` | Provider + hook: Redux updates, restore on app launch |
| `src/components/StepCounterPanel.tsx` | Shared UI for Dashboard and Trackers |
| Redux `tracker` slice | `stepSensorActive`, `stepSensorSteps` shared across tabs |
| Backend `POST /api/v1/steps/` | Upserts today’s count with `source: googlefit` |

## User flow

1. Open **Dashboard** or **Trackers** (Android device).
2. Tap **Start** → allow **Activity recognition**.
3. Walk with the phone; step count updates on both screens.
4. Counts **auto-sync** to the server about every 8 seconds when steps change by ≥25.
5. On **Trackers**, tap **Sync now** to push the current count immediately.
6. Tap **Stop** on either screen to end counting (final sync runs on stop).

Starting the sensor on one tab enables the same singleton on the other tab. Stopping on either tab stops it everywhere.

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Dashboard          │     │  Trackers           │
│  StepCounterPanel   │     │  StepCounterPanel   │
│  (card variant)     │     │  (inline variant)   │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └───────────┬───────────────┘
                       ▼
              useStepSensor() hook
                       ▼
              stepSensor (singleton)
                       ▼
     @dongminyu/react-native-step-counter
                       ▼
        Android STEP_COUNTER / accelerometer
                       ▼
              trackersApi.logSteps()
                       ▼
         POST /api/v1/steps/  (upsert by date + source)
```

## Files

- `src/services/stepSensor.ts` — core logic
- `src/context/StepSensorContext.tsx` — provider + Redux bridge
- `src/components/StepCounterPanel.tsx` — Start / Stop / Sync UI + permission modal
- `src/store/reducer/tracker.ts` — `stepSensorActive`, `stepSensorSteps`, `setStepSensorState`
- `android/app/src/main/AndroidManifest.xml` — `ACTIVITY_RECOGNITION`
- `react-native.config.js` — disables iOS autolinking for the step-counter package

## Backend

- Each sync sends **today’s total step count** (since midnight), not a delta.
- Source is always `googlefit` for sensor data (matches backend `StepLog` choices).
- Serializer **upserts** on `(user, date, source)` so repeated syncs update one row.

`GET /api/v1/steps/today/` returns the sum of all sources for the dashboard step card when the sensor is off.

## Permissions

- **Android 10+:** `ACTIVITY_RECOGNITION` — requested at runtime before start.
- **iOS:** Step counter UI is hidden; native module is not linked.

## Persistence

- `AsyncStorage` key `@gymfuel/step_sensor_enabled` — if the user had started the counter, it restarts on next app open (via `restoreIfEnabled()` in `useStepSensor`).

## Build

Native code changes require a rebuild:

```bash
cd gymfuel
npm install
npx react-native run-android
```

Test on a **physical Android device**; emulators often report zero or unreliable steps.

## Removed behavior

- Simulated random step increments on a timer
- Manual numeric “Sync steps” input on Trackers
- iOS / HealthKit step counting
- Duplicate sensor state on the Dashboard screen (now centralized in hook + Redux)

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Steps stay at 0 | Real device, permission granted, sensor started |
| UI out of sync between tabs | Both use Redux; pull to refresh on Trackers |
| Server count behind phone | Tap **Sync now** or wait for auto-sync (≥25 step change) |
| Module not found after install | Clean rebuild: `cd android && ./gradlew clean` then `run-android` |
