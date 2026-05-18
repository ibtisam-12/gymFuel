import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface ProfileState {
  data: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<UserProfile>) {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    clearProfile(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setProfile, setLoading, setError, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;

export const useProfileStore = () => {
  const profileState = useSelector((state: RootState) => state.profile);
  return profileState;
};
