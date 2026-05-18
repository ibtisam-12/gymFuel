export interface User {
  id: number | string;
  full_name: string;
  email: string;
  is_onboarded: boolean;
  is_email_verified?: boolean;
  created_at?: string;
  avatar?: string;
}

export interface UserProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  city: string;
  weight_kg: number;
  height_cm: number;
  body_fat_percent?: number;
  bmi?: number;
  tdee?: number;
  daily_budget_pkr?: number;
  per_meal_budget_pkr?: number;
  medical_conditions: string[];
  fitness_phase: 'bulking' | 'cutting' | 'recomposition' | 'maintenance' | 'recovery' | 'deload';
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';
  dietary_preference: 'non_veg' | 'vegetarian' | 'pescatarian' | 'no_pref';
  allergens: string[];
  budget_pkr: number;
}

export interface MealLog {
  id: number;
  meal_name: string;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  calories: number;
  cost_pkr: number;
  is_ai_suggested: boolean;
  ai_snapshot?: any;
  logged_at: string;
}

export interface WaterLog {
  id: number;
  amount_ml: number;
  logged_at: string;
}

export interface StepLog {
  id: number;
  step_count: number;
  date: string;
  source?: 'healthkit' | 'googlefit' | 'manual';
  logged_at?: string;
}

export interface WaterSummary {
  date: string;
  total_ml: number;
  goal_ml: number;
  percentage: number;
  logs_count: number;
}

export interface StepTodaySummary {
  date: string;
  total_steps: number;
  goal: number;
  percentage: number;
  sources: StepLog[];
}

export interface ReminderSettings {
  water_reminder_interval_hours: number;
  meal_reminder_times: string[];
  notifications_enabled: boolean;
  updated_at?: string;
}

export interface PhaseHistory {
  id: number;
  phase: UserProfile['fitness_phase'];
  started_at: string;
  ended_at?: string | null;
}

export interface AuthTokenResponse {
  access?: string;
  refresh?: string;
  user?: User;
  detail?: string;
  email_verification_required?: boolean;
}

export interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}

export interface DeviceToken {
  id: number;
  token: string;
  platform: 'android' | 'ios' | string;
  is_active: boolean;
  created_at: string;
}

export interface ChatSession {
  id: number;
  created_at: string;
  messages: ChatMessage[];
}

export interface DashboardData {
  steps: {
    current: number;
    goal: number;
  };
  water: {
    current: number;
    goal: number;
  };
  calories: {
    consumed: number;
    target: number;
    remaining: number;
  };
  macros: {
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fats: { current: number; target: number };
  };
  budget: {
    spent: number;
    total: number;
    remaining: number;
  };
  current_phase: string;
}

export interface BackendDashboardData {
  fitness_phase: string;
  dietary_preference: string;
  tdee_kcal: number;
  budget_pkr: number;
  today: {
    water_ml: number;
    water_goal_ml: number;
    steps: number;
    calories_consumed: number;
    calories_remaining: number;
    budget_used_pkr: number;
    budget_remaining_pkr: number;
  };
}

export interface BackendDailySummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  total_cost_pkr: number;
  meal_count: number;
  remaining_calories: number;
}

export interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  ai_data?: any;
  created_at: string;
}

export interface ChatResponse {
  session_id: number;
  success: boolean;
  blocked?: boolean;
  message: ChatMessage;
  error?: string | null;
}
