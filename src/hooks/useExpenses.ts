
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { LocalStorageService } from "../services/storage";
import { SupabaseService } from "../services/supabase";
import { SyncService } from "../services/sync";
import type { Expense, FilterPeriod, SyncStatus, UseExpensesReturn } from "../types";
import { handleAsyncError } from "../utils/errors";

export function useExpenses(): UseExpensesReturn {
  const { user, isAuthenticated, isGuest } = useAuthContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    last_sync: null,
    pending_changes: 0,
    sync_in_progress: false,
    error: null
  });

  const storageService = LocalStorageService.getInstance();
  const supabaseService = SupabaseService.getInstance();
  const syncService = SyncService.getInstance();

  // Load expenses from appropriate storage
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSyncStatus(prev => ({ ...prev, sync_in_progress: true }));

      let storedExpenses: Expense[];

      if (isAuthenticated && user && !user.isGuest) {
        // Load from Supabase for authenticated users
        try {
          storedExpenses = await supabaseService.getExpenses();
          setSyncStatus(prev => ({
            ...prev,
            last_sync: new Date().toISOString(),
            error: null
          }));
        } catch (supabaseError) {
          console.warn('Failed to load from Supabase, falling back to local storage:', supabaseError);
          storedExpenses = await storageService.getExpenses();
          setSyncStatus(prev => ({
            ...prev,
            error: 'Failed to sync with server'
          }));
        }
      } else {
        // Load from local storage for guest users
        storedExpenses = await storageService.getExpenses();
      }

      setExpenses(storedExpenses);
    } catch (err) {
      const appError = handleAsyncError(err, 'Load expenses');
      setError(appError.message);
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
      setSyncStatus(prev => ({ ...prev, sync_in_progress: false }));
    }
  }, [isAuthenticated, user, storageService, supabaseService]);

  // Add a new expense with optimistic updates
  const addExpense = useCallback(async (newExpense: { content: string; price: number; date: string; }) => {
    try {
      setError(null);

      // Create optimistic expense for immediate UI update
      const optimisticExpense: Expense = {
        id: `temp_${Date.now()}`,
        ...newExpense,
        user_id: user?.id,
        created_at: new Date().toISOString(),
        synced: false
      };

      // Optimistically update UI
      setExpenses(prev => [optimisticExpense, ...prev]);

      let savedExpense: Expense;

      if (isAuthenticated && user && !user.isGuest) {
        // Try to save to Supabase first
        try {
          setSyncStatus(prev => ({ ...prev, sync_in_progress: true }));
          savedExpense = await supabaseService.addExpense(newExpense);
          setSyncStatus(prev => ({
            ...prev,
            last_sync: new Date().toISOString(),
            error: null
          }));
        } catch (supabaseError) {
          console.warn('Failed to save to Supabase, saving locally:', supabaseError);
          // Save to local storage as fallback
          savedExpense = await storageService.addExpense(newExpense);
          setSyncStatus(prev => ({
            ...prev,
            pending_changes: prev.pending_changes + 1,
            error: 'Failed to sync with server'
          }));
        }
      } else {
        // Save to local storage for guest users
        savedExpense = await storageService.addExpense(newExpense);
      }

      // Replace optimistic expense with real one
      setExpenses(prev => prev.map(exp =>
        exp.id === optimisticExpense.id ? savedExpense : exp
      ));

      return savedExpense;
    } catch (err) {
      // Remove optimistic expense on error
      setExpenses(prev => prev.filter(exp => exp.id !== `temp_${Date.now()}`));

      const appError = handleAsyncError(err, 'Add expense');
      setError(appError.message);
      console.error('Error adding expense:', err);
      throw appError;
    } finally {
      setSyncStatus(prev => ({ ...prev, sync_in_progress: false }));
    }
  }, [isAuthenticated, user, storageService, supabaseService]);

  // Get filtered expenses by period
  const getFilteredExpenses = useCallback((filter: FilterPeriod) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const expenseDateOnly = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate());

      switch (filter) {
        case "day":
          return expenseDateOnly.getTime() === today.getTime();

        case "week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return expenseDateOnly >= weekStart && expenseDateOnly <= weekEnd;

        case "month":
          return expenseDateOnly.getMonth() === today.getMonth() &&
            expenseDateOnly.getFullYear() === today.getFullYear();

        default:
          return true;
      }
    });
  }, [expenses]);

  // Calculate total amount for given expenses
  const getTotalAmount = useCallback((expenseList: Expense[]) => {
    return LocalStorageService.calculateTotal(expenseList);
  }, []);

  // Get expenses for a specific date
  const getExpensesForDate = useCallback((date: string) => {
    return expenses.filter(expense => expense.date === date);
  }, [expenses]);

  // Get all unique dates with their totals
  const getDatesWithTotals = useCallback(() => {
    const datesMap = expenses.reduce((acc, expense) => {
      const date = expense.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          expenses: [],
          total: 0,
        };
      }
      acc[date].expenses.push(expense);
      acc[date].total += expense.price;
      return acc;
    }, {} as Record<string, { date: string; expenses: Expense[]; total: number; }>);

    // Convert to array and sort by date (newest first)
    return Object.values(datesMap).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [expenses]);

  // Get master total (sum of all expenses)
  const getMasterTotal = useCallback(() => {
    return LocalStorageService.calculateTotal(expenses);
  }, [expenses]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      setError(null);
      await LocalStorageService.clearAllData();
      setExpenses([]);
    } catch (err) {
      setError('Failed to clear data');
      console.error('Error clearing data:', err);
    }
  }, []);

  // Get expiry information
  const getExpiryInfo = useCallback(async () => {
    try {
      return await LocalStorageService.getExpiryInfo();
    } catch (err) {
      console.error('Error getting expiry info:', err);
      return { expiryDate: null, daysRemaining: null };
    }
  }, []);

  // Update an existing expense
  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    try {
      setError(null);

      // Optimistically update UI
      setExpenses(prev => prev.map(exp =>
        exp.id === id ? { ...exp, ...updates, updated_at: new Date().toISOString() } : exp
      ));

      let updatedExpense: Expense;

      if (isAuthenticated && user && !user.isGuest) {
        // Try to update in Supabase first
        try {
          setSyncStatus(prev => ({ ...prev, sync_in_progress: true }));
          updatedExpense = await supabaseService.updateExpense(id, updates);
          setSyncStatus(prev => ({
            ...prev,
            last_sync: new Date().toISOString(),
            error: null
          }));
        } catch (supabaseError) {
          console.warn('Failed to update in Supabase, updating locally:', supabaseError);
          updatedExpense = await storageService.updateExpense(id, updates);
          setSyncStatus(prev => ({
            ...prev,
            pending_changes: prev.pending_changes + 1,
            error: 'Failed to sync with server'
          }));
        }
      } else {
        // Update in local storage for guest users
        updatedExpense = await storageService.updateExpense(id, updates);
      }

      // Update with real data from storage
      setExpenses(prev => prev.map(exp => exp.id === id ? updatedExpense : exp));

      return updatedExpense;
    } catch (err) {
      // Revert optimistic update on error
      await loadExpenses();

      const appError = handleAsyncError(err, 'Update expense');
      setError(appError.message);
      console.error('Error updating expense:', err);
      throw appError;
    } finally {
      setSyncStatus(prev => ({ ...prev, sync_in_progress: false }));
    }
  }, [isAuthenticated, user, storageService, supabaseService, loadExpenses]);

  // Delete an expense
  const deleteExpense = useCallback(async (id: string) => {
    try {
      setError(null);



      // Optimistically remove from UI
      setExpenses(prev => prev.filter(exp => exp.id !== id));

      if (isAuthenticated && user && !user.isGuest) {
        // Try to delete from Supabase first
        try {
          setSyncStatus(prev => ({ ...prev, sync_in_progress: true }));
          await supabaseService.deleteExpense(id);
          setSyncStatus(prev => ({
            ...prev,
            last_sync: new Date().toISOString(),
            error: null
          }));
        } catch (supabaseError) {
          console.warn('Failed to delete from Supabase, deleting locally:', supabaseError);
          await storageService.deleteExpense(id);
          setSyncStatus(prev => ({
            ...prev,
            pending_changes: prev.pending_changes + 1,
            error: 'Failed to sync with server'
          }));
        }
      } else {
        // Delete from local storage for guest users
        await storageService.deleteExpense(id);
      }
    } catch (err) {
      // Revert optimistic delete on error
      await loadExpenses();

      const appError = handleAsyncError(err, 'Delete expense');
      setError(appError.message);
      console.error('Error deleting expense:', err);
      throw appError;
    } finally {
      setSyncStatus(prev => ({ ...prev, sync_in_progress: false }));
    }
  }, [isAuthenticated, user, expenses, storageService, supabaseService, loadExpenses]);

  // Load expenses when user authentication state changes
  useEffect(() => {
    if (user !== null) { // Only load when user state is determined (not initial null)
      loadExpenses();
    }
  }, [user, loadExpenses]);

  // Subscribe to sync status changes for authenticated users
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      const unsubscribe = syncService.onSyncStatusChange((status) => {
        setSyncStatus(status);
      });

      // Initial sync status
      syncService.getSyncStatus().then(setSyncStatus);

      return unsubscribe;
    }
  }, [isAuthenticated, isGuest, syncService]);

  // Auto-sync for authenticated users when app comes online
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      const handleFocus = async () => {
        try {
          await syncService.syncExpenses();
          await loadExpenses(); // Refresh local data after sync
        } catch (error) {
          console.warn('Auto-sync failed:', error);
        }
      };

      // Listen for app focus events (when user returns to app)
      // Note: In a real React Native app, you'd use AppState.addEventListener
      // For now, we'll just do an initial sync
      handleFocus();
    }
  }, [isAuthenticated, isGuest, syncService, loadExpenses]);

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    getFilteredExpenses,
    getTotalAmount,
    getExpensesForDate,
    getDatesWithTotals,
    getMasterTotal,
    clearAllData,
    getExpiryInfo,
    refreshExpenses: loadExpenses,
    syncStatus,
    // Manual sync function for authenticated users
    syncExpenses: useCallback(async () => {
      if (isAuthenticated && !isGuest) {
        try {
          await syncService.syncExpenses();
          await loadExpenses(); // Refresh local data after sync
        } catch (error) {
          const appError = handleAsyncError(error, 'Manual sync');
          setError(appError.message);
          throw appError;
        }
      }
    }, [isAuthenticated, isGuest, syncService, loadExpenses]),
  };
}