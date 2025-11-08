import React from 'react';
import { View } from 'react-native';
import { ExpenseTracker } from '../../components/expense/ExpenseTracker';
import type { ExpensesTabProps } from '../../types/navigation';

export function ExpensesScreen({ navigation, route }: ExpensesTabProps) {
  return (
    <View style={{ flex: 1 }}>
      <ExpenseTracker />
    </View>
  );
}