import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { theme } from '../constants/theme';
import type { GoalsStackParamList } from '../types/navigation';

// Import goal screens
import { GoalReportsScreen } from '../screens/goals/GoalReportsScreen';
import { GoalsDashboardScreen } from '../screens/goals/GoalsDashboardScreen';
import { GoalTemplatesScreen } from '../screens/goals/GoalTemplatesScreen';

const Stack = createStackNavigator<GoalsStackParamList>();

export function GoalsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background.primary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.neutral[200],
        },
        headerTitleStyle: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.text.primary,
        },
        headerTintColor: theme.colors.primary[600],
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={GoalsDashboardScreen}
        options={{
          title: 'Goals',
          headerShown: false, // Will be shown by tab navigator
        }}
      />
      <Stack.Screen
        name="Templates"
        component={GoalTemplatesScreen}
        options={{
          title: 'Goal Templates',
        }}
      />
      <Stack.Screen
        name="Reports"
        component={GoalReportsScreen}
        options={{
          title: 'Weekly Reports',
        }}
      />
    </Stack.Navigator>
  );
}