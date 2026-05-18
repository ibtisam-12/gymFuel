import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation.types';
import LoginScreen from '../screens/auth/login';
import SignUpScreen from '../screens/auth/sign-up';
import VerifyEmailScreen from '../screens/auth/verify-email';
import ForgotPasswordScreen from '../screens/auth/forgot-password';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Authentication Stack Navigator.
 * Connects Login and Sign-Up screens.
 */
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login" 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthStackNavigator;
