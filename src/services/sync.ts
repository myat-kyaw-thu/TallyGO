import type {
  Expense,
  SyncOperation,
  SyncServiceInterface,
  SyncStatus,
  User
} from '../types';
import { handleAsyncError } from '../utils/errors';
import { LocalStorageService } from './storage';
import { SupabaseService } from './supabase';

/**
 * Sync service for TallyGO
 * Handles data synchronization between local storage and Supabase
 */
export class SyncService implements SyncServiceInterface {
  private static instance: SyncService;
  private syncQueue: SyncOperation[] = [];
  private syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];
  private currentSyncStatus: SyncStatus = {
    last_sync: null,
    pending_changes: 0,
    sync_in_progress: false,
    error: null
  };

  private storageService = LocalStorageService.getInstance();
  private supabaseService = SupabaseService.getInstance();

  private constructor() { }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Update sync status and notify callbacks
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.currentSyncStatus = { ...this.currentSyncStatus, ...updates };
    this.syncStatusCallbacks.forEach(callback => callback(this.currentSyncStatus));
  }

  /**
   * Get current sync status
   */
  public async getSyncStatus(): Promise<SyncStatus> {
    return this.currentSyncStatus;
  }

  /**
   * Subscribe to sync status changes
   */
  public onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.syncStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Sync expenses between local storage and Supabase
   */
  public async syncExpenses(): Promise<void> {
    try {
      this.updateSyncStatus({ sync_in_progress: true, error: null });

      // Get current user
      const currentUser = await this.supabaseService.getCurrentUser();
      if (!currentUser || currentUser.isGuest) {
        throw new Error('User not authenticated for sync');
      }

      // Get expenses from both sources
      const [localExpenses, serverExpenses] = await Promise.all([
        this.storageService.getExpenses(),
        this.supabaseService.getExpenses()
      ]);

      // Resolve conflicts and sync
      await this.resolveExpenseConflicts(localExpenses, serverExpenses, currentUser);

      this.updateSyncStatus({
        last_sync: new Date().toISOString(),
        pending_changes: 0,
        error: null
      });

    } catch (error) {
      const appError = handleAsyncError(error, 'Sync expenses');
      this.updateSyncStatus({ error: appError.message });
      throw appError;
    } finally {
      this.updateSyncStatus({ sync_in_progress: false });
    }
  }

  /**
   * Resolve conflicts between local and server expenses
   */
  private async resolveExpenseConflicts(
    localExpenses: Expense[],
    serverExpenses: Expense[],
    user: User
  ): Promise<void> {
    const localExpenseMap = new Map(localExpenses.map(exp => [exp.id, exp]));
    const serverExpenseMap = new Map(serverExpenses.map(exp => [exp.id, exp]));

    const expensesToUpload: Expense[] = [];
    const expensesToDownload: Expense[] = [];
    const conflictsToResolve: Array<{ local: Expense; server: Expense; }> = [];

    // Find expenses that exist only locally (need to upload)
    for (const localExpense of localExpenses) {
      if (!serverExpenseMap.has(localExpense.id)) {
        // Check if this is a temporary ID from optimistic updates
        if (localExpense.id.startsWith('temp_')) {
          // Create new expense on server
          expensesToUpload.push({
            ...localExpense,
            user_id: user.id,
            id: undefined as any // Let server generate new ID
          });
        } else {
          expensesToUpload.push(localExpense);
        }
      }
    }

    // Find expenses that exist only on server (need to download)
    for (const serverExpense of serverExpenses) {
      if (!localExpenseMap.has(serverExpense.id)) {
        expensesToDownload.push(serverExpense);
      }
    }

    // Find conflicts (exist in both but different)
    for (const localExpense of localExpenses) {
      const serverExpense = serverExpenseMap.get(localExpense.id);
      if (serverExpense && !localExpense.id.startsWith('temp_')) {
        const localTime = new Date(localExpense.updated_at || localExpense.created_at).getTime();
        const serverTime = new Date(serverExpense.updated_at || serverExpense.created_at).getTime();

        // Check if they're actually different
        if (
          localExpense.content !== serverExpense.content ||
          localExpense.price !== serverExpense.price ||
          localExpense.date !== serverExpense.date
        ) {
          conflictsToResolve.push({ local: localExpense, server: serverExpense });
        }
      }
    }

    // Upload local-only expenses
    for (const expense of expensesToUpload) {
      try {
        const uploadedExpense = await this.supabaseService.addExpense({
          content: expense.content,
          price: expense.price,
          date: expense.date,
          user_id: expense.user_id
        });

        // Update local storage with server ID if it was a temp expense
        if (expense.id?.startsWith('temp_')) {
          await this.storageService.deleteExpense(expense.id);
          await this.storageService.addExpense({
            ...uploadedExpense,
            id: uploadedExpense.id,
            created_at: uploadedExpense.created_at
          });
        }
      } catch (error) {
        console.error('Failed to upload expense:', expense.id, error);
        // Continue with other expenses
      }
    }

    // Download server-only expenses
    for (const expense of expensesToDownload) {
      try {
        await this.storageService.addExpense({
          ...expense,
          synced: true
        });
      } catch (error) {
        console.error('Failed to download expense:', expense.id, error);
        // Continue with other expenses
      }
    }

    // Resolve conflicts using last-write-wins strategy
    for (const { local, server } of conflictsToResolve) {
      try {
        const resolvedExpense = await this.supabaseService.resolveExpenseConflict(local, server);

        // Update local storage with resolved version
        await this.storageService.updateExpense(resolvedExpense.id, {
          content: resolvedExpense.content,
          price: resolvedExpense.price,
          date: resolvedExpense.date,
          updated_at: resolvedExpense.updated_at,
          synced: true
        });
      } catch (error) {
        console.error('Failed to resolve conflict for expense:', local.id, error);
        // Continue with other conflicts
      }
    }
  }

  /**
   * Queue an operation for later sync
   */
  public async queueOperation(operation: SyncOperation): Promise<void> {
    this.syncQueue.push(operation);
    this.updateSyncStatus({
      pending_changes: this.syncQueue.length
    });

    // Try to process queue immediately if online
    try {
      await this.processQueue();
    } catch (error) {
      // Queue will be processed later when connection is restored
      console.warn('Failed to process sync queue immediately:', error);
    }
  }

  /**
   * Process queued sync operations
   */
  public async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    try {
      this.updateSyncStatus({ sync_in_progress: true });

      // Check if user is authenticated
      const currentUser = await this.supabaseService.getCurrentUser();
      if (!currentUser || currentUser.isGuest) {
        throw new Error('User not authenticated for sync');
      }

      // Process operations in order
      const processedOperations: SyncOperation[] = [];

      for (const operation of this.syncQueue) {
        try {
          await this.processOperation(operation);
          processedOperations.push(operation);
        } catch (error) {
          console.error('Failed to process sync operation:', operation.id, error);

          // Increment retry count
          operation.retries += 1;

          // Remove operation if max retries exceeded
          if (operation.retries >= 3) {
            console.error('Max retries exceeded for operation:', operation.id);
            processedOperations.push(operation);
          }
        }
      }

      // Remove processed operations from queue
      this.syncQueue = this.syncQueue.filter(op => !processedOperations.includes(op));

      this.updateSyncStatus({
        pending_changes: this.syncQueue.length,
        last_sync: new Date().toISOString(),
        error: null
      });

    } catch (error) {
      const appError = handleAsyncError(error, 'Process sync queue');
      this.updateSyncStatus({ error: appError.message });
      throw appError;
    } finally {
      this.updateSyncStatus({ sync_in_progress: false });
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    switch (operation.entity) {
      case 'expense':
        await this.processExpenseOperation(operation);
        break;
      case 'goal_template':
      case 'goal_completion':
      case 'weekly_report':
        // These will be implemented in future tasks
        console.warn('Goal sync operations not yet implemented');
        break;
      default:
        throw new Error(`Unknown sync entity: ${operation.entity}`);
    }
  }

  /**
   * Process an expense sync operation
   */
  private async processExpenseOperation(operation: SyncOperation): Promise<void> {
    const { type, data } = operation;

    switch (type) {
      case 'create':
        await this.supabaseService.addExpense(data);
        break;
      case 'update':
        await this.supabaseService.updateExpense(data.id, data);
        break;
      case 'delete':
        await this.supabaseService.deleteExpense(data.id);
        break;
      default:
        throw new Error(`Unknown sync operation type: ${type}`);
    }
  }

  /**
   * Clear sync queue
   */
  public async clearQueue(): Promise<void> {
    this.syncQueue = [];
    this.updateSyncStatus({ pending_changes: 0 });
  }

  /**
   * Sync goal templates (placeholder for future implementation)
   */
  public async syncGoalTemplates(): Promise<void> {
    console.warn('Goal template sync not yet implemented');
  }

  /**
   * Sync goal completions (placeholder for future implementation)
   */
  public async syncGoalCompletions(): Promise<void> {
    console.warn('Goal completion sync not yet implemented');
  }

  /**
   * Sync weekly reports (placeholder for future implementation)
   */
  public async syncWeeklyReports(): Promise<void> {
    console.warn('Weekly report sync not yet implemented');
  }

  /**
   * Sync all data types
   */
  public async syncAll(): Promise<void> {
    try {
      this.updateSyncStatus({ sync_in_progress: true, error: null });

      await this.syncExpenses();
      // Future: await this.syncGoalTemplates();
      // Future: await this.syncGoalCompletions();
      // Future: await this.syncWeeklyReports();

      this.updateSyncStatus({
        last_sync: new Date().toISOString(),
        error: null
      });

    } catch (error) {
      const appError = handleAsyncError(error, 'Sync all data');
      this.updateSyncStatus({ error: appError.message });
      throw appError;
    } finally {
      this.updateSyncStatus({ sync_in_progress: false });
    }
  }
}