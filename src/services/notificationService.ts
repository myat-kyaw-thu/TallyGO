import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { APP_CONFIG, NOTIFICATION_IDS } from '../constants/config';
import type { AppNotification, NotificationServiceInterface } from '../types';
import { createPermissionError, handleAsyncError } from '../utils/errors';

/**
 * Notification Service for TallyGO
 * Handles notification permissions, scheduling, and management
 */
export class NotificationService implements NotificationServiceInterface {
  private static instance: NotificationService;
  private notificationListeners: Array<() => void> = [];

  private constructor() {
    this.setupNotificationHandler();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Set up notification handler for foreground notifications
   */
  private setupNotificationHandler(): void {
    try {
      // Check if setNotificationHandler exists (newer versions of expo-notifications)
      if ('setNotificationHandler' in Notifications && typeof Notifications.setNotificationHandler === 'function') {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } else {
        console.warn('setNotificationHandler not available in this version of expo-notifications');
      }
    } catch (error) {
      console.warn('Failed to set notification handler:', error);
    }
  }

  /**
   * Request notification permissions from the user
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      // Return false on web platform (notifications not supported)
      if (Platform.OS === 'web') {
        console.log('Notification permissions not available on web platform');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // For Android, also request exact alarm permissions if available
      if (Platform.OS === 'android') {
        try {
          // This is for newer Android versions that require exact alarm permissions
          const { status: alarmStatus } = await Notifications.requestPermissionsAsync({
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
          });

          if (alarmStatus !== 'granted') {
            console.warn('Android alarm permissions not fully granted');
          }
        } catch (error) {
          console.warn('Failed to request Android alarm permissions:', error);
        }
      }

      return true;
    } catch (error) {
      const appError = handleAsyncError(error, 'Request notification permissions');
      throw createPermissionError(appError.message);
    }
  }

  /**
   * Check current notification permissions
   */
  public async checkPermissions(): Promise<boolean> {
    try {
      // Return false on web platform
      if (Platform.OS === 'web') {
        return false;
      }

      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule daily goal check notification (11:30 PM daily)
   */
  public async scheduleDailyGoalCheck(): Promise<void> {
    try {
      // Skip on web platform
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web platform');
        return;
      }

      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        throw createPermissionError('Notification permissions not granted');
      }

      // Cancel existing notification
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_GOAL_CHECK);

      // Parse time from config
      const [hour, minute] = APP_CONFIG.notificationTimes.dailyCheck.split(':').map(Number);

      // Schedule new notification
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.DAILY_GOAL_CHECK,
        content: {
          title: 'Daily Goal Check-in 🎯',
          body: 'How did you do with your goals today?',
          data: {
            type: 'daily_goal_check',
            timestamp: new Date().toISOString()
          },
        },
        trigger: {
          type: 'calendar' as any,
          hour,
          minute,
          repeats: true,
        },
      });

      console.log(`Daily goal check notification scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
    } catch (error) {
      throw handleAsyncError(error, 'Schedule daily goal check notification');
    }
  }

  /**
   * Schedule weekly report notification (Sunday 11:30 PM)
   */
  public async scheduleWeeklyReport(): Promise<void> {
    try {
      // Skip on web platform
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web platform');
        return;
      }

      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        throw createPermissionError('Notification permissions not granted');
      }

      // Cancel existing notification
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.WEEKLY_REPORT);

      // Parse time from config
      const [hour, minute] = APP_CONFIG.notificationTimes.weeklyReport.split(':').map(Number);

      // Schedule new notification for Sunday
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.WEEKLY_REPORT,
        content: {
          title: 'Weekly Report Generated 📊',
          body: 'Your weekly goal progress report is ready!',
          data: {
            type: 'weekly_report',
            timestamp: new Date().toISOString()
          },
        },
        trigger: {
          type: 'calendar' as any,
          weekday: 1, // Sunday (1 = Sunday in iOS, 0 = Sunday in some other systems)
          hour,
          minute,
          repeats: true,
        },
      });

      console.log(`Weekly report notification scheduled for Sundays at ${hour}:${minute.toString().padStart(2, '0')}`);
    } catch (error) {
      throw handleAsyncError(error, 'Schedule weekly report notification');
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      // Skip on web platform
      if (Platform.OS === 'web') {
        console.log('Mock cancel notifications on web platform');
        return;
      }

      await Promise.all([
        Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_GOAL_CHECK),
        Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.WEEKLY_REPORT)
      ]);

      console.log('All scheduled notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Send immediate notification
   */
  public async sendImmediateNotification(notification: Omit<AppNotification, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Return mock ID on web platform
      if (Platform.OS === 'web') {
        console.log('Mock notification sent on web:', notification.title);
        return 'web-mock-notification-id';
      }

      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        throw createPermissionError('Notification permissions not granted');
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      throw handleAsyncError(error, 'Send immediate notification');
    }
  }

  /**
   * Listen for notification received events (when app is in foreground)
   */
  public onNotificationReceived(callback: (notification: AppNotification) => void): () => void {
    // Return no-op function on web platform
    if (Platform.OS === 'web') {
      return () => { };
    }

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const appNotification: AppNotification = {
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data || {},
        timestamp: new Date().toISOString(),
      };
      callback(appNotification);
    });

    // Store cleanup function
    const cleanup = () => subscription.remove();
    this.notificationListeners.push(cleanup);

    return cleanup;
  }

  /**
   * Listen for notification opened events (when user taps notification)
   */
  public onNotificationOpened(callback: (notification: AppNotification) => void): () => void {
    // Return no-op function on web platform
    if (Platform.OS === 'web') {
      return () => { };
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const appNotification: AppNotification = {
        id: response.notification.request.identifier,
        title: response.notification.request.content.title || '',
        body: response.notification.request.content.body || '',
        data: response.notification.request.content.data || {},
        timestamp: new Date().toISOString(),
      };
      callback(appNotification);
    });

    // Store cleanup function
    const cleanup = () => subscription.remove();
    this.notificationListeners.push(cleanup);

    return cleanup;
  }

  /**
   * Get all scheduled notifications
   */
  public async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      // Return empty array on web platform
      if (Platform.OS === 'web') {
        return [];
      }

      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Check if specific notification is scheduled
   */
  public async isNotificationScheduled(identifier: string): Promise<boolean> {
    try {
      const scheduled = await this.getScheduledNotifications();
      return scheduled.some(notification => notification.identifier === identifier);
    } catch (error) {
      console.error('Failed to check if notification is scheduled:', error);
      return false;
    }
  }

  /**
   * Get notification settings status
   */
  public async getNotificationStatus(): Promise<{
    permissionsGranted: boolean;
    dailyGoalCheckScheduled: boolean;
    weeklyReportScheduled: boolean;
    totalScheduled: number;
  }> {
    try {
      const [permissionsGranted, scheduled] = await Promise.all([
        this.checkPermissions(),
        this.getScheduledNotifications()
      ]);

      const dailyGoalCheckScheduled = scheduled.some(
        n => n.identifier === NOTIFICATION_IDS.DAILY_GOAL_CHECK
      );
      const weeklyReportScheduled = scheduled.some(
        n => n.identifier === NOTIFICATION_IDS.WEEKLY_REPORT
      );

      return {
        permissionsGranted,
        dailyGoalCheckScheduled,
        weeklyReportScheduled,
        totalScheduled: scheduled.length
      };
    } catch (error) {
      console.error('Failed to get notification status:', error);
      return {
        permissionsGranted: false,
        dailyGoalCheckScheduled: false,
        weeklyReportScheduled: false,
        totalScheduled: 0
      };
    }
  }

  /**
   * Initialize notification service
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing notification service...');

      // Skip initialization on web platform
      if (Platform.OS === 'web') {
        console.log('Notification service skipped on web platform');
        return;
      }

      // Request permissions with better error handling
      let permissionsGranted = false;
      try {
        permissionsGranted = await this.requestPermissions();
      } catch (permissionError) {
        console.warn('Failed to request notification permissions:', permissionError);
        return; // Continue without notifications
      }

      if (!permissionsGranted) {
        console.warn('Notification permissions not granted - notifications will not work');
        return;
      }

      // Schedule notifications with individual error handling
      try {
        await this.scheduleDailyGoalCheck();
      } catch (dailyError) {
        console.warn('Failed to schedule daily goal check:', dailyError);
      }

      try {
        await this.scheduleWeeklyReport();
      } catch (weeklyError) {
        console.warn('Failed to schedule weekly report:', weeklyError);
      }

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      // Don't throw here - app should continue working even if notifications fail
    }
  }

  /**
   * Cleanup all listeners and notifications
   */
  public async cleanup(): Promise<void> {
    try {
      // Remove all listeners
      this.notificationListeners.forEach(cleanup => cleanup());
      this.notificationListeners = [];

      // Cancel all notifications
      await this.cancelAllNotifications();

      console.log('Notification service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup notification service:', error);
    }
  }

  /**
   * Handle graceful degradation when permissions are denied
   */
  public getPermissionDeniedMessage(): string {
    if (Platform.OS === 'ios') {
      return 'To receive goal reminders, please enable notifications in Settings > TallyGO > Notifications';
    } else {
      return 'To receive goal reminders, please enable notifications in your device settings';
    }
  }

  /**
   * Open device notification settings (if supported)
   */
  public async openNotificationSettings(): Promise<void> {
    try {
      // This would require additional native modules or linking
      // For now, just log the instruction
      console.log('Please enable notifications in your device settings');

      // In a full implementation, you might use:
      // - expo-linking to open settings
      // - expo-intent-launcher on Android
      // - native modules for direct settings access
    } catch (error) {
      console.error('Failed to open notification settings:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();