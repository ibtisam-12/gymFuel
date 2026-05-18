import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation.types';
import LanguageScreen from '../screens/LanguageScreen';
import LoginScreen from '../screens/auth/login';
import SignUpScreen from '../screens/auth/sign-up';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Authentication Stack Navigator.
 * Connects Language selector to Login and Sign-Up screens.
 */
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="LanguageScreen" 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="LanguageScreen" component={LanguageScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};

export default AuthStackNavigator;
