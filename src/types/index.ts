// ============================================================================
// Core User and Authentication Types
// ============================================================================

export interface User {
  id: string;
  email?: string;
  isGuest: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Enhanced Expense Types (extending existing)
// ============================================================================

export interface Expense {
  id: string;
  user_id?: string;
  content: string;
  price: number;
  date: string; // YYYY-MM-DD format
  created_at: string;
  updated_at?: string;
  synced?: boolean;
  sync_error?: string;
}

// ============================================================================
// Goal System Types
// ============================================================================

export interface GoalTemplate {
  id: string;
  user_id: string;
  title: string;
  day_of_week: number; // 1-7, Monday=1
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyGoalCompletion {
  id: string;
  user_id: string;
  goal_template_id: string;
  completion_date: string; // YYYY-MM-DD
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start_date: string; // Monday YYYY-MM-DD
  report_data: {
    goals: Array<{
      template_id: string;
      title: string;
      completions: number;
      total_days: number;
      completion_rate: number;
    }>;
    overall_completion_rate: number;
  };
  generated_at: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncStatus {
  last_sync: string | null;
  pending_changes: number;
  sync_in_progress: boolean;
  error: string | null;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ErrorRecoveryStrategy {
  retry: () => Promise<void>;
  fallback: () => Promise<void>;
  userAction: string;
  canRecover: boolean;
}

export interface TaskErrorHandler {
  onPermissionDenied: () => void;
  onSchedulingFailed: (error: Error) => void;
  onExecutionFailed: (taskId: string, error: Error) => void;
}

// ============================================================================
// Service Interface Types
// ============================================================================

export interface StorageServiceInterface {
  // Expense operations
  getExpenses(): Promise<Expense[]>;
  addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  // Goal operations
  getGoalTemplates(): Promise<GoalTemplate[]>;
  addGoalTemplate(template: Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<GoalTemplate>;
  updateGoalTemplate(id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate>;
  deleteGoalTemplate(id: string): Promise<void>;

  // Goal completion operations
  getDailyCompletions(date?: string): Promise<DailyGoalCompletion[]>;
  updateGoalCompletion(completion: Omit<DailyGoalCompletion, 'id' | 'created_at'>): Promise<DailyGoalCompletion>;

  // Weekly reports
  getWeeklyReports(): Promise<WeeklyReport[]>;
  addWeeklyReport(report: Omit<WeeklyReport, 'id' | 'generated_at'>): Promise<WeeklyReport>;

  // Utility operations
  clearAllData(): Promise<void>;
  getExpiryInfo(): Promise<{ expiryDate: Date | null; daysRemaining: number | null; }>;
}

export interface SupabaseServiceInterface {
  // Authentication
  signUp(email: string, password: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  refreshSession(): Promise<User | null>;
  deleteAccount(): Promise<void>;

  // Data operations (same as StorageServiceInterface for consistency)
  getExpenses(): Promise<Expense[]>;
  addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  getGoalTemplates(): Promise<GoalTemplate[]>;
  addGoalTemplate(template: Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<GoalTemplate>;
  updateGoalTemplate(id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate>;
  deleteGoalTemplate(id: string): Promise<void>;

  getDailyCompletions(date?: string): Promise<DailyGoalCompletion[]>;
  updateGoalCompletion(completion: Omit<DailyGoalCompletion, 'id' | 'created_at'>): Promise<DailyGoalCompletion>;

  getWeeklyReports(): Promise<WeeklyReport[]>;
  addWeeklyReport(report: Omit<WeeklyReport, 'id' | 'generated_at'>): Promise<WeeklyReport>;


}

export interface SyncServiceInterface {
  // Sync operations
  syncExpenses(): Promise<void>;
  syncGoalTemplates(): Promise<void>;
  syncGoalCompletions(): Promise<void>;
  syncWeeklyReports(): Promise<void>;
  syncAll(): Promise<void>;

  // Queue management
  queueOperation(operation: SyncOperation): Promise<void>;
  processQueue(): Promise<void>;
  clearQueue(): Promise<void>;

  // Status monitoring
  getSyncStatus(): Promise<SyncStatus>;
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void;
}

export interface NotificationServiceInterface {
  // Permission management
  requestPermissions(): Promise<boolean>;
  checkPermissions(): Promise<boolean>;

  // Notification scheduling
  scheduleDailyGoalCheck(): Promise<void>;
  scheduleWeeklyReport(): Promise<void>;
  cancelAllNotifications(): Promise<void>;

  // Notification handling
  onNotificationReceived(callback: (notification: AppNotification) => void): () => void;
  onNotificationOpened(callback: (notification: AppNotification) => void): () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type FilterPeriod = "day" | "week" | "month";

export interface DateWithExpenses {
  date: string;
  expenses: Expense[];
  total: number;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'goal_template' | 'goal_completion' | 'weekly_report';
  data: any;
  timestamp: string;
  retries: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: string;
}

export interface ExpiryInfo {
  expiryDate: Date | null;
  daysRemaining: number | null;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Expenses: undefined;
  Goals: undefined;
  Settings: undefined;
};

export type GoalsStackParamList = {
  Dashboard: undefined;
  Templates: undefined;
  Reports: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  Account: undefined;
  DataManagement: undefined;
};

// ============================================================================
// Component Props Types
// ============================================================================

export interface ExpenseFormProps {
  onSubmit: (expense: { content: string; price: number; date: string; }) => Promise<void>;
  onCancel: () => void;
  initialDate?: string;
}

export interface GoalTemplateFormProps {
  template?: GoalTemplate;
  onSubmit: (template: Omit<GoalTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export interface WeeklyReportProps {
  report: WeeklyReport;
  onViewDetails?: () => void;
}

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  showDetails?: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  addExpense: (expense: { content: string; price: number; date: string; }) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  getFilteredExpenses: (filter: FilterPeriod) => Expense[];
  getTotalAmount: (expenses: Expense[]) => number;
  getExpensesForDate: (date: string) => Expense[];
  getDatesWithTotals: () => DateWithExpenses[];
  getMasterTotal: () => number;
  clearAllData: () => Promise<void>;
  getExpiryInfo: () => Promise<ExpiryInfo>;
  refreshExpenses: () => Promise<void>;
  syncStatus: SyncStatus;
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchToGuest: () => Promise<void>;
  upgradeToAuthenticated: (email: string, password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  showAuthScreens: () => void;
  confirmEmail: (email: string, code: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  clearError: () => void;
}

export interface UseGoalsReturn {
  goalTemplates: GoalTemplate[];
  todaysGoals: GoalTemplate[];
  completions: DailyGoalCompletion[];
  weeklyReports: WeeklyReport[];
  loading: boolean;
  error: string | null;
  addGoalTemplate: (template: Omit<GoalTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<GoalTemplate>;
  updateGoalTemplate: (id: string, updates: Partial<GoalTemplate>) => Promise<GoalTemplate>;
  deleteGoalTemplate: (id: string) => Promise<void>;
  toggleGoalCompletion: (templateId: string, date: string) => Promise<void>;
  getCompletionForDate: (templateId: string, date: string) => DailyGoalCompletion | null;
  generateWeeklyReport: (weekStartDate: string) => Promise<WeeklyReport>;
  generateCurrentWeekReport: () => Promise<WeeklyReport>;
  generatePreviousWeekReport: () => Promise<WeeklyReport>;
  getWeeklyReportForWeek: (weekStartDate: string) => WeeklyReport | null;
  refreshGoals: () => Promise<void>;
  syncStatus: SyncStatus;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  expiryDays: number;
  notificationTimes: {
    dailyCheck: string; // "23:30"
    weeklyReport: string; // "23:30"
  };
  syncInterval: number; // milliseconds
  maxRetries: number;
}

// ============================================================================
// ============================================================================
// Re-exports and Utilities
// ============================================================================

// Re-export utilities for convenience
export * from '../constants/config';
export * from '../utils/date';
export * from '../utils/errors';
export * from '../utils/helpers';
export * from '../utils/validation';

// Re-export navigation types
export * from './navigation';

// Re-export the existing Expense type from storage service for compatibility
export type { Expense as StorageExpense } from '../services/storage';



