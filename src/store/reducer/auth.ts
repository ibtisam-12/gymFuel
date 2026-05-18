import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';
import { setAuthToken } from '../../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false;
      state.error = null;
      // Sync the security token with our API client immediately
      setAuthToken(action.payload.token);
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      setAuthToken(null);
    },
    setOnboarded(state, action: PayloadAction<boolean>) {
      if (state.user) {
        state.user.is_onboarded = action.payload;
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setOnboarded } = authSlice.actions;
export default authSlice.reducer;
