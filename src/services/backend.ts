import api, {
  clearPersistedAuthToken,
  getPersistedRefreshToken,
  persistAuthTokens,
} from '../utils/api';
import apiEndpoints from '../constants/api-endpoints';
import {
  AuthTokenResponse,
  BackendDailySummary,
  BackendDashboardData,
  ChatResponse,
  ChatSession,
  DeviceToken,
  MealLog,
  PhaseHistory,
  ReminderSettings,
  StepLog,
  StepTodaySummary,
  User,
  UserProfile,
  WaterLog,
  WaterSummary,
} from '../types';

export const todayISODate = () => new Date().toISOString().slice(0, 10);

export const authApi = {
  async register(payload: {
    full_name: string;
    email: string;
    password: string;
    password2: string;
  }) {
    const res = await api.post<AuthTokenResponse>(apiEndpoints.REGISTER, payload);
    if (res.success && res.data?.access) {
      await persistAuthTokens(res.data.access, res.data.refresh);
    }
    return res;
  },

  async login(payload: { email: string; password: string }) {
    const res = await api.post<AuthTokenResponse>(apiEndpoints.LOGIN, payload);
    if (res.success && res.data?.access) {
      await persistAuthTokens(res.data.access, res.data.refresh);
    }
    return res;
  },

  refresh(refreshToken: string) {
    return api.post<{ access: string }>(apiEndpoints.REFRESH, { refresh: refreshToken });
  },

  me() {
    return api.get<User>(apiEndpoints.ME);
  },

  updateMe(payload: Partial<Pick<User, 'email' | 'full_name'>>) {
    return api.patch<User>(apiEndpoints.ME, payload);
  },

  async logout() {
    const refresh = await getPersistedRefreshToken();
    const res = refresh
      ? await api.post<{ detail: string }>(apiEndpoints.LOGOUT, { refresh })
      : { success: true, failed: false, data: { detail: 'No refresh token stored.' }, error: '', ResponseCode: 200 };
    await clearPersistedAuthToken();
    return res;
  },
};

export const profileApi = {
  get() {
    return api.get<UserProfile>(apiEndpoints.PROFILE);
  },

  create(payload: UserProfile) {
    return api.post<UserProfile>(apiEndpoints.CREATE_PROFILE, payload);
  },

  update(payload: Partial<UserProfile>) {
    return api.patch<UserProfile>(apiEndpoints.PROFILE, payload);
  },

  dashboard() {
    return api.get<BackendDashboardData>(apiEndpoints.DASHBOARD);
  },

  updatePhase(phase: UserProfile['fitness_phase']) {
    return api.post<{
      previous_phase: UserProfile['fitness_phase'];
      current_phase: UserProfile['fitness_phase'];
      message: string;
    }>(apiEndpoints.UPDATE_PHASE, { phase });
  },

  phaseHistory() {
    return api.get<PhaseHistory[]>(apiEndpoints.PHASE_HISTORY);
  },
};

export const aiApi = {
  chat(message: string, sessionId?: number | string | null) {
    return api.post<ChatResponse>(apiEndpoints.AI_CHAT, {
      message,
      session_id: sessionId ? Number(sessionId) : undefined,
    });
  },

  sessions() {
    return api.get<ChatSession[]>(apiEndpoints.AI_SESSIONS);
  },

  session(id: number | string) {
    return api.get<ChatSession>(apiEndpoints.AI_SESSION_DETAIL(id));
  },

  deleteSession(id: number | string) {
    return api.delete<void>(apiEndpoints.AI_SESSION_DETAIL(id));
  },

  clearMemory() {
    return api.post<{ detail: string }>(apiEndpoints.AI_MEMORY_CLEAR, {});
  },
};

export const trackersApi = {
  waterLogs(date?: string) {
    return api.get<WaterLog[]>(apiEndpoints.WATER, date ? { params: { date } } : undefined);
  },

  logWater(amount_ml: number) {
    return api.post<WaterLog>(apiEndpoints.WATER, { amount_ml });
  },

  deleteWater(id: number | string) {
    return api.delete<void>(apiEndpoints.WATER_DETAIL(id));
  },

  waterSummary(date?: string) {
    return api.get<WaterSummary>(
      apiEndpoints.WATER_SUMMARY,
      date ? { params: { date } } : undefined,
    );
  },

  stepLogs(date?: string) {
    return api.get<StepLog[]>(apiEndpoints.STEPS, date ? { params: { date } } : undefined);
  },

  logSteps(payload: {
    step_count: number;
    date?: string;
    source?: 'healthkit' | 'googlefit' | 'manual';
  }) {
    return api.post<StepLog>(apiEndpoints.STEPS, {
      date: payload.date || todayISODate(),
      source: payload.source || 'manual',
      step_count: payload.step_count,
    });
  },

  todaySteps() {
    return api.get<StepTodaySummary>(apiEndpoints.STEPS_TODAY);
  },

  mealLogs(date?: string) {
    return api.get<MealLog[]>(apiEndpoints.MEALS, date ? { params: { date } } : undefined);
  },

  logMeal(payload: Omit<MealLog, 'id' | 'logged_at'>) {
    return api.post<MealLog>(apiEndpoints.MEALS, payload);
  },

  updateMeal(id: number | string, payload: Partial<MealLog>) {
    return api.patch<MealLog>(apiEndpoints.MEAL_DETAIL(id), payload);
  },

  deleteMeal(id: number | string) {
    return api.delete<void>(apiEndpoints.MEAL_DETAIL(id));
  },

  saveAiMeal(ai_data: any) {
    return api.post<MealLog>(apiEndpoints.SAVE_AI_MEAL, { ai_data });
  },

  mealSummary(date?: string) {
    return api.get<BackendDailySummary>(
      apiEndpoints.MEALS_SUMMARY,
      date ? { params: { date } } : undefined,
    );
  },
};

export const remindersApi = {
  get() {
    return api.get<ReminderSettings>(apiEndpoints.WATER_REMINDER_SETTINGS);
  },

  update(payload: Partial<ReminderSettings>) {
    return api.patch<ReminderSettings>(apiEndpoints.WATER_REMINDER_SETTINGS, payload);
  },
};

export const notificationsApi = {
  registerDevice(payload: { token: string; platform: 'android' | 'ios' | string }) {
    return api.post<DeviceToken>(apiEndpoints.DEVICE_REGISTER, payload);
  },

  deregisterDevice(token: string) {
    return api.delete<{ detail: string }>(apiEndpoints.DEVICE_DEREGISTER, {
      data: { token },
    });
  },
};
