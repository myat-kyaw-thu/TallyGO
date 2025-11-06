import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus } from 'react-native';
import { APP_CONFIG } from '../constants/config';
import { backgroundTaskService } from './backgroundTaskService';
import { notificationService } from './notificationService';
import { WeeklyReportService } from './weeklyReportService';

// Task identifiers
const BACKGROUND_SYNC_TASK = 'background-sync-task';
const WEEKLY_REPORT_CHECK_TASK = 'weekly-report-check';
const DAILY_GOAL_CHECK_TASK = 'daily-goal-check';

/**
 * Background Task Manager
 * Coordinates all background operations including notifications, reports, and sync
 */
export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private appStateSubscription: any;
  private lastDailyCheckDate: string | null = null;
  private lastWeeklyReportDate: string | null = null;
  private isInitialized = false;

  private constructor() {
    this.setupAppStateListener();
    this.registerBackgroundTasks();
  }

  public static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  /**
   * Register all background tasks
   */
  private registerBackgroundTasks(): void {
    // Register background sync task
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      try {
        console.log('Background sync task started');
        await this.performBackgroundSync();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background sync task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register weekly report check task
    TaskManager.defineTask(WEEKLY_REPORT_CHECK_TASK, async () => {
      try {
        console.log('Weekly report check task started');
        await this.checkAndGenerateWeeklyReport();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Weekly report check task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register daily goal check task
    TaskManager.defineTask(DAILY_GOAL_CHECK_TASK, async () => {
      try {
        console.log('Daily goal check task started');
        await this.performDailyGoalCheck();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Daily goal check task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Set up app state listener to trigger checks when app becomes active
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'active' && this.isInitialized) {
      // App became active, check if we need to perform any background tasks
      await this.performActiveStateChecks();
    }
  }

  /**
   * Perform checks when app becomes active
   */
  private async performActiveStateChecks(): Promise<void> {
    try {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      // Check if we need to perform daily goal check
      if (this.shouldPerformDailyCheck(todayString)) {
        await this.performDailyGoalCheck();
        this.lastDailyCheckDate = todayString;
      }

      // Check if we need to generate weekly report
      if (this.shouldGenerateWeeklyReport()) {
        await this.checkAndGenerateWeeklyReport();
        this.lastWeeklyReportDate = WeeklyReportService.getCurrentWeekStart();
      }

      // Perform background sync if needed
      await this.performBackgroundSync();

    } catch (error) {
      console.error('Failed to perform active state checks:', error);
    }
  }

  /**
   * Check if daily goal check should be performed
   */
  private shouldPerformDailyCheck(todayString: string): boolean {
    // Perform daily check if:
    // 1. We haven't checked today yet
    // 2. It's after the configured notification time
    const now = new Date();
    const [hour, minute] = APP_CONFIG.notificationTimes.dailyCheck.split(':').map(Number);
    const notificationTime = new Date();
    notificationTime.setHours(hour, minute, 0, 0);

    return this.lastDailyCheckDate !== todayString && now >= notificationTime;
  }

  /**
   * Check if weekly report should be generated
   */
  private shouldGenerateWeeklyReport(): boolean {
    const currentWeekStart = WeeklyReportService.getCurrentWeekStart();

    // Generate weekly report if:
    // 1. We haven't generated for this week yet
    // 2. It's Sunday and after the configured time
    const now = new Date();
    const dayOfWeek = now.getDay();
    const [hour, minute] = APP_CONFIG.notificationTimes.weeklyReport.split(':').map(Number);
    const reportTime = new Date();
    reportTime.setHours(hour, minute, 0, 0);

    return this.lastWeeklyReportDate !== currentWeekStart &&
      dayOfWeek === 0 &&
      now >= reportTime;
  }

  /**
   * Perform daily goal check
   */
  private async performDailyGoalCheck(): Promise<void> {
    try {
      await backgroundTaskService.triggerDailyGoalCheck();
    } catch (error) {
      console.error('Failed to perform daily goal check:', error);
    }
  }

  /**
   * Check and generate weekly report if needed
   */
  private async checkAndGenerateWeeklyReport(): Promise<void> {
    try {
      await backgroundTaskService.triggerWeeklyReport();
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
    }
  }

  /**
   * Perform background sync operations
   */
  private async performBackgroundSync(): Promise<void> {
    try {
      // This would typically sync local data with server
      // For now, just log that sync is happening
      console.log('Performing background sync...');

      // In a full implementation, this might:
      // 1. Sync pending local changes to server
      // 2. Pull latest data from server
      // 3. Resolve any conflicts
      // 4. Update local cache

    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  /**
   * Initialize the background task manager
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing background task manager...');

      // Initialize notification service first with error handling
      try {
        await notificationService.initialize();
      } catch (notificationError) {
        console.warn('Notification service initialization failed:', notificationError);
        // Continue without notifications
      }

      // Initialize background task service with error handling
      try {
        await backgroundTaskService.initialize();
      } catch (backgroundError) {
        console.warn('Background task service initialization failed:', backgroundError);
        // Continue without background tasks
      }

      // Register background fetch tasks with error handling
      try {
        await this.registerBackgroundFetch();
      } catch (fetchError) {
        console.warn('Background fetch registration failed:', fetchError);
        // Continue without background fetch
      }

      // Set up periodic checks with error handling
      try {
        this.setupPeriodicChecks();
      } catch (periodicError) {
        console.warn('Periodic checks setup failed:', periodicError);
        // Continue without periodic checks
      }

      this.isInitialized = true;
      console.log('Background task manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize background task manager:', error);
      // Don't throw - app should continue working
    }
  }

  /**
   * Register background fetch tasks
   */
  private async registerBackgroundFetch(): Promise<void> {
    try {
      // Register background sync task
      if (typeof BackgroundFetch.registerTaskAsync === 'function') {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 15 * 60 * 1000, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }

      console.log('Background fetch tasks registered');
    } catch (error) {
      console.warn('Failed to register background fetch:', error);
    }
  }

  /**
   * Set up periodic checks using timers
   */
  private setupPeriodicChecks(): void {
    // Check every 5 minutes for pending tasks
    setInterval(async () => {
      if (AppState.currentState === 'active') {
        await this.performActiveStateChecks();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Daily check at notification time
    const [dailyHour, dailyMinute] = APP_CONFIG.notificationTimes.dailyCheck.split(':').map(Number);
    this.scheduleDaily(dailyHour, dailyMinute, () => {
      this.performDailyGoalCheck();
    });

    // Weekly check on Sunday at notification time
    const [weeklyHour, weeklyMinute] = APP_CONFIG.notificationTimes.weeklyReport.split(':').map(Number);
    this.scheduleWeekly(0, weeklyHour, weeklyMinute, () => { // 0 = Sunday
      this.checkAndGenerateWeeklyReport();
    });
  }

  /**
   * Schedule a daily recurring task
   */
  private scheduleDaily(hour: number, minute: number, callback: () => void): void {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilExecution = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      callback();
      // Schedule the next execution (24 hours later)
      setInterval(callback, 24 * 60 * 60 * 1000);
    }, timeUntilExecution);
  }

  /**
   * Schedule a weekly recurring task
   */
  private scheduleWeekly(dayOfWeek: number, hour: number, minute: number, callback: () => void): void {
    const now = new Date();
    const scheduledTime = new Date();

    // Calculate days until target day
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    scheduledTime.setDate(now.getDate() + daysUntilTarget);
    scheduledTime.setHours(hour, minute, 0, 0);

    // If the time has already passed this week, schedule for next week
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 7);
    }

    const timeUntilExecution = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      callback();
      // Schedule the next execution (7 days later)
      setInterval(callback, 7 * 24 * 60 * 60 * 1000);
    }, timeUntilExecution);
  }

  /**
   * Get background task status
   */
  public async getStatus(): Promise<{
    isInitialized: boolean;
    notificationStatus: any;
    lastDailyCheck: string | null;
    lastWeeklyReport: string | null;
    backgroundFetchStatus: any;
  }> {
    try {
      const [notificationStatus, backgroundFetchStatus] = await Promise.all([
        notificationService.getNotificationStatus(),
        this.getBackgroundFetchStatus()
      ]);

      return {
        isInitialized: this.isInitialized,
        notificationStatus,
        lastDailyCheck: this.lastDailyCheckDate,
        lastWeeklyReport: this.lastWeeklyReportDate,
        backgroundFetchStatus
      };
    } catch (error) {
      console.error('Failed to get background task status:', error);
      return {
        isInitialized: this.isInitialized,
        notificationStatus: null,
        lastDailyCheck: this.lastDailyCheckDate,
        lastWeeklyReport: this.lastWeeklyReportDate,
        backgroundFetchStatus: null
      };
    }
  }

  /**
   * Get background fetch status
   */
  private async getBackgroundFetchStatus(): Promise<any> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      let status = null;

      try {
        status = await BackgroundFetch.getStatusAsync();
      } catch (error) {
        console.warn('getStatusAsync not available:', error);
      }

      return { isRegistered, status };
    } catch (error) {
      console.error('Failed to get background fetch status:', error);
      return { isRegistered: false, status: null };
    }
  }

  /**
   * Cleanup background task manager
   */
  public async cleanup(): Promise<void> {
    try {
      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
      }

      // Cleanup notification service
      await notificationService.cleanup();

      // Unregister background tasks
      await this.unregisterBackgroundTasks();

      this.isInitialized = false;
      console.log('Background task manager cleaned up');

    } catch (error) {
      console.error('Failed to cleanup background task manager:', error);
    }
  }

  /**
   * Unregister background tasks
   */
  private async unregisterBackgroundTasks(): Promise<void> {
    try {
      const tasks = [BACKGROUND_SYNC_TASK, WEEKLY_REPORT_CHECK_TASK, DAILY_GOAL_CHECK_TASK];

      for (const taskName of tasks) {
        try {
          if (await TaskManager.isTaskRegisteredAsync(taskName)) {
            await TaskManager.unregisterTaskAsync(taskName);
          }
        } catch (error) {
          console.warn(`Failed to unregister task ${taskName}:`, error);
        }
      }

      // Unregister background fetch
      if (typeof BackgroundFetch.unregisterTaskAsync === 'function') {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      }

    } catch (error) {
      console.error('Failed to unregister background tasks:', error);
    }
  }
}

// Export singleton instance
export const backgroundTaskManager = BackgroundTaskManager.getInstance();