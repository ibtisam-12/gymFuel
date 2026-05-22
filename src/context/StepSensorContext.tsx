import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
  ensureStepSensorFields,
  setStepSensorState,
  updateTodaySteps,
} from '../store/reducer/tracker';
import {
  isAndroidStepSensorAvailable,
  stepSensor,
} from '../services/stepSensor';

export type StepSensorContextValue = {
  available: boolean;
  isActive: boolean;
  liveSteps: number;
  statusMessage: string;
  showPermissionModal: boolean;
  requestStart: () => void;
  confirmStart: () => Promise<{ ok: boolean; message?: string }>;
  cancelPermission: () => void;
  start: () => Promise<{ ok: boolean; message?: string }>;
  stop: () => Promise<void>;
  syncNow: () => Promise<boolean>;
  toggle: () => Promise<{ ok: boolean; stopped: boolean }>;
};

const defaultValue: StepSensorContextValue = {
  available: false,
  isActive: false,
  liveSteps: 0,
  statusMessage: '',
  showPermissionModal: false,
  requestStart: () => {},
  confirmStart: async () => ({ ok: false, message: 'Unavailable' }),
  cancelPermission: () => {},
  start: async () => ({ ok: false, message: 'Unavailable' }),
  stop: async () => {},
  syncNow: async () => false,
  toggle: async () => ({ ok: false, stopped: false }),
};

const StepSensorContext = createContext<StepSensorContextValue>(defaultValue);

let appInitialized = false;

export function StepSensorProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isActive = useAppSelector((s) => s.tracker.stepSensorActive ?? false);
  const liveSteps = useAppSelector((s) => s.tracker.stepSensorSteps ?? 0);
  const available = isAndroidStepSensorAvailable();

  const [statusMessage, setStatusMessage] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    dispatch(ensureStepSensorFields());
  }, [dispatch]);

  const syncRedux = useCallback(
    (steps: number, active: boolean) => {
      dispatch(setStepSensorState({ active, steps }));
      dispatch(updateTodaySteps(steps));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!available) {
      return;
    }

    const boot = async () => {
      if (!appInitialized) {
        appInitialized = true;
        const restored = await stepSensor.restoreIfEnabled();
        if (restored) {
          setStatusMessage('Step counter running');
          syncRedux(stepSensor.steps, true);
        }
      } else if (stepSensor.isRunning) {
        syncRedux(stepSensor.steps, true);
      }
    };

    void boot();

    const unsubSteps = stepSensor.subscribe((steps) => {
      syncRedux(steps, stepSensor.isRunning);
    });

    const unsubServer = stepSensor.onServerTotalUpdate((total) => {
      dispatch(updateTodaySteps(total));
      if (stepSensor.isRunning) {
        dispatch(
          setStepSensorState({
            active: true,
            steps: Math.max(stepSensor.steps, total),
          })
        );
      }
    });

    return () => {
      unsubSteps();
      unsubServer();
    };
  }, [available, syncRedux, dispatch]);

  const start = useCallback(async () => {
    const result = await stepSensor.start();
    if (result.ok) {
      setStatusMessage('Step counter running');
      syncRedux(stepSensor.steps, true);
    }
    return result;
  }, [syncRedux]);

  const stop = useCallback(async () => {
    const lastCount = stepSensor.steps;
    await stepSensor.flushSync();
    stepSensor.stop();
    setStatusMessage('');
    const serverTotal = await stepSensor.fetchTodayTotal();
    const displaySteps = serverTotal ?? lastCount;
    syncRedux(displaySteps, false);
    if (serverTotal !== null) {
      dispatch(updateTodaySteps(serverTotal));
    }
  }, [syncRedux, dispatch]);

  const syncNow = useCallback(async () => stepSensor.syncNow(), []);

  const requestStart = useCallback(() => {
    setShowPermissionModal(true);
  }, []);

  const confirmStart = useCallback(async () => {
    setShowPermissionModal(false);
    return start();
  }, [start]);

  const cancelPermission = useCallback(() => {
    setShowPermissionModal(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isActive) {
      await stop();
      return { ok: true, stopped: true };
    }
    requestStart();
    return { ok: true, stopped: false };
  }, [isActive, requestStart, stop]);

  const value = useMemo<StepSensorContextValue>(
    () => ({
      available,
      isActive,
      liveSteps,
      statusMessage,
      showPermissionModal,
      requestStart,
      confirmStart,
      cancelPermission,
      start,
      stop,
      syncNow,
      toggle,
    }),
    [
      available,
      isActive,
      liveSteps,
      statusMessage,
      showPermissionModal,
      requestStart,
      confirmStart,
      cancelPermission,
      start,
      stop,
      syncNow,
      toggle,
    ]
  );

  return (
    <StepSensorContext.Provider value={value}>{children}</StepSensorContext.Provider>
  );
}

export function useStepSensor(): StepSensorContextValue {
  return useContext(StepSensorContext);
}
