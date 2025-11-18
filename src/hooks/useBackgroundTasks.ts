import { useCallback, useEffect, useState } from 'react';
import { backgroundTaskService } from '../services/backgroundTaskService';
import { notificationService } from '../services/notificationService';
import type { AppNotification } from '../types';
import { handleAsyncError } from '../utils/errors';

interface BackgroundTaskStatus {
  permissionsGranted: boolean;
  dailyGoalCheckScheduled: boolean;
  weeklyReportScheduled: boolean;
  totalScheduled: number;
  isInitialized: boolean;
}

interface UseBackgroundTasksReturn {
  status: BackgroundTaskStatus;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  triggerDailyGoalCheck: () => Promise<void>;
  triggerWeeklyReport: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing background tasks and notifications
 */
export function useBackgroundTasks(): UseBackgroundTasksReturn {
  const [status, setStatus] = useState<BackgroundTaskStatus>({
    permissionsGranted: false,
    dailyGoalCheckScheduled: false,
    weeklyReportScheduled: false,
    totalScheduled: 0,
    isInitialized: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh background task status
   */
  const refreshStatus = useCallback(async () => {
    try {
      const notificationStatus = await backgroundTaskService.getNotificationStatus();
      setStatus(prev => ({
        ...prev,
        ...notificationStatus,
        isInitialized: true
      }));
    } catch (err) {
      const appError = handleAsyncError(err, 'Refresh background task status');
      setError(appError.message);
    }
  }, []);

  /**
   * Initialize background tasks
   */
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await backgroundTaskService.initialize();
      await refreshStatus();

      console.log('Background tasks initialized successfully');
    } catch (err) {
      const appError = handleAsyncError(err, 'Initialize background tasks');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const granted = await notificationService.requestPermissions();

      if (granted) {
        // Re-schedule notifications after permissions are granted
        await Promise.all([
          notificationService.scheduleDailyGoalCheck(),
          notificationService.scheduleWeeklyReport()
        ]);
      }

      await refreshStatus();
      return granted;
    } catch (err) {
      const appError = handleAsyncError(err, 'Request notification permissions');
      setError(appError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Manually trigger daily goal check
   */
  const triggerDailyGoalCheck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await backgroundTaskService.triggerDailyGoalCheck();
      console.log('Daily goal check triggered manually');
    } catch (err) {
      const appError = handleAsyncError(err, 'Trigger daily goal check');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Manually trigger weekly report generation
   */
  const triggerWeeklyReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await backgroundTaskService.triggerWeeklyReport();
      console.log('Weekly report generation triggered manually');
    } catch (err) {
      const appError = handleAsyncError(err, 'Trigger weekly report');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel all notifications
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await backgroundTaskService.cancelAllNotifications();
      await refreshStatus();

      console.log('All notifications cancelled');
    } catch (err) {
      const appError = handleAsyncError(err, 'Cancel notifications');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Set up notification listeners
   */
  useEffect(() => {
    // Listen for notification received (app in foreground)
    const unsubscribeReceived = notificationService.onNotificationReceived(
      (notification: AppNotification) => {
        console.log('Notification received:', notification);
        // Handle foreground notification if needed
      }
    );

    // Listen for notification opened (user tapped notification)
    const unsubscribeOpened = notificationService.onNotificationOpened(
      (notification: AppNotification) => {
        console.log('Notification opened:', notification);

        // Handle navigation based on notification type
        if (notification.data?.type === 'daily_goal_check') {
          // Could navigate to goals screen
          console.log('Navigate to goals screen for daily check');
        } else if (notification.data?.type === 'weekly_report_generated') {
          // Could navigate to reports screen
          console.log('Navigate to reports screen for weekly report');
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      unsubscribeReceived();
      unsubscribeOpened();
    };
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    status,
    loading,
    error,
    initialize,
    requestPermissions,
    triggerDailyGoalCheck,
    triggerWeeklyReport,
    cancelAllNotifications,
    refreshStatus,
    clearError
  };
}