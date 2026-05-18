import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from '../utils/elements';
import { BottomTabParamList } from '../types/navigation.types';
import useTheme from '../styles/theme';
import DashboardScreen from '../screens/app/home';
import AIChatScreen from '../screens/app/chat';
import TrackersScreen from '../screens/app/trackers';
import ProfileScreen from '../screens/app/profile';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabIcon = ({ focused, emoji, label, color }: any) => {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.emoji, focused && styles.focusedEmoji]}>{emoji}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
      {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
    </View>
  );
};

/**
 * Premium Floating Bottom Tab Navigator.
 * Connects Home, AI Recommendation Chat, Tracker logs, and User settings.
 */
const BottomTabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          elevation: 8,
          backgroundColor: colors.CARD,
          borderRadius: 24,
          height: 68,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.BORDER,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          paddingBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              emoji="⚡"
              label="Dashboard"
              color={focused ? colors.PRIMARY : colors.SUB_TEXT}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              emoji="💬"
              label="AI Chat"
              color={focused ? colors.PRIMARY : colors.SUB_TEXT}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Trackers"
        component={TrackersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              emoji="📈"
              label="Trackers"
              color={focused ? colors.PRIMARY : colors.SUB_TEXT}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              emoji="👤"
              label="Profile"
              color={focused ? colors.PRIMARY : colors.SUB_TEXT}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: 75,
    top: Platform.OS === 'ios' ? 4 : 0,
  },
  emoji: {
    fontSize: 20,
    opacity: 0.7,
  },
  focusedEmoji: {
    fontSize: 22,
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});

export default BottomTabNavigator;
