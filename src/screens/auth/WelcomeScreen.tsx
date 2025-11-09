import React, { useState } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { theme } from '../../constants/theme';
import { useAuthContext } from '../../contexts/AuthContext';
import type { WelcomeScreenProps } from '../../types/navigation';

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { switchToGuest, loading, error } = useAuthContext();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestMode = async () => {
    try {
      setGuestLoading(true);
      await switchToGuest();
      // Navigation will happen automatically via AppNavigator when user state changes
    } catch (err) {
      console.error('Failed to switch to guest mode:', err);
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/favicon.png')} style={styles.logo} />
          <View style={styles.logoGlow} />
        </View>
        <Text style={styles.title}>TallyGO</Text>
        <Text style={styles.subtitle}>Track expenses & achieve goals</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <ModernCard variant="filled" style={styles.welcomeCard}>
          <ModernCardContent style={styles.cardContent}>
            <Text style={styles.welcomeTitle}>Welcome to TallyGO</Text>
            <Text style={styles.welcomeText}>
              Choose how you'd like to use the app. You can always upgrade later.
            </Text>
          </ModernCardContent>
        </ModernCard>

        {/* Error Display */}
        {error && (
          <ModernCard variant="outlined" style={styles.errorCard}>
            <ModernCardContent style={styles.errorContent}>
              <Text style={styles.errorText}>{error}</Text>
            </ModernCardContent>
          </ModernCard>
        )}

        {/* Guest Mode Option */}
        <ModernCard variant="outlined" style={styles.optionCard}>
          <ModernCardContent style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.optionIcon}>📱</Text>
              </View>
              <Text style={styles.optionTitle}>Continue as Guest</Text>
            </View>
            <Text style={styles.optionDescription}>
              • Data stored locally on your device{'\n'}
              • No account required{'\n'}
              • Data expires after 30 days{'\n'}
              • Perfect for trying out the app
            </Text>
            <ModernButton
              onPress={handleGuestMode}
              variant="secondary"
              style={styles.optionButton}
              fullWidth
              loading={guestLoading || loading}
              disabled={guestLoading || loading}
            >
              Continue as Guest
            </ModernButton>
          </ModernCardContent>
        </ModernCard>

        {/* Authentication Option */}
        <ModernCard variant="outlined" style={styles.optionCard}>
          <ModernCardContent style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.optionIcon}>☁️</Text>
              </View>
              <Text style={styles.optionTitle}>Create Account</Text>
            </View>
            <Text style={styles.optionDescription}>
              • Sync across all your devices{'\n'}
              • Data backed up securely{'\n'}
              • Never lose your information{'\n'}
              • Full feature access
            </Text>
            <View style={styles.authButtons}>
              <ModernButton
                onPress={handleSignUp}
                style={styles.authButtonPrimary}
                size="sm"
              >
                Sign Up
              </ModernButton>
              <ModernButton
                onPress={handleSignIn}
                variant="secondary"
                style={styles.authButtonSecondary}
                size="sm"
              >
                Sign In
              </ModernButton>
            </View>
          </ModernCardContent>
        </ModernCard>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our terms of service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[100],
    opacity: 0.3,
    zIndex: -1,
  },
  title: {
    fontSize: theme.typography.fontSizes['4xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  welcomeCard: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[100],
    ...theme.shadows.sm,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  welcomeTitle: {
    fontSize: theme.typography.fontSizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  welcomeText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.medium,
  },
  optionCard: {
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.sm,
  },
  optionContent: {
    paddingVertical: theme.spacing.xl,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  optionDescription: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
    marginBottom: theme.spacing.xl,
    fontWeight: theme.typography.fontWeights.medium,
  },
  optionButton: {
    marginTop: theme.spacing.sm,
  },
  authButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  authButtonPrimary: {
    flex: 1,
  },
  authButtonSecondary: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.medium,
  },
  errorCard: {
    borderColor: theme.colors.error[300],
    backgroundColor: theme.colors.error[50],
  },
  errorContent: {
    paddingVertical: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.error[700],
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.medium,
  },
});