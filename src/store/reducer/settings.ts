import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  darkMode: boolean;
}

const initialState: SettingsState = {
  darkMode: true, // Defaulting to the beautiful crimson dark OLED mode
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
    },
  },
});

export const { toggleDarkMode, setDarkMode } = settingsSlice.actions;
export default settingsSlice.reducer;
