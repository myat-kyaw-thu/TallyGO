import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { ModernInput } from '../../components/ui/modern-input';
import { theme } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import type { LoginScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, error, clearError } = useAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      clearError();
      await signIn(email.trim(), password);
      // Navigation will be handled automatically by AppNavigator
    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Please check your credentials and try again';
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
        Alert.alert('Sign In Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleForgotPassword = () => {
    navigation.navigate('EmailConfirmation', { email });
  };

  const handleGuestMode = () => {
    navigation.navigate('Main');
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
            <Text style={styles.headerIconText}>👋</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to sync your data across devices</Text>
        </View>

        {/* Sign In Form */}
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
                placeholder="Enter your password"
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
              onPress={handleSignIn}
              loading={loading}
              disabled={loading || !email.trim() || !password.trim()}
              style={styles.signInButton}
              fullWidth
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </ModernButton>

            {/* Forgot Password Link */}
            <ModernButton
              onPress={handleForgotPassword}
              variant="ghost"
              disabled={loading}
              style={styles.forgotPasswordButton}
              fullWidth
            >
              Forgot Password?
            </ModernButton>
          </ModernCardContent>
        </ModernCard>

        {/* Alternative Actions */}
        <View style={styles.alternativeActions}>
          <Text style={styles.alternativeText}>Don't have an account?</Text>
          <ModernButton
            onPress={handleSignUp}
            variant="secondary"
            disabled={loading}
            style={styles.alternativeButton}
            fullWidth
          >
            Create Account
          </ModernButton>
        </View>

        {/* Guest Mode Option */}
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
  signInButton: {
    marginTop: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  forgotPasswordButton: {
    marginTop: theme.spacing.md,
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