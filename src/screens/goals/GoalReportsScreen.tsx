import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ModernCard, ModernCardContent } from '../../components/ui/modern-card';
import { theme } from '../../constants/theme';
import { useGoals } from '../../hooks/useGoals';
import type { GoalsStackParamList } from '../../types/navigation';

type GoalReportsScreenNavigationProp = StackNavigationProp<GoalsStackParamList, 'Reports'>;
type GoalReportsScreenRouteProp = RouteProp<GoalsStackParamList, 'Reports'>;

interface GoalReportsScreenProps {
  navigation: GoalReportsScreenNavigationProp;
  route: GoalReportsScreenRouteProp;
}

export function GoalReportsScreen({ navigation }: GoalReportsScreenProps) {
  const { weeklyReports, loading } = useGoals();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  if (weeklyReports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ModernCard variant="outlined" style={styles.emptyCard}>
          <ModernCardContent style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptyText}>
              Weekly reports will be generated automatically every Sunday at 11:30 PM.
              Complete some goals to see your first report!
            </Text>
          </ModernCardContent>
        </ModernCard>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Weekly Reports</Text>

      {weeklyReports.map((report) => (
        <ModernCard key={report.id} variant="outlined" style={styles.reportCard}>
          <ModernCardContent>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>
                Week of {new Date(report.week_start_date).toLocaleDateString()}
              </Text>
              <Text style={styles.overallRate}>
                {report.report_data.overall_completion_rate}% Complete
              </Text>
            </View>

            <View style={styles.goalsContainer}>
              {report.report_data.goals.map((goal, index) => (
                <View key={index} style={styles.goalRow}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalStats}>
                    {goal.completions}/{goal.total_days} ({goal.completion_rate}%)
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.generatedAt}>
              Generated: {new Date(report.generated_at).toLocaleDateString()}
            </Text>
          </ModernCardContent>
        </ModernCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  loadingText: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.lg,
  },
  emptyCard: {
    maxWidth: 300,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.relaxed,
  },
  title: {
    fontSize: theme.typography.fontSizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  reportCard: {
    borderColor: theme.colors.neutral[200],
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  reportTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  overallRate: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.success[600],
  },
  goalsContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  goalTitle: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  goalStats: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  generatedAt: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    fontStyle: 'italic',
  },
});