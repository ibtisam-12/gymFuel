import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from './reducer/auth';
import profileReducer from './reducer/profile';
import trackerReducer from './reducer/tracker';
import chatReducer from './reducer/chat';
import settingsReducer from './reducer/settings';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    tracker: trackerReducer,
    chat: chatReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
