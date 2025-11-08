import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { GoalTemplateForm } from '../../components/goals/GoalTemplateForm';
import { GoalTemplateList } from '../../components/goals/GoalTemplateList';
import { useGoals } from '../../hooks/useGoals';
import type { GoalTemplate } from '../../types';
import type { GoalsStackParamList } from '../../types/navigation';

type GoalTemplatesScreenNavigationProp = StackNavigationProp<GoalsStackParamList, 'Templates'>;
type GoalTemplatesScreenRouteProp = RouteProp<GoalsStackParamList, 'Templates'>;

interface GoalTemplatesScreenProps {
  navigation: GoalTemplatesScreenNavigationProp;
  route: GoalTemplatesScreenRouteProp;
}

export function GoalTemplatesScreen({ navigation }: GoalTemplatesScreenProps) {
  const {
    goalTemplates,
    loading,
    addGoalTemplate,
    updateGoalTemplate,
    deleteGoalTemplate,
    refreshGoals,
  } = useGoals();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GoalTemplate | null>(null);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template: GoalTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSubmit = async (templateData: Omit<GoalTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingTemplate) {
        await updateGoalTemplate(editingTemplate.id, templateData);
      } else {
        await addGoalTemplate(templateData);
      }
      setShowForm(false);
      setEditingTemplate(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save goal template');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteGoalTemplate(templateId);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete goal template');
    }
  };

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    try {
      await updateGoalTemplate(templateId, { is_active: isActive });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update goal template');
    }
  };

  const handleReorder = async (templateId: string, newOrderIndex: number) => {
    try {
      await updateGoalTemplate(templateId, { order_index: newOrderIndex });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reorder goal template');
    }
  };

  if (showForm) {
    return (
      <GoalTemplateForm
        template={editingTemplate || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GoalTemplateList
        templates={goalTemplates}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onReorder={handleReorder}
        onRefresh={refreshGoals}
        onCreateNew={handleCreateNew}
      />
    </View>
  );
}