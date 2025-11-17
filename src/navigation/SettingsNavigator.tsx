import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { theme } from '../constants/theme';
import { AccountScreen, DataManagementScreen, SettingsScreen } from '../screens/main';
import type { SettingsStackParamList } from '../types/navigation';

const Stack = createStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
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
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account Management',
        }}
      />
      <Stack.Screen
        name="DataManagement"
        component={DataManagementScreen}
        options={{
          title: 'Data Management',
        }}
      />
    </Stack.Navigator>
  );
}