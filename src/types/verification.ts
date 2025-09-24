/**
 * Type verification file to ensure all interfaces work correctly
 * This file is used for development and testing purposes only
 */

import type {
  AppError,
  AuthState,
  DailyGoalCompletion,
  Expense,
  GoalTemplate,

  StorageServiceInterface,
  SupabaseServiceInterface,
  SyncStatus,
  UseAuthReturn,
  UseExpensesReturn,
  UseGoalsReturn,
  User,
  WeeklyReport
} from './index';

// Test User interface
const testUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  isGuest: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Test AuthState interface
const testAuthState: AuthState = {
  user: testUser,
  isAuthenticated: true,
  isGuest: false,
  loading: false,
  error: null
};

// Test Expense interface
const testExpense: Expense = {
  id: 'expense-1',
  user_id: 'user-1',
  content: 'Coffee',
  price: 5.50,
  date: '2024-01-01',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  synced: true,
  sync_error: undefined
};

// Test GoalTemplate interface
const testGoalTemplate: GoalTemplate = {
  id: 'goal-1',
  user_id: 'user-1',
  title: 'Exercise',
  day_of_week: 1, // Monday
  order_index: 0,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Test DailyGoalCompletion interface
const testCompletion: DailyGoalCompletion = {
  id: 'completion-1',
  user_id: 'user-1',
  goal_template_id: 'goal-1',
  completion_date: '2024-01-01',
  is_completed: true,
  completed_at: '2024-01-01T10:00:00Z',
  created_at: '2024-01-01T00:00:00Z'
};

// Test WeeklyReport interface
const testWeeklyReport: WeeklyReport = {
  id: 'report-1',
  user_id: 'user-1',
  week_start_date: '2024-01-01',
  report_data: {
    goals: [
      {
        template_id: 'goal-1',
        title: 'Exercise',
        completions: 5,
        total_days: 7,
        completion_rate: 0.71
      }
    ],
    overall_completion_rate: 0.71
  },
  generated_at: '2024-01-07T23:30:00Z'
};

// Test SyncStatus interface
const testSyncStatus: SyncStatus = {
  last_sync: '2024-01-01T12:00:00Z',
  pending_changes: 0,
  sync_in_progress: false,
  error: null
};



// Test AppError interface
const testAppError: AppError = {
  code: 'NETWORK_ERROR',
  message: 'Failed to connect to server',
  details: { statusCode: 500 },
  timestamp: '2024-01-01T00:00:00Z'
};

// Verify that all interfaces are properly typed
export function verifyTypes(): void {
  // This function exists to ensure TypeScript compilation succeeds
  // If any of the above type assignments are incorrect, TypeScript will error
  console.log('All types verified successfully!');

  // Test that interfaces can be used in function signatures
  const mockStorageService: Partial<StorageServiceInterface> = {
    getExpenses: async () => [testExpense],
    addExpense: async (expense) => ({ ...expense, id: 'new-id', created_at: new Date().toISOString() } as Expense)
  };

  const mockSupabaseService: Partial<SupabaseServiceInterface> = {
    signIn: async (email, password) => testUser,
    getExpenses: async () => [testExpense]
  };

  // Test hook return types
  const mockUseExpensesReturn: Partial<UseExpensesReturn> = {
    expenses: [testExpense],
    loading: false,
    error: null,
    syncStatus: testSyncStatus
  };

  const mockUseAuthReturn: Partial<UseAuthReturn> = {
    user: testUser,
    isAuthenticated: true,
    isGuest: false,
    loading: false,
    error: null
  };

  const mockUseGoalsReturn: Partial<UseGoalsReturn> = {
    goalTemplates: [testGoalTemplate],
    todaysGoals: [testGoalTemplate],
    completions: [testCompletion],
    weeklyReports: [testWeeklyReport],
    loading: false,
    error: null,
    syncStatus: testSyncStatus
  };

  // Suppress unused variable warnings
  void mockStorageService;
  void mockSupabaseService;
  void mockUseExpensesReturn;
  void mockUseAuthReturn;
  void mockUseGoalsReturn;
}