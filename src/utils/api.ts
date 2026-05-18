import axios, { AxiosRequestConfig } from 'axios';
import apiEndpoints from '../constants/api-endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInter = axios.create({
  baseURL: apiEndpoints.BASE_URL,
  responseType: 'json',
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

const TOKEN_STORAGE_KEY = 'gymfuel_auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gymfuel_refresh_token';

/**
 * Persist the current auth token to device storage and keep the runtime variable in sync.
 * Call this immediately after every successful login or token refresh.
 */
export const persistAuthToken = async (token: string): Promise<void> => {
  authToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (e) {
    console.warn('Failed to persist auth token:', e);
  }
};

export const persistAuthTokens = async (
  accessToken: string,
  refreshToken?: string | null,
): Promise<void> => {
  authToken = accessToken;
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  } catch (e) {
    console.warn('Failed to persist auth tokens:', e);
  }
};

export const getPersistedRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to load persisted refresh token:', e);
    return null;
  }
};

/**
 * Load a previously saved auth token from device storage and bind it to the axios client.
 * Call once on app boot (e.g. in RootNavigator useLayoutEffect) to auto-restore sessions.
 */
export const loadPersistedAuthToken = async (): Promise<string | null> => {
  try {
    const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      authToken = stored;
      return stored;
    }
  } catch (e) {
    console.warn('Failed to load persisted auth token:', e);
  }
  return null;
};

/**
 * Remove the saved auth token from device storage and reset the runtime variable.
 * Call during logout or when switching accounts.
 */
export const clearPersistedAuthToken = async (): Promise<void> => {
  authToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear persisted auth token:', e);
  }
};

/**
 * Dynamically binds the active JSON Web Token (JWT) to the network client.
 * Called automatically upon Redux auth state transitions.
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export interface ResponseObject<T> {
  success: boolean;
  failed: boolean;
  data: T | null;
  error: string;
  ResponseCode: number;
}

const caller = async <T>(
  type: 'post' | 'get' | 'put' | 'patch' | 'delete',
  url: string,
  data?: any,
  config?: AxiosRequestConfig<any>,
) => {
  const responseObject: ResponseObject<T> = {
    success: false,
    failed: false,
    data: null,
    error: '',
    ResponseCode: 0,
  };

  config = {
    ...config,
    headers: {
      ...config?.headers,
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  };

  try {
    let response;
    if (type === 'get' || type === 'delete') {
      response = await axiosInter[type](url, config);
    } else {
      response = await axiosInter[type](url, data, config);
    }
    responseObject.success = true;
    responseObject.data = response.data as T;
    responseObject.ResponseCode = response.status;
  } catch (err: any) {
    const response = err?.response?.data;
    
    // Attempt to extract standard Django Rest Framework error responses
    let errorMessage = 'Something went wrong. Please check your connection.';
    if (response) {
      if (typeof response === 'string') {
        errorMessage = response;
      } else if (response.detail) {
        errorMessage = response.detail;
      } else if (response.error) {
        errorMessage = response.error;
      } else if (response.message) {
        errorMessage = response.message;
      } else {
        // Fallback: extract validation errors if key-value dict
        const firstKey = Object.keys(response)[0];
        if (firstKey) {
          const val = response[firstKey];
          errorMessage = Array.isArray(val) ? val[0] : `${firstKey}: ${val}`;
        }
      }
    } else if (err.message) {
      errorMessage = err.message;
    }

    responseObject.ResponseCode = err?.response?.status || 0;
    responseObject.error = errorMessage;
    responseObject.data = null;
    responseObject.failed = true;
  }

  return responseObject as ResponseObject<T>;
};

const api = {
  get: <T>(url: string, config?: AxiosRequestConfig<any>) =>
    caller<T>('get', url, undefined, config),
  delete: <T>(url: string, config?: AxiosRequestConfig<any>) =>
    caller<T>('delete', url, undefined, config),
  post: <T>(url: string, data: any, config?: AxiosRequestConfig<any>) =>
    caller<T>('post', url, data, config),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig<any>) =>
    caller<T>('put', url, data, config),
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig<any>) =>
    caller<T>('patch', url, data, config),
};

export default api;
