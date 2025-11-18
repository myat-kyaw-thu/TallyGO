import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { theme } from '../constants/theme';
import type { RootStackParamList } from '../types/navigation';

// Import screens
import { EmailConfirmationScreen } from '@/screens/auth/EmailConfirmationScreen';
import { LoginScreen, SignUpScreen, WelcomeScreen } from '../screens/auth';

const Stack = createStackNavigator<RootStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background.primary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.neutral[200],
        },
        headerTitleStyle: {
          fontSize: theme.typography.fontSizes.lg,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.text.primary,
        },
        headerBackTitle: '',
        headerTintColor: theme.colors.primary[600],
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{
          title: 'Create Account',
          headerShown: true
        }}
      />
      {/* EmailConfirmation screen is kept for password reset functionality but hidden from normal flow */}
      <Stack.Screen
        name="EmailConfirmation"
        component={EmailConfirmationScreen}
        options={{
          title: 'Reset Password',
          headerShown: true
        }}
      />
    </Stack.Navigator>
  );
}