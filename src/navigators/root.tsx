import React, { useLayoutEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { loginSuccess, logout } from '../store/reducer/auth';
import { setProfile } from '../store/reducer/profile';
import { RootStackParamList } from '../types/navigation.types';
import AuthStackNavigator from './auth-stack';
import AppStackNavigator from './app-stack';
import OnboardingScreen from '../screens/auth/onboarding';
import {
  clearPersistedAuthToken,
  loadPersistedAuthToken,
  refreshAccessToken,
} from '../utils/api';
import { authApi, profileApi } from '../services/backend';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Stack Orchestrator.
 * Seamlessly manages authentication and onboarding gates.
 * Restores the saved auth token from AsyncStorage on app boot to keep sessions alive across restarts.
 */
const RootNavigator = () => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    const restoreSession = async () => {
      const storedToken = await loadPersistedAuthToken();
      if (storedToken) {
        try {
          let activeToken = storedToken;
          let resMe = await authApi.me();

          if (!resMe.success && resMe.ResponseCode === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              const retryMe = await authApi.me();
              if (retryMe.success && retryMe.data) {
                resMe = retryMe;
                activeToken = (await loadPersistedAuthToken()) || activeToken;
              }
            }
          }

          if (resMe.success && resMe.data) {
            const resDash = await profileApi.dashboard();
            const isOnboarded = resDash.success && resDash.data ? true : false;

            if (isOnboarded) {
              const profileRes = await profileApi.get();
              if (profileRes.success && profileRes.data) {
                dispatch(setProfile(profileRes.data));
              }
            }

            dispatch(loginSuccess({
              user: {
                ...resMe.data,
                is_onboarded: isOnboarded,
              },
              token: activeToken,
            }));
          } else {
            await clearPersistedAuthToken();
            dispatch(logout());
          }
        } catch {
          await clearPersistedAuthToken();
          dispatch(logout());
        }
      }
    };
    restoreSession();
  }, [dispatch]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token === null ? (
        <Stack.Screen name="AuthStack" component={AuthStackNavigator} />
      ) : user?.is_onboarded === false ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="AppStack" component={AppStackNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
