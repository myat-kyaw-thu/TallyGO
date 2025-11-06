import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { WeeklyReportDetails } from '../components/goals/WeeklyReportDetails';
import { WeeklyReportsList } from '../components/goals/WeeklyReportsList';
import { ModernModal } from '../components/ui/modern-modal';
import { theme } from '../constants/theme';
import { useGoals } from '../hooks/useGoals';
import type { WeeklyReport } from '../types';

export const WeeklyReportsScreen: React.FC = () => {
  const {
    weeklyReports,
    loading,
    error,
    generateCurrentWeekReport,
    refreshGoals,
  } = useGoals();

  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshGoals();
    } catch (error) {
      console.error('Failed to refresh reports:', error);
      Alert.alert(
        'Refresh Failed',
        'Unable to refresh weekly reports. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [refreshGoals]);

  const handleGenerateReport = useCallback(async () => {
    try {
      const newReport = await generateCurrentWeekReport();

      Alert.alert(
        'Report Generated',
        'Your weekly report has been generated successfully!',
        [
          {
            text: 'View Report',
            onPress: () => {
              setSelectedReport(newReport);
              setShowReportDetails(true);
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Failed to generate report:', error);

      let errorMessage = 'Unable to generate weekly report. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('No goals')) {
          errorMessage = 'You need to set up some goal templates before generating a report.';
        } else if (error.message.includes('Invalid report data')) {
          errorMessage = 'There was an issue with your goal data. Please check your goal templates.';
        }
      }

      Alert.alert('Generation Failed', errorMessage, [{ text: 'OK' }]);
    }
  }, [generateCurrentWeekReport]);

  const handleReportPress = useCallback((report: WeeklyReport) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  }, []);

  const handleCloseReportDetails = useCallback(() => {
    setShowReportDetails(false);
    setSelectedReport(null);
  }, []);

  return (
    <View style={styles.container}>
      <WeeklyReportsList
        reports={weeklyReports}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        onGenerateReport={handleGenerateReport}
        onReportPress={handleReportPress}
        emptyStateTitle="No Weekly Reports Yet"
        emptyStateSubtitle="Weekly reports are automatically generated every Sunday at 11:30 PM. You can also generate one manually for the current week."
        showGenerateButton={true}
      />

      {/* Report Details Modal */}
      <ModernModal
        visible={showReportDetails}
        onClose={handleCloseReportDetails}
        style={styles.modal}
      >
        {selectedReport && (
          <WeeklyReportDetails report={selectedReport} />
        )}
      </ModernModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  modal: {
    width: '95%',
    maxHeight: '90%',
  },
});