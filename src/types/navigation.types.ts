import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Parameter list for our root stack navigator
export type RootStackParamList = {
  AuthStack: undefined;
  AppStack: undefined;
  Onboarding: undefined;
};

// Parameter list for the Authentication stack
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  VerifyEmail: { email?: string } | undefined;
  ForgotPassword: { email?: string } | undefined;
};

// Parameter list for our Bottom Tab navigator
export type BottomTabParamList = {
  Dashboard: undefined;
  AIChat: { initialQuery?: string } | undefined;
  Trackers: undefined;
  Profile: undefined;
};

// Helper types for typing screens
export interface RootStackScreenProps<T extends keyof RootStackParamList> {
  navigation: NativeStackNavigationProp<RootStackParamList, T>;
  route: RouteProp<RootStackParamList, T>;
}

export interface AuthStackScreen<T extends keyof AuthStackParamList> {
  navigation: NativeStackNavigationProp<AuthStackParamList, T>;
  route: RouteProp<AuthStackParamList, T>;
}

export interface BottomTabScreen<T extends keyof BottomTabParamList> {
  navigation: BottomTabNavigationProp<BottomTabParamList, T>;
  route: RouteProp<BottomTabParamList, T>;
}
