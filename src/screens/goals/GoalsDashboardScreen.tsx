import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { View } from 'react-native';
import { GoalsDashboard } from '../../components/goals/GoalsDashboard';
import { useGoals } from '../../hooks/useGoals';
import type { GoalsStackParamList } from '../../types/navigation';

type GoalsDashboardScreenNavigationProp = StackNavigationProp<GoalsStackParamList, 'Dashboard'>;
type GoalsDashboardScreenRouteProp = RouteProp<GoalsStackParamList, 'Dashboard'>;

interface GoalsDashboardScreenProps {
  navigation: GoalsDashboardScreenNavigationProp;
  route: GoalsDashboardScreenRouteProp;
}

export function GoalsDashboardScreen({ navigation }: GoalsDashboardScreenProps) {
  const {
    todaysGoals,
    completions,
    toggleGoalCompletion,
    refreshGoals,
  } = useGoals();

  const handleToggleCompletion = async (templateId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await toggleGoalCompletion(templateId, today);
    } catch (error) {
      console.error('Error toggling goal completion:', error);
    }
  };

  const handleManageTemplates = () => {
    navigation.navigate('Templates');
  };

  const handleViewReports = () => {
    navigation.navigate('Reports');
  };

  return (
    <View style={{ flex: 1 }}>
      <GoalsDashboard
        todaysGoals={todaysGoals}
        completions={completions}
        onToggleCompletion={handleToggleCompletion}
        onRefresh={refreshGoals}
        onManageTemplates={handleManageTemplates}
        onViewReports={handleViewReports}
      />
    </View>
  );
}