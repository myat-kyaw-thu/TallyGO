import { useAuthContext } from '@/contexts/AuthContext';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { ModernButton } from '../../components/ui/modern-button';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { theme } from '../../constants/theme';
import { useExpenses } from '../../hooks/useExpenses';
import { LocalStorageService } from '../../services/storage';
import type { DataManagementScreenProps } from '../../types/navigation';
import { useBackgroundTasks } from '@/hooks/useBackgroundTasks';

export function DataManagementScreen({ navigation }: DataManagementScreenProps) {
  const { user, isGuest } = useAuthContext();
  const { clearAllData: clearExpenseData, getExpiryInfo } = useExpenses();
  const { status: notificationStatus, requestPermissions, cancelAllNotifications } = useBackgroundTasks();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportData = useCallback(async () => {
    try {
      setExporting(true);

      // Export all data from LocalStorageService
      const exportData = await LocalStorageService.exportAllData();

      // Create a formatted JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `tallygo-export-${timestamp}.json`;

      // Share the data
      await Share.share({
        message: jsonString,
        title: `TallyGO Data Export - ${timestamp}`,
      });

      Alert.alert(
        'Export Complete',
        `Your data has been exported successfully. The export includes ${exportData.expenses.length} expenses, ${exportData.goalTemplates.length} goal templates, and ${exportData.weeklyReports.length} weekly reports.`
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        'Failed to export your data. Please try again.'
      );
    } finally {
      setExporting(false);
    }
  }, []);

  const handleClearAllData = useCallback(async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your expenses, goals, and reports. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await clearExpenseData();
              Alert.alert(
                'Data Cleared',
                'All your data has been permanently deleted.'
              );
              navigation.goBack();
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert(
                'Clear Failed',
                'Failed to clear your data. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [clearExpenseData, navigation]);

  const handleViewExpiryInfo = useCallback(async () => {
    try {
      const expiryInfo = await getExpiryInfo();

      if (expiryInfo.expiryDate && expiryInfo.daysRemaining !== null) {
        const expiryDate = expiryInfo.expiryDate.toLocaleDateString();
        const message = expiryInfo.daysRemaining > 0
          ? `Your guest data will expire on ${expiryDate} (${expiryInfo.daysRemaining} days remaining).`
          : 'Your guest data has expired and will be cleaned up automatically.';

        Alert.alert('Data Expiry Information', message);
      } else {
        Alert.alert(
          'Data Expiry Information',
          'No expiry information available. This usually means you\'re using an authenticated account with permanent data storage.'
        );
      }
    } catch (error) {
      console.error('Expiry info error:', error);
      Alert.alert(
        'Error',
        'Failed to get expiry information. Please try again.'
      );
    }
  }, [getExpiryInfo]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Data Export */}
      <ModernCard variant="outlined" style={styles.card}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <Text style={styles.sectionDescription}>
            Export all your data as a JSON file. This includes expenses, goal templates, completions, and weekly reports.
          </Text>

          <ModernButton
            onPress={handleExportData}
            loading={exporting}
            style={styles.actionButton}
            fullWidth
          >
            {exporting ? 'Exporting...' : 'Export All Data'}
          </ModernButton>

          <Text style={styles.helpText}>
            💡 The exported file can be shared via email, saved to cloud storage, or used as a backup.
          </Text>
        </ModernCardContent>
      </ModernCard>

      {/* Data Expiry (Guest Users Only) */}
      {isGuest && (
        <ModernCard variant="outlined" style={styles.warningCard}>
          <ModernCardContent>
            <Text style={styles.sectionTitle}>Data Expiry</Text>
            <Text style={styles.warningText}>
              ⚠️ Guest data expires after 30 days and will be automatically deleted.
            </Text>
            <Text style={styles.sectionDescription}>
              Create an account to keep your data permanently and sync across devices.
            </Text>

            <ModernButton
              onPress={handleViewExpiryInfo}
              variant="secondary"
              style={styles.actionButton}
              fullWidth
            >
              Check Expiry Date
            </ModernButton>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Notification Settings */}
      <ModernCard variant="outlined" style={styles.card}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          <Text style={styles.sectionDescription}>
            Manage notification permissions and background task settings for goal reminders and weekly reports.
          </Text>

          <View style={styles.notificationStatus}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Permissions:</Text>
              <Text style={[styles.statusValue, notificationStatus.permissionsGranted ? styles.statusSuccess : styles.statusError]}>
                {notificationStatus.permissionsGranted ? '✅ Granted' : '❌ Denied'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Daily Reminders:</Text>
              <Text style={[styles.statusValue, notificationStatus.dailyGoalCheckScheduled ? styles.statusSuccess : styles.statusError]}>
                {notificationStatus.dailyGoalCheckScheduled ? '✅ Active' : '❌ Inactive'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Weekly Reports:</Text>
              <Text style={[styles.statusValue, notificationStatus.weeklyReportScheduled ? styles.statusSuccess : styles.statusError]}>
                {notificationStatus.weeklyReportScheduled ? '✅ Active' : '❌ Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.notificationButtons}>
            {!notificationStatus.permissionsGranted && (
              <ModernButton
                onPress={async () => {
                  const granted = await requestPermissions();
                  if (!granted) {
                    Alert.alert(
                      'Permissions Required',
                      'To enable goal reminders and weekly reports, please allow notifications in your device settings.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                      ]
                    );
                  }
                }}
                style={styles.actionButton}
                fullWidth
              >
                Enable Notifications
              </ModernButton>
            )}

            <ModernButton
              onPress={() => Linking.openSettings()}
              variant="secondary"
              style={styles.actionButton}
              fullWidth
            >
              Open Device Settings
            </ModernButton>

            <ModernButton
              onPress={async () => {
                await cancelAllNotifications();
                Alert.alert('Notifications Cancelled', 'All scheduled notifications have been cancelled.');
              }}
              variant="ghost"
              style={styles.actionButton}
              fullWidth
            >
              Cancel All Notifications
            </ModernButton>
          </View>

          <Text style={styles.helpText}>
            💡 Notifications help you stay on track with daily goal checks at 11:30 PM and weekly progress reports.
          </Text>
        </ModernCardContent>
      </ModernCard>

      {/* Clear All Data */}
      <ModernCard variant="outlined" style={styles.dangerCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Clear All Data</Text>
          <Text style={styles.dangerText}>
            ⚠️ This will permanently delete all your data including expenses, goals, and reports.
          </Text>
          <Text style={styles.sectionDescription}>
            This action cannot be undone. Make sure to export your data first if you want to keep it.
          </Text>

          <ModernButton
            onPress={handleClearAllData}
            variant="error"
            loading={loading}
            style={styles.actionButton}
            fullWidth
          >
            {loading ? 'Clearing...' : 'Clear All Data'}
          </ModernButton>
        </ModernCardContent>
      </ModernCard>

      {/* Data Information */}
      <ModernCard variant="filled" style={styles.infoCard}>
        <ModernCardContent>
          <Text style={styles.sectionTitle}>Data Storage Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage Type:</Text>
            <Text style={styles.infoValue}>
              {isGuest ? 'Local Device Storage' : 'Cloud Storage (Supabase)'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{user?.id || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Type:</Text>
            <Text style={styles.infoValue}>
              {isGuest ? 'Guest (Temporary)' : 'Authenticated (Permanent)'}
            </Text>
          </View>

          <Text style={styles.helpText}>
            💡 {isGuest
              ? 'Guest data is stored locally and expires after 30 days. Create an account to keep your data permanently.'
              : 'Your data is securely stored in the cloud and synced across all your devices.'
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
  card: {
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  warningCard: {
    borderColor: theme.colors.warning[300],
    backgroundColor: theme.colors.warning[50],
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
    marginBottom: theme.spacing.sm,
  },
  sectionDescription: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.fontSizes.base,
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.warning[700],
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.sm,
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
  notificationStatus: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  statusValue: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  statusSuccess: {
    color: theme.colors.success[600],
  },
  statusError: {
    color: theme.colors.error[600],
  },
  notificationButtons: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
});