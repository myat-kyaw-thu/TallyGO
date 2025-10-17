import AsyncStorage from '@react-native-async-storage/async-storage';

// Import enhanced types
import {
  STORAGE_KEYS,
  type DailyGoalCompletion,
  type Expense,
  type ExpiryInfo,
  type GoalTemplate,
  type StorageServiceInterface,
  type WeeklyReport
} from '../types';

// Legacy type for backward compatibility
export interface LegacyExpense {
  id: string;
  content: string;
  price: number;
  date: string; // YYYY-MM-DD format
  created_at: string;
}

// Re-export for backward compatibility
export type { Expense };

// Auto-expiry: 30 days for guest users
const EXPIRY_DAYS = 30;

export class LocalStorageService implements StorageServiceInterface {
  private static instance: LocalStorageService;

  private constructor() { }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // Instance methods that delegate to static methods
  async getExpenses(): Promise<Expense[]> {
    return LocalStorageService.getExpenses();
  }

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    return LocalStorageService.addExpense(expense);
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    return LocalStorageService.updateExpense(id, updates);
  }

  async deleteExpense(id: string): Promise<void> {
    return LocalStorageService.deleteExpense(id);
  }

  async getGoalTemplates(): Promise<GoalTemplate[]> {
    return LocalStorageService.getGoalTemplates();
  }

  async addGoalTemplate(template: Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<GoalTemplate> {
    return LocalStorageService.addGoalTemplate(template);
  }

  async updateGoalTemplate(id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate> {
    return LocalStorageService.updateGoalTemplate(id, updates);
  }

  async deleteGoalTemplate(id: string): Promise<void> {
    return LocalStorageService.deleteGoalTemplate(id);
  }

  async getDailyCompletions(date?: string): Promise<DailyGoalCompletion[]> {
    return LocalStorageService.getDailyCompletions(date);
  }

  async updateGoalCompletion(completion: Omit<DailyGoalCompletion, 'id' | 'created_at'>): Promise<DailyGoalCompletion> {
    return LocalStorageService.updateGoalCompletion(completion);
  }

  async getWeeklyReports(): Promise<WeeklyReport[]> {
    return LocalStorageService.getWeeklyReports();
  }

  async addWeeklyReport(report: Omit<WeeklyReport, 'id' | 'generated_at'>): Promise<WeeklyReport> {
    return LocalStorageService.addWeeklyReport(report);
  }

  async clearAllData(): Promise<void> {
    return LocalStorageService.clearAllData();
  }

  async getExpiryInfo(): Promise<{ expiryDate: Date | null; daysRemaining: number | null; }> {
    return LocalStorageService.getExpiryInfo();
  }
  // Check if data has expired
  static async isDataExpired(): Promise<boolean> {
    try {
      const expiryDate = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (!expiryDate) return false;

      const expiry = new Date(expiryDate);
      const now = new Date();
      return now > expiry;
    } catch (error) {
      console.error('Error checking expiry:', error);
      return false;
    }
  }

  // Set expiry date when first data is stored
  static async setExpiryDate(): Promise<void> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);
      await AsyncStorage.setItem(STORAGE_KEYS.EXPIRY, expiryDate.toISOString());
    } catch (error) {
      console.error('Error setting expiry date:', error);
    }
  }

  // Get all expenses
  static async getExpenses(): Promise<Expense[]> {
    try {
      // Check if data has expired
      const isExpired = await this.isDataExpired();
      if (isExpired) {
        await this.clearAllData();
        return [];
      }

      const expensesJson = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (!expensesJson) return [];

      return JSON.parse(expensesJson);
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  // Save all expenses
  static async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

      // Set expiry date if this is the first save
      const existingExpiry = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (!existingExpiry) {
        await this.setExpiryDate();
      }
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  }

  // Add a new expense
  static async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    try {
      const expenses = await this.getExpenses();

      const newExpense: Expense = {
        ...expense,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
      };

      expenses.push(newExpense);
      await this.saveExpenses(expenses);

      return newExpense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  // Get expenses for a specific date
  static async getExpensesForDate(date: string): Promise<Expense[]> {
    try {
      const expenses = await this.getExpenses();
      return expenses.filter(expense => expense.date === date);
    } catch (error) {
      console.error('Error getting expenses for date:', error);
      return [];
    }
  }

  // Get expenses filtered by period
  static async getExpensesByPeriod(period: 'day' | 'week' | 'month'): Promise<Expense[]> {
    try {
      const expenses = await this.getExpenses();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      return expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);

        switch (period) {
          case 'day':
            return expenseDate.getTime() === today.getTime();

          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return expenseDate >= weekStart && expenseDate <= weekEnd;

          case 'month':
            return expenseDate.getMonth() === today.getMonth() &&
              expenseDate.getFullYear() === today.getFullYear();

          default:
            return true;
        }
      });
    } catch (error) {
      console.error('Error getting expenses by period:', error);
      return [];
    }
  }

  // Calculate total for expenses
  static calculateTotal(expenses: Expense[]): number {
    return expenses.reduce((sum, expense) => sum + expense.price, 0);
  }

  // Clear all data (for expiry or reset)
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.GOAL_TEMPLATES,
        STORAGE_KEYS.GOAL_COMPLETIONS,
        STORAGE_KEYS.WEEKLY_REPORTS,
        STORAGE_KEYS.EXPIRY
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  // Get data expiry info
  static async getExpiryInfo(): Promise<ExpiryInfo> {
    try {
      const expiryDateStr = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (!expiryDateStr) return { expiryDate: null, daysRemaining: null };

      const expiryDate = new Date(expiryDateStr);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return { expiryDate, daysRemaining: Math.max(0, daysRemaining) };
    } catch (error) {
      console.error('Error getting expiry info:', error);
      return { expiryDate: null, daysRemaining: null };
    }
  }

  // ============================================================================
  // GOAL TEMPLATE OPERATIONS
  // ============================================================================

  // Get all goal templates
  static async getGoalTemplates(): Promise<GoalTemplate[]> {
    try {
      // Check if data has expired
      const isExpired = await this.isDataExpired();
      if (isExpired) {
        await this.clearAllData();
        return [];
      }

      const templatesJson = await AsyncStorage.getItem(STORAGE_KEYS.GOAL_TEMPLATES);
      if (!templatesJson) return [];

      return JSON.parse(templatesJson);
    } catch (error) {
      console.error('Error getting goal templates:', error);
      return [];
    }
  }

  // Save all goal templates
  static async saveGoalTemplates(templates: GoalTemplate[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOAL_TEMPLATES, JSON.stringify(templates));

      // Set expiry date if this is the first save
      const existingExpiry = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (!existingExpiry) {
        await this.setExpiryDate();
      }
    } catch (error) {
      console.error('Error saving goal templates:', error);
      throw error;
    }
  }

  // Add a new goal template
  static async addGoalTemplate(template: Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<GoalTemplate> {
    try {
      const templates = await this.getGoalTemplates();

      const newTemplate: GoalTemplate = {
        ...template,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      templates.push(newTemplate);
      await this.saveGoalTemplates(templates);

      return newTemplate;
    } catch (error) {
      console.error('Error adding goal template:', error);
      throw error;
    }
  }

  // Update an existing goal template
  static async updateGoalTemplate(id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate> {
    try {
      const templates = await this.getGoalTemplates();
      const templateIndex = templates.findIndex(t => t.id === id);

      if (templateIndex === -1) {
        throw new Error('Goal template not found');
      }

      const updatedTemplate: GoalTemplate = {
        ...templates[templateIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      templates[templateIndex] = updatedTemplate;
      await this.saveGoalTemplates(templates);

      return updatedTemplate;
    } catch (error) {
      console.error('Error updating goal template:', error);
      throw error;
    }
  }

  // Delete a goal template
  static async deleteGoalTemplate(id: string): Promise<void> {
    try {
      const templates = await this.getGoalTemplates();
      const filteredTemplates = templates.filter(t => t.id !== id);

      await this.saveGoalTemplates(filteredTemplates);

      // Also remove related completions
      const completions = await this.getDailyCompletions();
      const filteredCompletions = completions.filter(c => c.goal_template_id !== id);
      await this.saveDailyCompletions(filteredCompletions);
    } catch (error) {
      console.error('Error deleting goal template:', error);
      throw error;
    }
  }

  // Get goal templates for a specific day of week
  static async getGoalTemplatesForDay(dayOfWeek: number): Promise<GoalTemplate[]> {
    try {
      const templates = await this.getGoalTemplates();
      return templates
        .filter(template => template.is_active && template.day_of_week === dayOfWeek)
        .sort((a, b) => a.order_index - b.order_index);
    } catch (error) {
      console.error('Error getting goal templates for day:', error);
      return [];
    }
  }

  // ============================================================================
  // DAILY GOAL COMPLETION OPERATIONS
  // ============================================================================

  // Get daily completions (optionally filtered by date)
  static async getDailyCompletions(date?: string): Promise<DailyGoalCompletion[]> {
    try {
      // Check if data has expired
      const isExpired = await this.isDataExpired();
      if (isExpired) {
        await this.clearAllData();
        return [];
      }

      const completionsJson = await AsyncStorage.getItem(STORAGE_KEYS.GOAL_COMPLETIONS);
      if (!completionsJson) return [];

      const completions: DailyGoalCompletion[] = JSON.parse(completionsJson);

      if (date) {
        return completions.filter(completion => completion.completion_date === date);
      }

      return completions;
    } catch (error) {
      console.error('Error getting daily completions:', error);
      return [];
    }
  }

  // Save all daily completions
  static async saveDailyCompletions(completions: DailyGoalCompletion[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOAL_COMPLETIONS, JSON.stringify(completions));

      // Set expiry date if this is the first save
      const existingExpiry = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (!existingExpiry) {
        await this.setExpiryDate();
      }
    } catch (error) {
      console.error('Error saving daily completions:', error);
      throw error;
    }
  }

  // Update or create a goal completion
  static async updateGoalCompletion(completion: Omit<DailyGoalCompletion, 'id' | 'created_at'>): Promise<DailyGoalCompletion> {
    try {
      const completions = await this.getDailyCompletions();

      // Find existing completion for this template and date
      const existingIndex = completions.findIndex(
        c => c.goal_template_id === completion.goal_template_id &&
          c.completion_date === completion.completion_date
      );

      let updatedCompletion: DailyGoalCompletion;

      if (existingIndex !== -1) {
        // Update existing completion
        updatedCompletion = {
          ...completions[existingIndex],
          ...completion,
        };
        completions[existingIndex] = updatedCompletion;
      } else {
        // Create new completion
        updatedCompletion = {
          ...completion,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
          created_at: new Date().toISOString(),
        };
        completions.push(updatedCompletion);
      }

      await this.saveDailyCompletions(completions);
      return updatedCompletion;
    } catch (error) {
      console.error('Error updating goal completion:', error);
      throw error;
    }
  }

  // Get completion for a specific template and date
  static async getCompletionForDate(templateId: string, date: string): Promise<DailyGoalCompletion | null> {
    try {
      const completions = await this.getDailyCompletions(date);
      return completions.find(c => c.goal_template_id === templateId) || null;
    } catch (error) {
      console.error('Error getting completion for date:', error);
      return null;
    }
  }

  // Get completions for a date range
  static async getCompletionsForDateRange(startDate: string, endDate: string): Promise<DailyGoalCompletion[]> {
    try {
      const completions = await this.getDailyCompletions();
      return completions.filter(completion => {
        const completionDate = completion.completion_date;
        return completionDate >= startDate && completionDate <= endDate;
      });
    } catch (error) {
      console.error('Error getting completions for date range:', error);
      return [];
    }
  }

  // ============================================================================
  // WEEKLY REPORT OPERATIONS
  // ============================================================================

  // Get all weekly reports
  static async getWeeklyReports(): Promise<WeeklyReport[]> {
    try {
      // Check if data has expired
      const isExpired = await this.isDataExpired();
      if (isExpired) {
        await this.clearAllData();
        return [];
      }

      const reportsJson = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_REPORTS);
      if (!reportsJson) return [];

      return JSON.parse(reportsJson);
    } catch (error) {
      console.error('Error getting weekly reports:', error);
      return [];
    }
  }

  // Save all weekly reports
  static async saveWeeklyReports(reports: WeeklyReport[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_REPORTS, JSON.stringify(reports));

      // Set expiry date if this is the first save
      const existingExpiry = await AsyncStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (!existingExpiry) {
        await this.setExpiryDate();
      }
    } catch (error) {
      console.error('Error saving weekly reports:', error);
      throw error;
    }
  }

  // Add a new weekly report
  static async addWeeklyReport(report: Omit<WeeklyReport, 'id' | 'generated_at'>): Promise<WeeklyReport> {
    try {
      const reports = await this.getWeeklyReports();

      // Check if report already exists for this week
      const existingReportIndex = reports.findIndex(
        r => r.week_start_date === report.week_start_date && r.user_id === report.user_id
      );

      const newReport: WeeklyReport = {
        ...report,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        generated_at: new Date().toISOString(),
      };

      if (existingReportIndex !== -1) {
        // Replace existing report
        reports[existingReportIndex] = newReport;
      } else {
        // Add new report
        reports.push(newReport);
      }

      await this.saveWeeklyReports(reports);
      return newReport;
    } catch (error) {
      console.error('Error adding weekly report:', error);
      throw error;
    }
  }

  // Get weekly report for a specific week
  static async getWeeklyReportForWeek(weekStartDate: string, userId: string): Promise<WeeklyReport | null> {
    try {
      const reports = await this.getWeeklyReports();
      return reports.find(r => r.week_start_date === weekStartDate && r.user_id === userId) || null;
    } catch (error) {
      console.error('Error getting weekly report for week:', error);
      return null;
    }
  }

  // ============================================================================
  // DATA CLEANUP AND EXPIRY HANDLING
  // ============================================================================

  // Clean up old data based on expiry rules
  static async cleanupExpiredData(): Promise<void> {
    try {
      const isExpired = await this.isDataExpired();
      if (isExpired) {
        await this.clearAllData();
        return;
      }

      // Clean up old completions (keep only last 90 days)
      const completions = await this.getDailyCompletions();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

      const recentCompletions = completions.filter(
        completion => completion.completion_date >= cutoffDate
      );

      if (recentCompletions.length !== completions.length) {
        await this.saveDailyCompletions(recentCompletions);
      }

      // Clean up old weekly reports (keep only last 52 weeks)
      const reports = await this.getWeeklyReports();
      const fiftyTwoWeeksAgo = new Date();
      fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - (52 * 7));
      const reportCutoffDate = fiftyTwoWeeksAgo.toISOString().split('T')[0];

      const recentReports = reports.filter(
        report => report.week_start_date >= reportCutoffDate
      );

      if (recentReports.length !== reports.length) {
        await this.saveWeeklyReports(recentReports);
      }
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }

  // ============================================================================
  // DATA EXPORT FUNCTIONALITY
  // ============================================================================

  // Export all goal data as JSON
  static async exportGoalData(): Promise<{
    goalTemplates: GoalTemplate[];
    dailyCompletions: DailyGoalCompletion[];
    weeklyReports: WeeklyReport[];
    exportedAt: string;
  }> {
    try {
      const [goalTemplates, dailyCompletions, weeklyReports] = await Promise.all([
        this.getGoalTemplates(),
        this.getDailyCompletions(),
        this.getWeeklyReports()
      ]);

      return {
        goalTemplates,
        dailyCompletions,
        weeklyReports,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting goal data:', error);
      throw error;
    }
  }

  // Export all data (expenses + goals) as JSON
  static async exportAllData(): Promise<{
    expenses: Expense[];
    goalTemplates: GoalTemplate[];
    dailyCompletions: DailyGoalCompletion[];
    weeklyReports: WeeklyReport[];
    expiryInfo: ExpiryInfo;
    exportedAt: string;
  }> {
    try {
      const [expenses, goalData, expiryInfo] = await Promise.all([
        this.getExpenses(),
        this.exportGoalData(),
        this.getExpiryInfo()
      ]);

      return {
        expenses,
        ...goalData,
        expiryInfo,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting all data:', error);
      throw error;
    }
  }

  // ============================================================================
  // MISSING EXPENSE OPERATIONS (to complete StorageServiceInterface)
  // ============================================================================

  // Update an existing expense
  static async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      const expenses = await this.getExpenses();
      const expenseIndex = expenses.findIndex(e => e.id === id);

      if (expenseIndex === -1) {
        throw new Error('Expense not found');
      }

      const updatedExpense: Expense = {
        ...expenses[expenseIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      expenses[expenseIndex] = updatedExpense;
      await this.saveExpenses(expenses);

      return updatedExpense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Delete an expense
  static async deleteExpense(id: string): Promise<void> {
    try {
      const expenses = await this.getExpenses();
      const filteredExpenses = expenses.filter(e => e.id !== id);
      await this.saveExpenses(filteredExpenses);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }
}
