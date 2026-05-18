import { API_BASE_URL, WS_BASE_URL } from './api-config';

const apiEndpoints = {
  BASE_URL: API_BASE_URL,
  WS_BASE_URL,
  
  // Auth
  LOGIN: '/auth/login/',
  REGISTER: '/auth/register/',
  REFRESH: '/auth/refresh/',
  LOGOUT: '/auth/logout/',
  ME: '/auth/me/',
  VERIFY_EMAIL_REQUEST: '/auth/verify-email/request/',
  VERIFY_EMAIL: '/auth/verify-email/',
  PASSWORD_RESET_REQUEST: '/auth/password-reset/request/',
  PASSWORD_RESET: '/auth/password-reset/',
  
  // Profile
  PROFILE: '/profile/',
  DASHBOARD: '/profile/dashboard/',
  CREATE_PROFILE: '/profile/create/',
  
  // AI
  AI_CHAT: '/ai/chat/',
  AI_SESSIONS: '/ai/sessions/',
  AI_SESSION_DETAIL: (id: number | string) => `/ai/sessions/${id}/`,
  
  // Trackers
  WATER: '/water/',
  WATER_DETAIL: (id: number | string) => `/water/${id}/`,
  WATER_SUMMARY: '/water/summary/',
  STEPS: '/steps/',
  STEPS_TODAY: '/steps/today/',
  MEALS: '/meals/',
  MEAL_DETAIL: (id: number | string) => `/meals/${id}/`,
  SAVE_AI_MEAL: '/meals/save-ai/',
  MEALS_SUMMARY: '/meals/summary/',

  // Notifications (Push tokens registration)
  DEVICE_REGISTER: '/notifications/device/register/',
  DEVICE_DEREGISTER: '/notifications/device/deregister/',

  // Water Reminder Settings
  WATER_REMINDER_SETTINGS: '/water/reminder-settings/',

  // AI Session & Memory
  AI_MEMORY_CLEAR: '/ai/memory/clear/',

  // Profile Phase Changes
  UPDATE_PHASE: '/profile/phase/',
  PHASE_HISTORY: '/profile/phase/history/',
};

export default apiEndpoints;
