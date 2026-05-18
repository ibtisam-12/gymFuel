import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './bottom-tabs.navigator';

const Stack = createNativeStackNavigator();

/**
 * App Stack Navigator.
 * Hosts BottomTab overlays and nested detail modal pages.
 */
const AppStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BottomTabs" component={BottomTabNavigator} />
    </Stack.Navigator>
  );
};

export default AppStackNavigator;
