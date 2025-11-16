import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { ModernInput } from '../../components/ui/modern-input';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import type { SignUpScreenProps } from '../../types/navigation';

export function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp, upgradeToAuthenticated, isGuest, error, clearError } = useAuth();

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      clearError();

      if (isGuest) {
        // Upgrade guest user to authenticated
        await upgradeToAuthenticated(email.trim(), password);
      } else {
        // Create new account
        await signUp(email.trim(), password);
      }

      // Show success message and navigate back
      Alert.alert(
        'Account Created!',
        'Please check your email and click the confirmation link to complete your account setup.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Please try again';
      if (errorMessage.includes('Authentication service is not available')) {
        Alert.alert(
          'Service Unavailable',
          'Authentication service is currently not available. You can continue as a guest user.',
          [
            { text: 'Continue as Guest', onPress: handleGuestMode },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Sign Up Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const handleGuestMode = () => {
    navigation.navigate('Main');
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = () => {
    return email.trim() &&
      password.trim() &&
      confirmPassword.trim() &&
      password === confirmPassword &&
      password.length >= 6 &&
      isValidEmail(email);
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '', color: theme.colors.neutral[400] };
    if (password.length < 6) return { strength: 1, label: 'Weak', color: theme.colors.error[500] };
    if (password.length < 8) return { strength: 2, label: 'Fair', color: theme.colors.warning[500] };
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
            <Text style={styles.headerIconText}>🚀</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {isGuest
              ? 'Upgrade your guest account to sync across devices'
              : 'Join TallyGO to sync your data across devices'
            }
          </Text>
        </View>

        {/* Fresh Start Notice for Guest Users */}
        {isGuest && (
          <ModernCard variant="filled" style={styles.freshStartCard}>
            <ModernCardContent style={styles.freshStartContent}>
              <View style={styles.freshStartIcon}>
                <Text style={styles.freshStartIconText}>✨</Text>
              </View>
              <View style={styles.freshStartTextContainer}>
                <Text style={styles.freshStartTitle}>Fresh Start</Text>
                <Text style={styles.freshStartText}>
                  You'll start with a clean account. Your guest data will be cleared.
                </Text>
              </View>
            </ModernCardContent>
          </ModernCard>
        )}

        {/* Sign Up Form */}
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <ModernInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min. 6 characters)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                disabled={loading}
                style={styles.input}
              />
              {password.length > 0 && (
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
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <ModernInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                disabled={loading}
                style={styles.input}
              />
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <View style={styles.requirement}>
                <Text style={[
                  styles.requirementIcon,
                  password.length >= 6 ? styles.requirementMet : styles.requirementUnmet
                ]}>
                  {password.length >= 6 ? '✓' : '○'}
                </Text>
                <Text style={[
                  styles.requirementText,
                  password.length >= 6 ? styles.requirementMet : styles.requirementUnmet
                ]}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.requirement}>
                <Text style={[
                  styles.requirementIcon,
                  password && confirmPassword && password === confirmPassword
                    ? styles.requirementMet
                    : styles.requirementUnmet
                ]}>
                  {password && confirmPassword && password === confirmPassword ? '✓' : '○'}
                </Text>
                <Text style={[
                  styles.requirementText,
                  password && confirmPassword && password === confirmPassword
                    ? styles.requirementMet
                    : styles.requirementUnmet
                ]}>
                  Passwords match
                </Text>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <ModernButton
              onPress={handleSignUp}
              loading={loading}
              disabled={loading || !isFormValid()}
              style={styles.signUpButton}
              fullWidth
            >
              {loading
                ? (isGuest ? 'Upgrading Account...' : 'Creating Account...')
                : (isGuest ? 'Upgrade Account' : 'Create Account')
              }
            </ModernButton>
          </ModernCardContent>
        </ModernCard>

        {/* Alternative Actions */}
        <View style={styles.alternativeActions}>
          <Text style={styles.alternativeText}>Already have an account?</Text>
          <ModernButton
            onPress={handleSignIn}
            variant="secondary"
            disabled={loading}
            style={styles.alternativeButton}
            fullWidth
          >
            Sign In
          </ModernButton>
        </View>

        {/* Guest Mode Option (only if not already guest) */}
        {!isGuest && (
          <View style={styles.guestSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <ModernButton
              onPress={handleGuestMode}
              variant="ghost"
              disabled={loading}
              style={styles.guestButton}
              fullWidth
            >
              Continue as Guest
            </ModernButton>
          </View>
        )}
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
    marginBottom: theme.spacing.xl,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.success[100],
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
  freshStartCard: {
    backgroundColor: theme.colors.accent[50],
    borderColor: theme.colors.accent[200],
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  freshStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  freshStartIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  freshStartIconText: {
    fontSize: 24,
  },
  freshStartTextContainer: {
    flex: 1,
  },
  freshStartTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  freshStartText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
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
  requirementsContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  requirementsTitle: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  requirementIcon: {
    fontSize: theme.typography.fontSizes.sm,
    marginRight: theme.spacing.sm,
    width: 16,
  },
  requirementText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  requirementMet: {
    color: theme.colors.success[600],
  },
  requirementUnmet: {
    color: theme.colors.text.tertiary,
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
  signUpButton: {
    marginTop: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  alternativeActions: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  alternativeText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    fontWeight: theme.typography.fontWeights.medium,
  },
  alternativeButton: {
    ...theme.shadows.sm,
  },
  guestSection: {
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
  guestButton: {
    borderColor: theme.colors.neutral[300],
  },
});