import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../utils/elements';
import { BottomTabParamList } from '../types/navigation.types';
import useTheme from '../styles/theme';
import DashboardScreen from '../screens/app/home';
import AIChatScreen from '../screens/app/chat';
import TrackersScreen from '../screens/app/trackers';
import ProfileScreen from '../screens/app/profile';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabIcon = ({ focused, emoji, label, color, highlight, highlightColor }: any) => {
  return (
    <View
      style={[
        styles.iconContainer,
        highlight && {
          backgroundColor: `${highlightColor}18`,
          borderRadius: 14,
          paddingHorizontal: 6,
        },
      ]}
    >
      <Text style={[styles.emoji, focused && styles.focusedEmoji]}>{emoji}</Text>
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
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.PRIMARY,
        tabBarInactiveTintColor: colors.SUB_TEXT,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: {
          position: 'absolute',
          bottom: tabBarBottom,
          left: 12,
          right: 12,
          elevation: 12,
          backgroundColor: colors.CARD,
          borderRadius: 20,
          height: 64 + (Platform.OS === 'ios' ? 4 : 0),
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.BORDER,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          paddingBottom: Platform.OS === 'ios' ? 6 : 4,
          paddingTop: 6,
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
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              emoji="🤖"
              label="AI Chat"
              color={focused ? colors.PRIMARY : colors.SUB_TEXT}
              highlight={focused}
              highlightColor={colors.PRIMARY}
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
    minWidth: 44,
    height: 36,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  emoji: {
    fontSize: 20,
    opacity: 0.7,
  },
  focusedEmoji: {
    fontSize: 22,
    opacity: 1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});

export default BottomTabNavigator;
