import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import type { MainTabParamList } from '../types/navigation';

// Import screens and navigators
import { ExpensesScreen } from '../screens/main/ExpensesScreen';

// Import custom tab bar (will be created in subtask 4.3)
import { CustomTabBar } from '../components/navigation/CustomTabBar';
import { GoalsNavigator } from './GoalsNavigator';
import { SettingsNavigator } from './SettingsNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Expenses"
      tabBar={(props) => <CustomTabBar {...props} />}
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
        headerTitle: ({ children }) => (
          <View style={styles.headerTitleContainer}>
            <Image source={require('../../assets/favicon.png')} style={styles.headerLogo} />
            <Text style={styles.headerTitleText}>{children}</Text>
          </View>
        ),
        headerTintColor: theme.colors.primary[600],
      }}
    >
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          title: 'Expenses',
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsNavigator}
        options={{
          title: 'Goals',
          headerShown: false, // Goals navigator will handle its own headers
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          title: 'Settings',
          headerShown: false, // Settings navigator will handle its own headers
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerLogo: {
    width: 24,
    height: 24,
  },
  headerTitleText: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
});