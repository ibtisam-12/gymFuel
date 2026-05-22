import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { DashboardData, MealLog, WaterLog, StepLog, BackendDashboardData, BackendDailySummary } from '../../types';

interface TrackerState {
  dashboard: DashboardData | null;
  meals: MealLog[];
  waterLogs: WaterLog[];
  stepLogs: StepLog[];
  loading: boolean;
  stepSensorActive: boolean;
  stepSensorSteps: number;
  /** Today's step total (API + sensor); always safe to read for UI */
  todaySteps: number;
}

const initialState: TrackerState = {
  dashboard: null,
  meals: [],
  waterLogs: [],
  stepLogs: [],
  loading: false,
  stepSensorActive: false,
  stepSensorSteps: 0,
  todaySteps: 0,
};

const trackerSlice = createSlice({
  name: 'tracker',
  initialState,
  reducers: {
    setDashboardData(state, action: PayloadAction<DashboardData>) {
      state.dashboard = action.payload;
    },
    setMeals(state, action: PayloadAction<MealLog[]>) {
      state.meals = action.payload;
    },
    addMeal(state, action: PayloadAction<MealLog>) {
      state.meals.unshift(action.payload);
      if (state.dashboard) {
        state.dashboard.calories.consumed += action.payload.calories;
        state.dashboard.calories.remaining = Math.max(0, state.dashboard.calories.target - state.dashboard.calories.consumed);
        
        state.dashboard.macros.protein.current += Math.round(action.payload.protein_g);
        state.dashboard.macros.carbs.current += Math.round(action.payload.carbs_g);
        state.dashboard.macros.fats.current += Math.round(action.payload.fats_g);
        
        state.dashboard.budget.spent += action.payload.cost_pkr;
        state.dashboard.budget.remaining = Math.max(0, state.dashboard.budget.total - state.dashboard.budget.spent);
      }
    },
    setWaterLogs(state, action: PayloadAction<WaterLog[]>) {
      state.waterLogs = action.payload;
    },
    addWaterLog(state, action: PayloadAction<WaterLog>) {
      state.waterLogs.unshift(action.payload);
      if (state.dashboard) {
        state.dashboard.water.current += action.payload.amount_ml;
      }
    },
    setStepLogs(state, action: PayloadAction<StepLog[]>) {
      state.stepLogs = action.payload;
    },
    updateTodaySteps(state, action: PayloadAction<number>) {
      state.todaySteps = action.payload;
      if (state.dashboard) {
        state.dashboard.steps.current = action.payload;
      }
    },
    setStepSensorState(
      state,
      action: PayloadAction<{ active: boolean; steps: number }>
    ) {
      state.stepSensorActive = action.payload.active;
      state.stepSensorSteps = action.payload.steps;
      if (state.dashboard && action.payload.steps >= 0) {
        state.dashboard.steps.current = action.payload.steps;
      }
    },
    removeMeal(state, action: PayloadAction<number>) {
      const idx = state.meals.findIndex((m) => m.id === action.payload);
      if (idx !== -1) {
        const deletedMeal = state.meals[idx];
        state.meals.splice(idx, 1);
        if (state.dashboard) {
          state.dashboard.calories.consumed = Math.max(0, state.dashboard.calories.consumed - deletedMeal.calories);
          state.dashboard.calories.remaining = Math.max(0, state.dashboard.calories.target - state.dashboard.calories.consumed);
          
          state.dashboard.macros.protein.current = Math.max(0, state.dashboard.macros.protein.current - Math.round(deletedMeal.protein_g));
          state.dashboard.macros.carbs.current = Math.max(0, state.dashboard.macros.carbs.current - Math.round(deletedMeal.carbs_g));
          state.dashboard.macros.fats.current = Math.max(0, state.dashboard.macros.fats.current - Math.round(deletedMeal.fats_g));
          
          state.dashboard.budget.spent = Math.max(0, state.dashboard.budget.spent - deletedMeal.cost_pkr);
          state.dashboard.budget.remaining = Math.max(0, state.dashboard.budget.total - state.dashboard.budget.spent);
        }
      }
    },
    removeWaterLog(state, action: PayloadAction<number>) {
      const idx = state.waterLogs.findIndex((w) => w.id === action.payload);
      if (idx !== -1) {
        const deletedWater = state.waterLogs[idx];
        state.waterLogs.splice(idx, 1);
        if (state.dashboard) {
          state.dashboard.water.current = Math.max(0, state.dashboard.water.current - deletedWater.amount_ml);
        }
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    /** Ensures step-sensor fields exist after hot reload or older persisted state */
    ensureStepSensorFields(state) {
      if (state.stepSensorActive === undefined) {
        state.stepSensorActive = false;
      }
      if (state.stepSensorSteps === undefined) {
        state.stepSensorSteps = 0;
      }
      if (state.todaySteps === undefined) {
        state.todaySteps = 0;
      }
    },
  },
});

export const {
  setDashboardData,
  setMeals,
  addMeal,
  setWaterLogs,
  addWaterLog,
  setStepLogs,
  updateTodaySteps,
  setStepSensorState,
  removeMeal,
  removeWaterLog,
  setLoading,
  ensureStepSensorFields,
} = trackerSlice.actions;

export default trackerSlice.reducer;

export const useTrackerStore = () => {
  const trackerState = useSelector((state: RootState) => state.tracker);
  return trackerState;
};

/**
 * Transforms raw backend dashboard and meal summary metrics into the structured 
 * UI presentation data model. Calculates target macro splits dynamically by TDEE and fitness goals.
 */
export const transformDashboardResponse = (
  rawDashboard: BackendDashboardData,
  rawSummary?: BackendDailySummary | null
): DashboardData => {
  const phase = (rawDashboard.fitness_phase || 'maintenance').toLowerCase();
  const tdee = rawDashboard.tdee_kcal || 2000;

  // Macro target splits by fitness phase
  let proteinPct = 0.30;
  let carbsPct = 0.40;
  let fatsPct = 0.30;

  if (phase.includes('bulk')) {
    proteinPct = 0.30;
    carbsPct = 0.50;
    fatsPct = 0.20;
  } else if (phase.includes('cut')) {
    proteinPct = 0.40;
    carbsPct = 0.35;
    fatsPct = 0.25;
  } else if (phase.includes('recomp')) {
    proteinPct = 0.40;
    carbsPct = 0.35;
    fatsPct = 0.25;
  } else if (phase.includes('recovery')) {
    proteinPct = 0.35;
    carbsPct = 0.40;
    fatsPct = 0.25;
  }

  const targetProtein = Math.round((tdee * proteinPct) / 4);
  const targetCarbs = Math.round((tdee * carbsPct) / 4);
  const targetFats = Math.round((tdee * fatsPct) / 9);

  return {
    steps: {
      current: rawDashboard.today.steps || 0,
      goal: 10000,
    },
    water: {
      current: rawDashboard.today.water_ml || 0,
      goal: rawDashboard.today.water_goal_ml || 2500,
    },
    calories: {
      consumed: rawDashboard.today.calories_consumed || 0,
      target: tdee,
      remaining: rawDashboard.today.calories_remaining || 0,
    },
    macros: {
      protein: {
        current: Math.round(rawSummary?.total_protein_g || 0),
        target: targetProtein,
      },
      carbs: {
        current: Math.round(rawSummary?.total_carbs_g || 0),
        target: targetCarbs,
      },
      fats: {
        current: Math.round(rawSummary?.total_fats_g || 0),
        target: targetFats,
      },
    },
    budget: {
      spent: rawDashboard.today.budget_used_pkr || 0,
      total: rawDashboard.budget_pkr || 15000,
      remaining: rawDashboard.today.budget_remaining_pkr || 0,
    },
    current_phase: rawDashboard.fitness_phase || 'maintenance',
  };
};
