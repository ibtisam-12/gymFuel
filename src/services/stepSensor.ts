import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, type EventSubscription } from 'react-native';
import { trackersApi } from './backend';

const SENSOR_ENABLED_KEY = '@gymfuel/step_sensor_enabled';
const SYNC_DEBOUNCE_MS = 5000;
const MIN_SYNC_STEP_DELTA = 10;

type StepUpdateListener = (steps: number) => void;
type ServerTotalListener = (totalSteps: number) => void;

type StepCountData = {
  steps: number;
};

type StepCounterNative = {
  isStepCountingSupported: () => Promise<{ supported: boolean; granted: boolean }>;
  startStepCounterUpdate: (
    start: Date,
    callback: (data: StepCountData) => void
  ) => EventSubscription;
  stopStepCounterUpdate: () => void;
};

function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/** True when the app can use the Android hardware step counter. */
export function isAndroidStepSensorAvailable(): boolean {
  return isAndroid();
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function loadStepCounterModule(): Promise<StepCounterNative | null> {
  if (!isAndroid()) {
    return null;
  }

  const mod = await import('@dongminyu/react-native-step-counter');
  return {
    isStepCountingSupported: mod.isStepCountingSupported,
    startStepCounterUpdate: mod.startStepCounterUpdate,
    stopStepCounterUpdate: mod.stopStepCounterUpdate,
  };
}

async function requestAndroidActivityPermission(): Promise<boolean> {
  const permission = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Activity recognition',
    message:
      'GymFuel needs access to your device step counter to track daily steps from the motion sensor.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

class StepSensorManager {
  private native: StepCounterNative | null = null;
  private subscription: EventSubscription | null = null;
  private listeners = new Set<StepUpdateListener>();
  private serverTotalListeners = new Set<ServerTotalListener>();
  private currentSteps = 0;
  private lastSyncedSteps = 0;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  get isRunning() {
    return this.running;
  }

  get steps() {
    return this.currentSteps;
  }

  subscribe(listener: StepUpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentSteps);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onServerTotalUpdate(listener: ServerTotalListener): () => void {
    this.serverTotalListeners.add(listener);
    return () => {
      this.serverTotalListeners.delete(listener);
    };
  }

  private async refreshServerTotal() {
    const res = await trackersApi.todaySteps();
    if (res.success && res.data) {
      const total = res.data.total_steps;
      this.serverTotalListeners.forEach((listener) => listener(total));
      return total;
    }
    return null;
  }

  private emit(steps: number) {
    this.currentSteps = steps;
    this.listeners.forEach((listener) => listener(steps));
  }

  private scheduleBackendSync(steps: number) {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.syncStepsToBackend(steps);
    }, SYNC_DEBOUNCE_MS);
  }

  private async syncStepsToBackend(steps: number, force = false) {
    if (!isAndroid()) {
      return false;
    }

    if (
      !force &&
      this.lastSyncedSteps > 0 &&
      Math.abs(steps - this.lastSyncedSteps) < MIN_SYNC_STEP_DELTA
    ) {
      return false;
    }

    const res = await trackersApi.logSteps({
      step_count: steps,
      source: 'googlefit',
    });

    if (res.success) {
      this.lastSyncedSteps = steps;
      await this.refreshServerTotal();
      return true;
    }
    return false;
  }

  private handleStepData = (data: StepCountData) => {
    const steps = Math.max(0, Math.round(data.steps));
    this.emit(steps);
    this.scheduleBackendSync(steps);
  };

  private async getNative(): Promise<StepCounterNative | null> {
    if (!isAndroid()) {
      return null;
    }
    if (!this.native) {
      this.native = await loadStepCounterModule();
    }
    return this.native;
  }

  async checkSupport(): Promise<{ supported: boolean; granted: boolean }> {
    if (!isAndroid()) {
      return { supported: false, granted: false };
    }

    try {
      const native = await this.getNative();
      if (!native) {
        return { supported: false, granted: false };
      }
      const result = await native.isStepCountingSupported();
      return {
        supported: result.supported === true,
        granted: result.granted === true,
      };
    } catch (error) {
      console.warn('Step sensor support check failed:', error);
      return { supported: false, granted: false };
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!isAndroid()) {
      return false;
    }

    const androidOk = await requestAndroidActivityPermission();
    if (!androidOk) {
      return false;
    }

    const { granted } = await this.checkSupport();
    return granted;
  }

  async start(): Promise<{ ok: boolean; message?: string }> {
    if (!isAndroid()) {
      return { ok: false, message: 'Step sensor is only available on Android.' };
    }

    if (this.running) {
      return { ok: true };
    }

    const androidOk = await requestAndroidActivityPermission();
    if (!androidOk) {
      return {
        ok: false,
        message: 'Activity recognition permission is required to count steps.',
      };
    }

    const { supported, granted } = await this.checkSupport();
    if (!supported) {
      return {
        ok: false,
        message: 'This device does not support step counting.',
      };
    }

    if (!granted) {
      return {
        ok: false,
        message: 'Step counting permission was not granted.',
      };
    }

    try {
      const native = await this.getNative();
      if (!native) {
        return { ok: false, message: 'Step counter module is not available.' };
      }

      this.subscription = native.startStepCounterUpdate(startOfToday(), this.handleStepData);
      this.running = true;
      await AsyncStorage.setItem(SENSOR_ENABLED_KEY, '1');
      return { ok: true };
    } catch (error: any) {
      console.error('Failed to start step sensor:', error);
      return {
        ok: false,
        message: error?.message || 'Could not start the step counter.',
      };
    }
  }

  stop() {
    if (!isAndroid()) {
      return;
    }

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    this.native?.stopStepCounterUpdate();
    this.running = false;
    void AsyncStorage.removeItem(SENSOR_ENABLED_KEY);
  }

  async wasEnabledPreviously(): Promise<boolean> {
    if (!isAndroid()) {
      return false;
    }
    const value = await AsyncStorage.getItem(SENSOR_ENABLED_KEY);
    return value === '1';
  }

  async restoreIfEnabled(): Promise<boolean> {
    if (!isAndroid()) {
      return false;
    }
    const enabled = await this.wasEnabledPreviously();
    if (!enabled) {
      return false;
    }
    const result = await this.start();
    return result.ok;
  }

  async flushSync() {
    if (this.currentSteps > 0) {
      await this.syncStepsToBackend(this.currentSteps, true);
    }
  }

  /** Push the current sensor count to the backend immediately (Trackers "Sync now"). */
  async syncNow(): Promise<boolean> {
    if (!isAndroid()) {
      return false;
    }
    if (this.currentSteps <= 0) {
      return false;
    }
    const ok = await this.syncStepsToBackend(this.currentSteps, true);
    if (!ok) {
      await this.refreshServerTotal();
    }
    return ok;
  }

  /** Fetch today's combined step total from the API (manual + sensor). */
  async fetchTodayTotal(): Promise<number | null> {
    return this.refreshServerTotal();
  }
}

export const stepSensor = new StepSensorManager();
