import { ModernInput } from '@/components/ui';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import type { EmailConfirmationScreenProps } from '../../types/navigation';

export function EmailConfirmationScreen({ navigation, route }: EmailConfirmationScreenProps) {
  const { email: initialEmail } = route.params || {};
  const [email, setEmail] = useState(initialEmail || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password'>(() => {
    // Check if we're in password reset mode (coming from deep link)
    if (typeof window !== 'undefined') {
      const isPasswordReset = localStorage.getItem('password_reset_active') === 'true';
      if (isPasswordReset) {
        localStorage.removeItem('password_reset_active'); // Clear the flag
        return 'password';
      }
    }
    return 'email';
  });
  const [loading, setLoading] = useState(false);

  const { resetPassword, updatePassword, error, clearError } = useAuth();
  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      clearError();
      await resetPassword(email.trim());

      Alert.alert(
        'Reset Email Sent',
        'Please check your email and click the reset link to continue.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Failed to send reset email';
      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      clearError();
      await updatePassword(newPassword);

      Alert.alert(
        'Password Updated',
        'Your password has been successfully updated.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Failed to update password';
      Alert.alert('Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = () => {
    if (newPassword.length === 0) return { strength: 0, label: '', color: theme.colors.neutral[400] };
    if (newPassword.length < 6) return { strength: 1, label: 'Weak', color: theme.colors.error[500] };
    if (newPassword.length < 8) return { strength: 2, label: 'Fair', color: theme.colors.warning[500] };
    return { strength: 3, label: 'Strong', color: theme.colors.success[500] };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>�</Text>
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'Enter your email to receive a password reset link'
              : 'Enter your new password'
            }
          </Text>
        </View>

        {step === 'email' ? (
          /* Email Step */
          <ModernCard variant="outlined" style={styles.formCard}>
            <ModernCardContent style={styles.formContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <ModernInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  disabled={loading}
                  style={styles.input}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <ModernButton
                onPress={handleSendResetEmail}
                loading={loading}
                disabled={loading || !email.trim() || !isValidEmail(email)}
                style={styles.confirmButton}
                fullWidth
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </ModernButton>
            </ModernCardContent>
          </ModernCard>
        ) : (
          /* Password Step */
          <ModernCard variant="outlined" style={styles.formCard}>
            <ModernCardContent style={styles.formContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <ModernInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password (min. 6 characters)"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  disabled={loading}
                  style={styles.input}
                />
                {newPassword.length > 0 && (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: `${(passwordStrength.strength / 3) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <ModernInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  disabled={loading}
                  style={styles.input}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <ModernButton
                onPress={handleUpdatePassword}
                loading={loading}
                disabled={loading || !newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword || newPassword.length < 6}
                style={styles.confirmButton}
                fullWidth
              >
                {loading ? 'Updating...' : 'Update Password'}
              </ModernButton>
            </ModernCardContent>
          </ModernCard>
        )}

        {/* Back to Login */}
        <View style={styles.backSection}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <ModernButton
            onPress={handleBackToLogin}
            variant="secondary"
            disabled={loading}
            style={styles.backButton}
            fullWidth
          >
            Back to Sign In
          </ModernButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  headerIconText: {
    fontSize: 32,
  },
  title: {
    fontSize: theme.typography.fontSizes['3xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.medium,
  },
  formCard: {
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  formContent: {
    paddingVertical: theme.spacing.xxl,
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
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
  passwordStrength: {
    marginTop: theme.spacing.sm,
  },
  strengthBar: {
    height: 4,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  strengthFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  strengthLabel: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorIcon: {
    fontSize: theme.typography.fontSizes.lg,
    marginRight: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.error[700],
    fontWeight: theme.typography.fontWeights.medium,
  },
  confirmButton: {
    marginTop: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  backSection: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.neutral[300],
  },
  dividerText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    marginHorizontal: theme.spacing.lg,
    fontWeight: theme.typography.fontWeights.medium,
  },
  backButton: {
    ...theme.shadows.sm,
  },
});