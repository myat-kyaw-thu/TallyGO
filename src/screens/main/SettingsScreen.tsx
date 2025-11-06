import { useAuthContext } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { theme } from '../../constants/theme';
import { useBackgroundTasks } from '../../hooks/useBackgroundTasks';
import type { SettingsMainScreenProps } from '../../types/navigation';

export function SettingsScreen({ navigation }: SettingsMainScreenProps) {
  const {
    user,
    isAuthenticated,
    isGuest,
    loading: authLoading,
    error: authError,
    signOut,
    showAuthScreens,
    clearError: clearAuthError
  } = useAuthContext();

  const {
    status,
    loading,
    error,
    requestPermissions,
    triggerDailyGoalCheck,
    triggerWeeklyReport,
    cancelAllNotifications,
    refreshStatus,
    clearError
  } = useBackgroundTasks();

  const [statusText, setStatusText] = useState('Loading...');
  const [authStatusText, setAuthStatusText] = useState('Loading...');

  useEffect(() => {
    if (status.isInitialized) {
      const statusLines = [
        `Permissions: ${status.permissionsGranted ? '✅ Granted' : '❌ Denied'}`,
        `Daily Check: ${status.dailyGoalCheckScheduled ? '✅ Scheduled' : '❌ Not Scheduled'}`,
        `Weekly Report: ${status.weeklyReportScheduled ? '✅ Scheduled' : '❌ Not Scheduled'}`,
        `Total Notifications: ${status.totalScheduled}`
      ];
      setStatusText(statusLines.join('\n'));
    }
  }, [status]);

  useEffect(() => {
    if (user) {
      const authLines = [
        `Status: ${isAuthenticated ? '✅ Authenticated' : '👤 Guest Mode'}`,
        `User ID: ${user.id}`,
        `Email: ${user.email || 'N/A (Guest)'}`,
        `Created: ${new Date(user.created_at).toLocaleDateString()}`
      ];
      setAuthStatusText(authLines.join('\n'));
    }
  }, [user, isAuthenticated]);

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      Alert.alert('Success', 'Notification permissions granted!');
    } else {
      Alert.alert('Permissions Denied', 'Please enable notifications in your device settings to receive goal reminders.');
    }
  };

  const handleTriggerDailyCheck = async () => {
    await triggerDailyGoalCheck();
    Alert.alert('Daily Check', 'Daily goal check notification sent!');
  };

  const handleTriggerWeeklyReport = async () => {
    await triggerWeeklyReport();
    Alert.alert('Weekly Report', 'Weekly report generation triggered!');
  };

  const handleCancelNotifications = async () => {
    await cancelAllNotifications();
    Alert.alert('Cancelled', 'All notifications have been cancelled.');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will switch to guest mode and your data will be stored locally.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              Alert.alert('Signed Out', 'You are now in guest mode.');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };



  const handleSignUp = async () => {
    Alert.alert(
      'Create Account',
      'This will take you to the sign-up screen. Your current guest data will be cleared and you\'ll start fresh with your new account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Account',
          onPress: () => {
            showAuthScreens();
          }
        }
      ]
    );
  };

  const handleSignIn = async () => {
    Alert.alert(
      'Sign In',
      'This will take you to the sign-in screen. Your current guest data will be cleared and replaced with your account data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign In',
          onPress: () => {
            showAuthScreens();
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Account Status */}
      <ModernCard variant="outlined" style={styles.statusCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <Text style={styles.statusText}>{authStatusText}</Text>
          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {authError}</Text>
              <ModernButton
                onPress={clearAuthError}
                variant="ghost"
                size="sm"
                style={styles.clearErrorButton}
              >
                Clear Error
              </ModernButton>
            </View>
          )}
        </ModernCardContent>
      </ModernCard>

      {/* Authentication Controls */}
      <ModernCard variant="outlined" style={styles.controlsCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Account Management</Text>

          {isGuest ? (
            <>
              <Text style={styles.guestWarning}>
                ⚠️ You're in guest mode. Your data will expire after 30 days.
              </Text>
              <ModernButton
                onPress={handleSignUp}
                loading={authLoading}
                style={styles.controlButton}
                fullWidth
              >
                Create Account (Fresh Start)
              </ModernButton>
              <ModernButton
                onPress={handleSignIn}
                variant="secondary"
                loading={authLoading}
                style={styles.controlButton}
                fullWidth
              >
                Sign In to Existing Account
              </ModernButton>
            </>
          ) : (
            <>
              <Text style={styles.authenticatedInfo}>
                ✅ Your data is synced and backed up securely.
              </Text>
              <View style={styles.accountDetails}>
                <Text style={styles.accountDetailLabel}>Email:</Text>
                <Text style={styles.accountDetailValue}>{user?.email}</Text>
              </View>
              <ModernButton
                onPress={handleSignOut}
                variant="ghost"
                loading={authLoading}
                style={styles.controlButton}
                fullWidth
              >
                Sign Out (Switch to Guest Mode)
              </ModernButton>
            </>
          )}

          {/* Navigation Buttons */}
          <ModernButton
            onPress={() => navigation.navigate('Account')}
            variant="outline"
            style={styles.controlButton}
            fullWidth
          >
            Account Management
          </ModernButton>

          <ModernButton
            onPress={() => navigation.navigate('DataManagement')}
            variant="outline"
            style={styles.controlButton}
            fullWidth
          >
            Data Management & Export
          </ModernButton>
        </ModernCardContent>
      </ModernCard>

      {/* Background Tasks Status */}
      <ModernCard variant="outlined" style={styles.statusCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Background Tasks Status</Text>
          <Text style={styles.statusText}>{statusText}</Text>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {error}</Text>
              <ModernButton
                onPress={clearError}
                variant="ghost"
                size="sm"
                style={styles.clearErrorButton}
              >
                Clear Error
              </ModernButton>
            </View>
          )}
          <ModernButton
            onPress={refreshStatus}
            variant="secondary"
            size="sm"
            loading={loading}
            style={styles.refreshButton}
          >
            Refresh Status
          </ModernButton>
        </ModernCardContent>
      </ModernCard>

      {/* Notification Controls */}
      <ModernCard variant="outlined" style={styles.controlsCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Notification Controls</Text>

          <ModernButton
            onPress={handleRequestPermissions}
            loading={loading}
            disabled={status.permissionsGranted}
            style={styles.controlButton}
            fullWidth
          >
            {status.permissionsGranted ? 'Permissions Granted ✅' : 'Request Permissions'}
          </ModernButton>

          <ModernButton
            onPress={handleTriggerDailyCheck}
            variant="secondary"
            loading={loading}
            style={styles.controlButton}
            fullWidth
          >
            Test Daily Goal Check
          </ModernButton>

          <ModernButton
            onPress={handleTriggerWeeklyReport}
            variant="secondary"
            loading={loading}
            style={styles.controlButton}
            fullWidth
          >
            Test Weekly Report
          </ModernButton>

          <ModernButton
            onPress={handleCancelNotifications}
            variant="ghost"
            loading={loading}
            style={styles.controlButton}
            fullWidth
          >
            Cancel All Notifications
          </ModernButton>
        </ModernCardContent>
      </ModernCard>

      {/* App Information */}
      <ModernCard variant="outlined" style={styles.statusCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.appInfoContainer}>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Version:</Text>
              <Text style={styles.appInfoValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Build:</Text>
              <Text style={styles.appInfoValue}>{Constants.expoConfig?.extra?.buildNumber || 'Development'}</Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Platform:</Text>
              <Text style={styles.appInfoValue}>{Constants.platform?.ios ? 'iOS' : 'Android'}</Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Environment:</Text>
              <Text style={styles.appInfoValue}>{__DEV__ ? 'Development' : 'Production'}</Text>
            </View>
          </View>
        </ModernCardContent>
      </ModernCard>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  statusCard: {
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  controlsCard: {
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },

  sectionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statusText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorContainer: {
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.error[700],
    marginBottom: theme.spacing.sm,
  },
  clearErrorButton: {
    alignSelf: 'flex-start',
  },
  refreshButton: {
    alignSelf: 'flex-start',
  },
  controlButton: {
    marginBottom: theme.spacing.md,
  },
  guestWarning: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.warning[700],
    backgroundColor: theme.colors.warning[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  authenticatedInfo: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.success[700],
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },

  accountDetails: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  accountDetailLabel: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  accountDetailValue: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeights.semibold,
  },

  appInfoContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  appInfoLabel: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  appInfoValue: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeights.semibold,
    fontFamily: 'monospace',
  },
});