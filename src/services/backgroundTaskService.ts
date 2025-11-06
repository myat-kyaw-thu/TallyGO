import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import type { DailyGoalCompletion, GoalTemplate, WeeklyReport } from '../types';
import { handleAsyncError } from '../utils/errors';
import { notificationService } from './notificationService';
import { LocalStorageService } from './storage';
import { SupabaseService } from './supabase';
import { WeeklyReportService } from './weeklyReportService';

// Background task identifiers
const WEEKLY_REPORT_TASK = 'weekly-report-generation';
const DAILY_GOAL_CHECK_TASK = 'daily-goal-check';

/**
 * Background Task Service
 * Handles automatic weekly report generation and daily goal check notifications
 */
export class BackgroundTaskService {
  private static instance: BackgroundTaskService;
  private supabaseService = SupabaseService.getInstance();

  private constructor() {
    this.registerBackgroundTasks();
  }

  public static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  /**
   * Register background tasks with TaskManager
   */
  private registerBackgroundTasks(): void {
    // Skip background task registration on web platform
    if (Platform.OS === 'web') {
      console.log('Background tasks not supported on web platform');
      return;
    }

    // Register weekly report generation task
    TaskManager.defineTask(WEEKLY_REPORT_TASK, async () => {
      try {
        console.log('Background task: Weekly report generation started');
        await this.generateWeeklyReportBackground();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Weekly report background task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register daily goal check task
    TaskManager.defineTask(DAILY_GOAL_CHECK_TASK, async () => {
      try {
        console.log('Background task: Daily goal check started');
        await this.sendDailyGoalCheckNotification();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Daily goal check background task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Initialize background tasks and notifications
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize notification service
      await notificationService.initialize();

      // Skip background fetch registration on web
      if (Platform.OS !== 'web') {
        await this.registerBackgroundFetch();
      }

      console.log('Background tasks initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background tasks:', error);
    }
  }

  /**
   * Get notification service status
   */
  public async getNotificationStatus() {
    return await notificationService.getNotificationStatus();
  }

  /**
   * Manually trigger daily goal check (for testing or manual use)
   */
  public async triggerDailyGoalCheck(): Promise<void> {
    await this.sendDailyGoalCheckNotification();
  }

  /**
   * Manually trigger weekly report generation (for testing or manual use)
   */
  public async triggerWeeklyReport(): Promise<void> {
    await this.generateWeeklyReportBackground();
  }

  /**
   * Generate weekly report in background with enhanced automation
   */
  private async generateWeeklyReportBackground(): Promise<void> {
    try {
      console.log('Starting weekly report generation...');

      // Get current user from storage or auth
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.log('No user found for weekly report generation');
        return;
      }

      // Determine which week to generate report for
      const now = new Date();
      const isReportTime = WeeklyReportService.isWeeklyReportTime();

      // If it's exactly report time (Sunday 11:30 PM), generate for the week that just ended
      // Otherwise, this might be a manual trigger, so generate for the current week
      const weekStartDate = isReportTime
        ? WeeklyReportService.getPreviousWeekStart()
        : WeeklyReportService.getCurrentWeekStart();

      console.log(`Generating report for week starting: ${weekStartDate}`);

      // Check if report already exists for this week
      const existingReport = await this.getExistingWeeklyReport(currentUser.id, weekStartDate);
      if (existingReport) {
        console.log('Weekly report already exists for this week');

        // Still send notification if it's report time and we haven't notified yet
        if (isReportTime) {
          const summary = WeeklyReportService.generateReportSummary(existingReport.report_data);
          await this.sendWeeklyReportNotification(summary);
        }
        return;
      }

      // Load goal data
      const [goalTemplates, completions] = await this.loadGoalData(currentUser.isGuest);

      // Validate data before generating report
      const validation = WeeklyReportService.validateReportData(
        currentUser.id,
        goalTemplates,
        weekStartDate
      );

      if (!validation.isValid) {
        console.error('Invalid report data:', validation.errors);
        return;
      }

      // Filter completions for the specific week
      const weekCompletions = WeeklyReportService.getWeekCompletions(completions, weekStartDate);

      // Generate report
      const reportData = WeeklyReportService.createWeeklyReport(
        currentUser.id,
        goalTemplates,
        weekCompletions,
        weekStartDate
      );

      // Save report
      let savedReport: WeeklyReport;
      try {
        if (currentUser.isGuest) {
          savedReport = await LocalStorageService.addWeeklyReport(reportData);
        } else {
          savedReport = await this.supabaseService.addWeeklyReport(reportData);
        }
      } catch (saveError) {
        console.error('Failed to save weekly report:', saveError);
        throw saveError;
      }

      // Generate and send notification with report summary
      const summary = WeeklyReportService.generateReportSummary(savedReport.report_data);
      await this.sendWeeklyReportNotification(summary);

      console.log('Weekly report generated successfully:', {
        reportId: savedReport.id,
        weekStart: weekStartDate,
        overallCompletion: Math.round(savedReport.report_data.overall_completion_rate * 100),
        goalsCount: savedReport.report_data.goals.length
      });

    } catch (error) {
      const appError = handleAsyncError(error, 'Generate weekly report background');
      console.error('Weekly report generation failed:', appError.message);

      // Send error notification if this was an automatic generation
      if (WeeklyReportService.isWeeklyReportTime()) {
        try {
          await notificationService.sendImmediateNotification({
            title: 'Weekly Report Error 📊',
            body: 'Failed to generate your weekly report. Please try again manually.',
            data: {
              type: 'weekly_report_error',
              error: appError.message,
              timestamp: new Date().toISOString()
            }
          });
        } catch (notificationError) {
          console.error('Failed to send error notification:', notificationError);
        }
      }
    }
  }

  /**
   * Send daily goal check notification with enhanced logic
   */
  private async sendDailyGoalCheckNotification(): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.log('No user found for daily goal check');
        return;
      }

      // Get today's goals and completions
      const [goalTemplates, completions] = await this.loadGoalData(currentUser.isGuest);
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Convert Sunday from 0 to 7

      const todaysGoals = goalTemplates.filter(
        (template: GoalTemplate) => template.is_active && template.day_of_week === dayOfWeek
      );

      if (todaysGoals.length === 0) {
        // Send encouragement to set up goals
        await notificationService.sendImmediateNotification({
          title: 'No Goals for Today 🎯',
          body: 'Consider setting up some goals to track your progress!',
          data: {
            type: 'daily_goal_check',
            no_goals: true,
            date: todayString
          }
        });
        return;
      }

      // Check completion status
      const completedGoals = todaysGoals.filter((goal: GoalTemplate) => {
        const completion = completions.find(
          (c: DailyGoalCompletion) => c.goal_template_id === goal.id &&
            c.completion_date === todayString &&
            c.is_completed
        );
        return !!completion;
      });

      const completionRate = completedGoals.length / todaysGoals.length;
      let title: string;
      let body: string;
      let emoji: string;

      // Generate personalized notification content
      if (completionRate === 1) {
        title = 'Perfect Day! 🎉';
        body = `Amazing! All ${todaysGoals.length} goals completed today!`;
        emoji = '🎉';
      } else if (completionRate >= 0.8) {
        title = 'Great Progress! 🌟';
        body = `Excellent work! ${completedGoals.length}/${todaysGoals.length} goals completed.`;
        emoji = '🌟';
      } else if (completionRate >= 0.5) {
        title = 'Good Progress! 👍';
        body = `You're doing well! ${completedGoals.length}/${todaysGoals.length} goals completed.`;
        emoji = '👍';
      } else if (completionRate > 0) {
        title = 'Keep Going! 💪';
        body = `${completedGoals.length}/${todaysGoals.length} goals completed. You can still catch up!`;
        emoji = '💪';
      } else {
        title = 'Daily Check-in 🎯';
        body = `${todaysGoals.length} goals waiting for you today. You've got this!`;
        emoji = '🎯';
      }

      // Send the notification
      await notificationService.sendImmediateNotification({
        title: title,
        body: body,
        data: {
          type: 'daily_goal_check',
          completion_rate: completionRate,
          completed: completedGoals.length,
          total: todaysGoals.length,
          date: todayString,
          goals: todaysGoals.map((g: GoalTemplate) => ({
            id: g.id,
            title: g.title,
            completed: completedGoals.some((cg: GoalTemplate) => cg.id === g.id)
          }))
        }
      });

      console.log(`Daily goal check notification sent: ${completedGoals.length}/${todaysGoals.length} completed`);
    } catch (error) {
      console.error('Failed to send daily goal check notification:', error);
    }
  }

  /**
   * Send weekly report notification
   */
  private async sendWeeklyReportNotification(summary: string): Promise<void> {
    try {
      await notificationService.sendImmediateNotification({
        title: 'Weekly Report Ready! 📊',
        body: summary,
        data: {
          type: 'weekly_report_generated',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to send weekly report notification:', error);
    }
  }

  /**
   * Get current user from auth or storage
   */
  private async getCurrentUser(): Promise<{ id: string; isGuest: boolean; } | null> {
    try {
      // Try to get authenticated user first
      if (this.supabaseService.isConfigured()) {
        const user = await this.supabaseService.getCurrentUser();
        if (user) {
          return { id: user.id, isGuest: false };
        }
      }

      // Check for guest user in local storage
      // This is a simplified check - in a real implementation, you'd have a proper way to track guest users
      const expenses = await LocalStorageService.getExpenses();
      const goalTemplates = await LocalStorageService.getGoalTemplates();

      if (expenses.length > 0 || goalTemplates.length > 0) {
        // Assume guest user exists
        return { id: 'guest_user', isGuest: true };
      }

      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Load goal data based on user type
   */
  private async loadGoalData(isGuest: boolean): Promise<[any[], any[]]> {
    if (isGuest) {
      return Promise.all([
        LocalStorageService.getGoalTemplates(),
        LocalStorageService.getDailyCompletions()
      ]);
    } else {
      return Promise.all([
        this.supabaseService.getGoalTemplates(),
        this.supabaseService.getDailyCompletions()
      ]);
    }
  }

  /**
   * Check if weekly report already exists
   */
  private async getExistingWeeklyReport(userId: string, weekStartDate: string): Promise<WeeklyReport | null> {
    try {
      // For guest users, check local storage
      if (userId === 'guest_user') {
        return await LocalStorageService.getWeeklyReportForWeek(weekStartDate, userId);
      } else {
        // For authenticated users, check Supabase
        return await this.supabaseService.getWeeklyReport(weekStartDate);
      }
    } catch (error) {
      console.error('Failed to check existing weekly report:', error);
      return null;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await notificationService.cancelAllNotifications();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Register background fetch task
   */
  public async registerBackgroundFetch(): Promise<void> {
    try {
      // Skip on web platform
      if (Platform.OS === 'web') {
        console.log('Background fetch not supported on web platform');
        return;
      }

      // Use the newer API if available, fallback to older one
      if (typeof BackgroundFetch.registerTaskAsync === 'function') {
        await BackgroundFetch.registerTaskAsync(WEEKLY_REPORT_TASK, {
          minimumInterval: 24 * 60 * 60 * 1000, // 24 hours
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('Background fetch registered');
      } else {
        console.warn('BackgroundFetch.registerTaskAsync not available');
      }
    } catch (error) {
      console.error('Failed to register background fetch:', error);
    }
  }

  /**
   * Unregister background fetch task
   */
  public async unregisterBackgroundFetch(): Promise<void> {
    try {
      if (typeof BackgroundFetch.unregisterTaskAsync === 'function') {
        await BackgroundFetch.unregisterTaskAsync(WEEKLY_REPORT_TASK);
        console.log('Background fetch unregistered');
      } else {
        console.warn('BackgroundFetch.unregisterTaskAsync not available');
      }
    } catch (error) {
      console.error('Failed to unregister background fetch:', error);
    }
  }

  /**
   * Check if background fetch is available and registered
   */
  public async getBackgroundFetchStatus(): Promise<{
    isAvailable: boolean;
    isRegistered: boolean;
    status?: BackgroundFetch.BackgroundFetchStatus;
  }> {
    try {
      // Return false for web platform
      if (Platform.OS === 'web') {
        return { isAvailable: false, isRegistered: false };
      }

      // Check if background fetch methods are available
      const isAvailable = typeof BackgroundFetch.registerTaskAsync === 'function';
      const isRegistered = await TaskManager.isTaskRegisteredAsync(WEEKLY_REPORT_TASK);

      let status: BackgroundFetch.BackgroundFetchStatus | undefined;
      try {
        const fetchStatus = await BackgroundFetch.getStatusAsync();
        status = fetchStatus || undefined;
      } catch (error) {
        console.warn('getStatusAsync not available or failed:', error);
        status = undefined;
      }

      return { isAvailable, isRegistered, status };
    } catch (error) {
      console.error('Failed to get background fetch status:', error);
      return { isAvailable: false, isRegistered: false };
    }
  }
}

// Export singleton instance
export const backgroundTaskService = BackgroundTaskService.getInstance();