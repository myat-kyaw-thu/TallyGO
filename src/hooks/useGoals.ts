import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { LocalStorageService } from '../services/storage';
import { SupabaseService } from '../services/supabase';
import { WeeklyReportService } from '../services/weeklyReportService';
import {
  type DailyGoalCompletion,
  type GoalTemplate,
  type SyncStatus,
  type UseGoalsReturn,
  type WeeklyReport
} from '../types';
import { getDayOfWeek } from '../utils/date';
import { handleAsyncError } from '../utils/errors';

/**
 * Goals hook for TallyGO
 * Manages goal templates, daily completions, and weekly reports
 */
export function useGoals(): UseGoalsReturn {
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
  const [completions, setCompletions] = useState<DailyGoalCompletion[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    last_sync: null,
    pending_changes: 0,
    sync_in_progress: false,
    error: null
  });

  const { user, isAuthenticated, isGuest } = useAuthContext();
  const supabaseService = SupabaseService.getInstance();

  // Filter today's goals based on current day of week and active status
  const todaysGoals = goalTemplates.filter(template =>
    template.is_active && template.day_of_week === getDayOfWeek()
  ).sort((a, b) => a.order_index - b.order_index);

  // Note: Local storage operations are now handled by LocalStorageService
  // This hook will use LocalStorageService methods for consistency

  /**
   * Generate a unique ID for local storage
   */
  const generateLocalId = useCallback(() => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
  }, []);

  /**
   * Load all goal data
   */
  const loadGoalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAuthenticated && supabaseService.isConfigured()) {
        // Load from Supabase
        const [templates, dailyCompletions, reports] = await Promise.all([
          supabaseService.getGoalTemplates(),
          supabaseService.getDailyCompletions(),
          supabaseService.getWeeklyReports()
        ]);

        setGoalTemplates(templates);
        setCompletions(dailyCompletions);
        setWeeklyReports(reports);
      } else if (isGuest) {
        // Load from local storage using LocalStorageService
        const [templates, dailyCompletions, reports] = await Promise.all([
          LocalStorageService.getGoalTemplates(),
          LocalStorageService.getDailyCompletions(),
          LocalStorageService.getWeeklyReports()
        ]);

        setGoalTemplates(templates);
        setCompletions(dailyCompletions);
        setWeeklyReports(reports);
      }
    } catch (err) {
      const appError = handleAsyncError(err, 'Load goal data');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isGuest, supabaseService]);

  /**
   * Add a new goal template
   */
  const addGoalTemplate = useCallback(async (templateData: Omit<GoalTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<GoalTemplate> => {
    try {
      setError(null);

      let newTemplate: GoalTemplate;

      if (isAuthenticated && supabaseService.isConfigured()) {
        // Save to Supabase
        if (!user) throw new Error('No user context available');
        newTemplate = await supabaseService.addGoalTemplate({
          ...templateData,
          user_id: user.id
        });
      } else if (isGuest && user) {
        // Save to local storage
        newTemplate = {
          ...templateData,
          id: generateLocalId(),
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const updatedTemplates = [...goalTemplates, newTemplate];
        await LocalStorageService.saveGoalTemplates(updatedTemplates);
      } else {
        throw new Error('No user context available');
      }

      setGoalTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (err) {
      const appError = handleAsyncError(err, 'Add goal template');
      setError(appError.message);
      throw appError;
    }
  }, [isAuthenticated, isGuest, user, supabaseService, goalTemplates, generateLocalId]);

  /**
   * Update an existing goal template
   */
  const updateGoalTemplate = useCallback(async (id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate> => {
    try {
      setError(null);

      let updatedTemplate: GoalTemplate;

      if (isAuthenticated && supabaseService.isConfigured()) {
        // Update in Supabase
        updatedTemplate = await supabaseService.updateGoalTemplate(id, updates);
      } else if (isGuest) {
        // Update in local storage
        const templateIndex = goalTemplates.findIndex(t => t.id === id);
        if (templateIndex === -1) {
          throw new Error('Goal template not found');
        }

        updatedTemplate = {
          ...goalTemplates[templateIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };

        const updatedTemplates = [...goalTemplates];
        updatedTemplates[templateIndex] = updatedTemplate;
        await LocalStorageService.saveGoalTemplates(updatedTemplates);
      } else {
        throw new Error('No user context available');
      }

      setGoalTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      return updatedTemplate;
    } catch (err) {
      const appError = handleAsyncError(err, 'Update goal template');
      setError(appError.message);
      throw appError;
    }
  }, [isAuthenticated, isGuest, supabaseService, goalTemplates]);

  /**
   * Delete a goal template
   */
  const deleteGoalTemplate = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      if (isAuthenticated && supabaseService.isConfigured()) {
        // Delete from Supabase
        await supabaseService.deleteGoalTemplate(id);
      } else if (isGuest) {
        // Delete from local storage using LocalStorageService (it handles related completions)
        await LocalStorageService.deleteGoalTemplate(id);

        // Update local state for completions
        const updatedCompletions = completions.filter(c => c.goal_template_id !== id);
        setCompletions(updatedCompletions);
      } else {
        throw new Error('No user context available');
      }

      setGoalTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const appError = handleAsyncError(err, 'Delete goal template');
      setError(appError.message);
      throw appError;
    }
  }, [isAuthenticated, isGuest, supabaseService, goalTemplates, completions]);

  /**
   * Toggle goal completion for a specific date
   */
  const toggleGoalCompletion = useCallback(async (templateId: string, date: string): Promise<void> => {
    try {
      setError(null);

      if (!user) {
        throw new Error('No user context available');
      }

      // Find existing completion
      const existingCompletion = completions.find(
        c => c.goal_template_id === templateId && c.completion_date === date
      );

      const newCompletionState = !existingCompletion?.is_completed;

      let updatedCompletion: DailyGoalCompletion;

      if (isAuthenticated && supabaseService.isConfigured()) {
        // Update in Supabase
        const completionData = {
          goal_template_id: templateId,
          completion_date: date,
          is_completed: newCompletionState,
          completed_at: newCompletionState ? new Date().toISOString() : null,
          user_id: user.id
        };

        updatedCompletion = await supabaseService.updateGoalCompletion(completionData);
      } else if (isGuest) {
        // Update in local storage
        if (existingCompletion) {
          updatedCompletion = {
            ...existingCompletion,
            is_completed: newCompletionState,
            completed_at: newCompletionState ? new Date().toISOString() : null
          };
        } else {
          updatedCompletion = {
            id: generateLocalId(),
            user_id: user.id,
            goal_template_id: templateId,
            completion_date: date,
            is_completed: newCompletionState,
            completed_at: newCompletionState ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          };
        }

        // Use LocalStorageService to handle the completion update
        updatedCompletion = await LocalStorageService.updateGoalCompletion({
          goal_template_id: templateId,
          completion_date: date,
          is_completed: newCompletionState,
          completed_at: newCompletionState ? new Date().toISOString() : null,
          user_id: user.id
        });
      } else {
        throw new Error('No user context available');
      }

      // Update local state
      setCompletions(prev => {
        if (existingCompletion) {
          return prev.map(c => c.id === existingCompletion.id ? updatedCompletion : c);
        } else {
          return [...prev, updatedCompletion];
        }
      });
    } catch (err) {
      const appError = handleAsyncError(err, 'Toggle goal completion');
      setError(appError.message);
      throw appError;
    }
  }, [isAuthenticated, isGuest, user, supabaseService, completions, generateLocalId]);

  /**
   * Get completion for a specific template and date
   */
  const getCompletionForDate = useCallback((templateId: string, date: string): DailyGoalCompletion | null => {
    return completions.find(
      c => c.goal_template_id === templateId && c.completion_date === date
    ) || null;
  }, [completions]);

  /**
   * Generate weekly report for a specific week
   */
  const generateWeeklyReport = useCallback(async (weekStartDate: string): Promise<WeeklyReport> => {
    try {
      setError(null);

      if (!user) {
        throw new Error('No user context available');
      }

      // Validate report data
      const validation = WeeklyReportService.validateReportData(user.id, goalTemplates, weekStartDate);
      if (!validation.isValid) {
        throw new Error(`Invalid report data: ${validation.errors.join(', ')}`);
      }

      // Get completions for the specific week
      const weekCompletions = WeeklyReportService.getWeekCompletions(completions, weekStartDate);

      // Create report using the service
      const reportData = WeeklyReportService.createWeeklyReport(
        user.id,
        goalTemplates,
        weekCompletions,
        weekStartDate
      );

      let newReport: WeeklyReport;

      if (isAuthenticated && supabaseService.isConfigured()) {
        // Save to Supabase
        newReport = await supabaseService.addWeeklyReport(reportData);
      } else if (isGuest) {
        // Save to local storage
        newReport = await LocalStorageService.addWeeklyReport(reportData);
      } else {
        throw new Error('No user context available');
      }

      setWeeklyReports(prev => {
        // Replace existing report for the same week or add new one
        const existingIndex = prev.findIndex(
          report => report.week_start_date === weekStartDate && report.user_id === user.id
        );

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newReport;
          return updated;
        } else {
          return [...prev, newReport];
        }
      });

      return newReport;
    } catch (err) {
      const appError = handleAsyncError(err, 'Generate weekly report');
      setError(appError.message);
      throw appError;
    }
  }, [user, isAuthenticated, isGuest, supabaseService, completions, goalTemplates]);

  /**
   * Generate weekly report for current week
   */
  const generateCurrentWeekReport = useCallback(async (): Promise<WeeklyReport> => {
    const currentWeekStart = WeeklyReportService.getCurrentWeekStart();
    return generateWeeklyReport(currentWeekStart);
  }, [generateWeeklyReport]);

  /**
   * Generate weekly report for previous week
   */
  const generatePreviousWeekReport = useCallback(async (): Promise<WeeklyReport> => {
    const previousWeekStart = WeeklyReportService.getPreviousWeekStart();
    return generateWeeklyReport(previousWeekStart);
  }, [generateWeeklyReport]);

  /**
   * Check if weekly report exists for a specific week
   */
  const getWeeklyReportForWeek = useCallback((weekStartDate: string): WeeklyReport | null => {
    return weeklyReports.find(
      report => report.week_start_date === weekStartDate && report.user_id === user?.id
    ) || null;
  }, [weeklyReports, user]);

  /**
   * Refresh all goal data
   */
  const refreshGoals = useCallback(async () => {
    await loadGoalData();
  }, [loadGoalData]);

  // Load initial data when user context changes
  useEffect(() => {
    if (user) {
      loadGoalData();
    }
  }, [user, loadGoalData]);

  return {
    goalTemplates,
    todaysGoals,
    completions,
    weeklyReports,
    loading,
    error,
    addGoalTemplate,
    updateGoalTemplate,
    deleteGoalTemplate,
    toggleGoalCompletion,
    getCompletionForDate,
    generateWeeklyReport,
    generateCurrentWeekReport,
    generatePreviousWeekReport,
    getWeeklyReportForWeek,
    refreshGoals,
    syncStatus
  };
}