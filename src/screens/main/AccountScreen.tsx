import { ModernInput } from '@/components/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { theme } from '../../constants/theme';
import { useAuthContext } from '../../contexts/AuthContext';
import { useExpenses } from '../../hooks/useExpenses';
import type { AccountScreenProps } from '../../types/navigation';

export function AccountScreen({ navigation }: AccountScreenProps) {
  const {
    user,
    isAuthenticated,
    isGuest,
    loading: authLoading,
    signOut,
    deleteAccount,
    showAuthScreens,
    resetPassword,

    error: authError,
    clearError
  } = useAuthContext();

  const { clearAllData } = useExpenses();
  const [deleting, setDeleting] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);


  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?\n\nYou will switch to guest mode and your data will be stored locally with a 30-day expiry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              Alert.alert(
                'Signed Out',
                'You are now in guest mode. Your data is stored locally and will expire after 30 days.'
              );
              navigation.goBack();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  }, [signOut, navigation]);

  const handleDeleteAccount = useCallback(async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data including:\n\n• All expenses\n• All goal templates and completions\n• All weekly reports\n• Account information\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setDeleting(true);

                      // Clear all local data first
                      await clearAllData();

                      // Delete account from server and switch to guest mode
                      await deleteAccount();

                      Alert.alert(
                        'Account Deleted',
                        'Your account and all data have been permanently deleted. You are now in guest mode.'
                      );

                      navigation.goBack();
                    } catch (error) {
                      console.error('Account deletion error:', error);
                      Alert.alert(
                        'Deletion Failed',
                        'Failed to delete your account. Please try again or contact support.'
                      );
                    } finally {
                      setDeleting(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  }, [clearAllData, deleteAccount, navigation]);

  const handleCreateAccount = useCallback(() => {
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
  }, [showAuthScreens]);

  const handleSignIn = useCallback(() => {
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
  }, [showAuthScreens]);

  const handlePasswordReset = useCallback(async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSendingReset(true);
      clearError();
      await resetPassword(resetEmail.trim());

      Alert.alert(
        'Reset Email Sent',
        'Please check your email and click the reset link. If you don\'t see the email, check your spam folder.',
        [{ text: 'OK', onPress: () => setShowPasswordReset(false) }]
      );
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Reset Failed', 'Failed to send reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  }, [resetEmail, resetPassword, clearError]);

  const handleOpenSupabaseSettings = useCallback(() => {
    Alert.alert(
      'Email Confirmation Issues',
      'If you\'re having trouble with email confirmation:\n\n1. Check your spam/junk folder\n2. Make sure the email address is correct\n3. Try requesting a new confirmation email\n4. Contact support if the issue persists\n\nWould you like to open your email app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Email App',
          onPress: () => {
            Linking.openURL('mailto:').catch(() => {
              Alert.alert('Error', 'Could not open email app');
            });
          }
        }
      ]
    );
  }, []);

  // Handle authentication state changes for welcome messages
  useEffect(() => {
    // If user just became authenticated (email confirmed), show success message
    if (isAuthenticated && user && !user.isGuest) {
      // Check if this is a recent authentication (within last 30 seconds)
      const userCreatedTime = new Date(user.created_at).getTime();
      const now = Date.now();
      const timeDiff = now - userCreatedTime;

      // If user was created recently, show confirmation
      if (timeDiff < 30000) { // 30 seconds
        setTimeout(() => {
          Alert.alert(
            'Welcome to TallyGO!',
            'Your account has been successfully created and verified. You can now sync your data across devices.',
            [{ text: 'Get Started' }]
          );
        }, 1000); // Small delay to ensure UI is ready
      }
    }
  }, [isAuthenticated, user]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Account Status */}
      <ModernCard variant="outlined" style={styles.statusCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.accountInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, isAuthenticated ? styles.authenticatedStatus : styles.guestStatus]}>
                {isAuthenticated ? '✅ Authenticated' : '👤 Guest Mode'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID:</Text>
              <Text style={styles.infoValue}>{user?.id || 'Unknown'}</Text>
            </View>

            {user?.email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data Storage:</Text>
              <Text style={styles.infoValue}>
                {isAuthenticated ? 'Cloud (Permanent)' : 'Local (30-day expiry)'}
              </Text>
            </View>
          </View>
        </ModernCardContent>
      </ModernCard>

      {/* Account Actions */}
      {isGuest ? (
        <ModernCard variant="outlined" style={styles.upgradeCard}>
          <ModernCardContent>
            <Text style={styles.sectionTitle}>Upgrade Your Account</Text>
            <Text style={styles.upgradeText}>
              ⚠️ You're currently in guest mode. Your data will expire after 30 days.
            </Text>
            <Text style={styles.sectionDescription}>
              Create an account to keep your data permanently, sync across devices, and never lose your information.
            </Text>

            <ModernButton
              onPress={handleCreateAccount}
              loading={authLoading}
              style={styles.actionButton}
              fullWidth
            >
              Create Account (Fresh Start)
            </ModernButton>

            <ModernButton
              onPress={handleSignIn}
              variant="secondary"
              loading={authLoading}
              style={styles.actionButton}
              fullWidth
            >
              Sign In to Existing Account
            </ModernButton>

            <Text style={styles.helpText}>
              💡 Your current guest data will be cleared when you create or sign in to an account.
            </Text>
          </ModernCardContent>
        </ModernCard>
      ) : (
        <ModernCard variant="outlined" style={styles.card}>
          <ModernCardContent>
            <Text style={styles.sectionTitle}>Account Management</Text>
            <Text style={styles.authenticatedInfo}>
              ✅ Your account is active and your data is securely stored in the cloud.
            </Text>
            <Text style={styles.sectionDescription}>
              Your data is automatically synced across all your devices and backed up securely.
            </Text>

            <ModernButton
              onPress={handleSignOut}
              variant="secondary"
              loading={authLoading}
              style={styles.actionButton}
              fullWidth
            >
              Sign Out (Switch to Guest Mode)
            </ModernButton>

            <ModernButton
              onPress={() => setShowPasswordReset(true)}
              variant="outline"
              loading={authLoading}
              style={styles.actionButton}
              fullWidth
            >
              Reset Password
            </ModernButton>

            <Text style={styles.helpText}>
              💡 Signing out will switch you to guest mode with local storage and 30-day data expiry.
            </Text>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <ModernCard variant="outlined" style={styles.modalCard}>
          <ModernCardContent>
            <Text style={styles.sectionTitle}>Reset Password</Text>
            <Text style={styles.sectionDescription}>
              Enter your email address to receive a password reset link.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <ModernInput
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                disabled={sendingReset}
                style={styles.input}
              />
            </View>

            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {authError}</Text>
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

            <View style={styles.modalActions}>
              <ModernButton
                onPress={() => {
                  setShowPasswordReset(false);
                  setResetEmail('');
                  clearError();
                }}
                variant="secondary"
                disabled={sendingReset}
                style={styles.modalButton}
              >
                Cancel
              </ModernButton>
              <ModernButton
                onPress={handlePasswordReset}
                loading={sendingReset}
                disabled={!resetEmail.trim() || sendingReset}
                style={styles.modalButton}
              >
                Send Reset Link
              </ModernButton>
            </View>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Email Confirmation Help */}
      <ModernCard variant="outlined" style={styles.helpCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Having Email Issues?</Text>
          <Text style={styles.sectionDescription}>
            If you're having trouble with email confirmation or password reset emails:
          </Text>

          <View style={styles.helpList}>
            <Text style={styles.helpItem}>• Check your spam/junk folder</Text>
            <Text style={styles.helpItem}>• Verify your email address is correct</Text>
            <Text style={styles.helpItem}>• Wait a few minutes for the email to arrive</Text>
            <Text style={styles.helpItem}>• Make sure you have internet connection</Text>
            <Text style={styles.helpItem}>• Try signing up again if no email arrives</Text>
          </View>

          <ModernButton
            onPress={handleOpenSupabaseSettings}
            variant="outline"
            style={styles.actionButton}
            fullWidth
          >
            Get Email Help
          </ModernButton>

          <Text style={styles.helpText}>
            💡 Email confirmation links expire after 24 hours for security.
          </Text>
        </ModernCardContent>
      </ModernCard>

      {/* Authentication Troubleshooting */}
      <ModernCard variant="outlined" style={styles.troubleshootCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Authentication Troubleshooting</Text>
          <Text style={styles.sectionDescription}>
            If you're experiencing signup or signin issues:
          </Text>

          <View style={styles.helpList}>
            <Text style={styles.helpItem}>• <Text style={styles.boldText}>No email received:</Text> Check spam folder, verify email address, wait 5-10 minutes</Text>
            <Text style={styles.helpItem}>• <Text style={styles.boldText}>Account creation failed:</Text> The email might already be registered - try signing in instead</Text>
            <Text style={styles.helpItem}>• <Text style={styles.boldText}>Database errors:</Text> Your account was created but user record setup failed - try signing in</Text>
            <Text style={styles.helpItem}>• <Text style={styles.boldText}>Email not confirmed:</Text> Click the confirmation link in your email before signing in</Text>
          </View>

          <Text style={styles.troubleshootNote}>
            🔧 <Text style={styles.boldText}>Technical Note:</Text> If you see "user record creation failed" errors, your authentication account was still created successfully. The app will automatically fix the user record when you sign in.
          </Text>

          <Text style={styles.helpText}>
            💡 Most authentication issues resolve themselves after email confirmation and first successful sign-in.
          </Text>
        </ModernCardContent>
      </ModernCard>

      {/* Danger Zone */}
      {isAuthenticated && (
        <ModernCard variant="outlined" style={styles.dangerCard}>
          <ModernCardContent>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <Text style={styles.dangerText}>
              ⚠️ The actions below are permanent and cannot be undone.
            </Text>
            <Text style={styles.sectionDescription}>
              Deleting your account will permanently remove all your data including expenses, goals, and reports.
            </Text>

            <ModernButton
              onPress={handleDeleteAccount}
              variant="error"
              loading={deleting}
              style={styles.actionButton}
              fullWidth
            >
              {deleting ? 'Deleting Account...' : 'Delete Account & All Data'}
            </ModernButton>

            <Text style={styles.helpText}>
              💡 Make sure to export your data first if you want to keep a backup.
            </Text>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Data Information */}
      <ModernCard variant="filled" style={styles.infoCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <Text style={styles.sectionDescription}>
            {isAuthenticated
              ? 'Your data is encrypted and stored securely in our cloud infrastructure. We never share your personal information with third parties.'
              : 'Your data is stored locally on your device and is not transmitted to our servers. Guest data automatically expires after 30 days for privacy.'
            }
          </Text>

          <Text style={styles.helpText}>
            💡 {isAuthenticated
              ? 'You can export your data at any time from the Data Management screen.'
              : 'Create an account to enable cloud backup and cross-device sync.'
            }
          </Text>
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
  upgradeCard: {
    borderColor: theme.colors.warning[300],
    backgroundColor: theme.colors.warning[50],
  },
  card: {
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  dangerCard: {
    borderColor: theme.colors.error[300],
    backgroundColor: theme.colors.error[50],
  },
  infoCard: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  sectionDescription: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
    marginBottom: theme.spacing.lg,
  },
  accountInfo: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  infoLabel: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  infoValue: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeights.semibold,
    flex: 1,
    textAlign: 'right',
  },
  authenticatedStatus: {
    color: theme.colors.success[600],
  },
  guestStatus: {
    color: theme.colors.warning[600],
  },
  upgradeText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.warning[700],
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.sm,
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
  dangerText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.error[700],
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.sm,
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
  helpText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalCard: {
    borderColor: theme.colors.primary[300],
    backgroundColor: theme.colors.primary[50],
    marginTop: theme.spacing.lg,
  },
  helpCard: {
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.neutral[50],
  },
  troubleshootCard: {
    borderColor: theme.colors.primary[300],
    backgroundColor: theme.colors.primary[50],
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    marginBottom: 0,
  },
  errorContainer: {
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.error[700],
    marginBottom: theme.spacing.sm,
  },
  clearErrorButton: {
    alignSelf: 'flex-start',
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  helpList: {
    marginBottom: theme.spacing.lg,
  },
  helpItem: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
  },
  boldText: {
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  troubleshootNote: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.primary[700],
    backgroundColor: theme.colors.primary[100],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.sm,
  },
});