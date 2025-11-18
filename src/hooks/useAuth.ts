import { LocalStorageService } from '@/services';
import { useCallback, useEffect, useState } from 'react';
import { SupabaseService } from '../services/supabase';
import type { UseAuthReturn, User } from '../types';
import { handleAsyncError } from '../utils/errors';

/**
 * Authentication hook for TallyGO
 * Manages user authentication state and provides auth methods
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceAuthScreen, setForceAuthScreen] = useState(false);

  const supabaseService = SupabaseService.getInstance();
  const storageService = LocalStorageService.getInstance();

  // Computed states
  const isAuthenticated = !!user && !user.isGuest;
  const isGuest = !!user && user.isGuest;

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create guest user
   */
  const createGuestUser = useCallback((): User => {
    return {
      id: 'guest_' + Date.now(),
      isGuest: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, []);

  /**
   * Switch to guest mode
   */
  const switchToGuest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always try to sign out from Supabase to clear any cached sessions
      try {
        await supabaseService.signOut();
      } catch (signOutError) {
        // Ignore sign out errors - there might not be a session to sign out from
        console.warn('Sign out during guest switch failed (this is usually fine):', signOutError);
      }

      const guestUser = createGuestUser();
      setUser(guestUser);
      setForceAuthScreen(false); // Reset force auth screen flag
    } catch (err) {
      const appError = handleAsyncError(err, 'Switch to guest mode');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [supabaseService, createGuestUser]);

  /**
   * Sign up new user
   */
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service is not available. Please continue as guest.');
      }

      // Create the user account - this will send a confirmation email
      await supabaseService.signUp(email, password);

      // Always clear local data when switching to authenticated - start fresh
      await storageService.clearAllData();

      // Don't set the user yet - wait for email confirmation via deep link
      setForceAuthScreen(false); // Reset force auth screen flag

      console.log('Sign up successful. Please check your email for confirmation link.');
    } catch (err) {
      const appError = handleAsyncError(err, 'User signup');
      setError(appError.message);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [supabaseService, storageService]);

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service is not available.');
      }

      await supabaseService.resetPassword(email);

      console.log('Password reset email sent');
    } catch (err) {
      const appError = handleAsyncError(err, 'Password reset');
      setError(appError.message);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [supabaseService]);

  /**
   * Update password (after reset)
   */
  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service is not available.');
      }

      await supabaseService.updatePassword(newPassword);

      console.log('Password updated successfully');
    } catch (err) {
      const appError = handleAsyncError(err, 'Update password');
      setError(appError.message);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [supabaseService]);

  /**
   * Sign in existing user
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service is not available. Please continue as guest.');
      }

      const authenticatedUser = await supabaseService.signIn(email, password);

      // Always clear local data when switching to authenticated - start fresh
      await storageService.clearAllData();

      setUser(authenticatedUser);
      setForceAuthScreen(false); // Reset force auth screen flag
    } catch (err) {
      const appError = handleAsyncError(err, 'User signin');
      setError(appError.message);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [supabaseService, storageService]);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAuthenticated) {
        await supabaseService.signOut();
      }

      // Switch to guest mode after sign out
      const guestUser = createGuestUser();
      setUser(guestUser);
    } catch (err) {
      const appError = handleAsyncError(err, 'User signout');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, supabaseService, createGuestUser]);

  /**
   * Upgrade from guest to authenticated user
   */
  const upgradeToAuthenticated = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseService.isConfigured()) {
        throw new Error('Authentication service is not available. Please continue as guest.');
      }

      // Sign up the user
      const authenticatedUser = await supabaseService.signUp(email, password);

      // Always clear local data - start fresh with authenticated account
      await storageService.clearAllData();

      setUser(authenticatedUser);
    } catch (err) {
      const appError = handleAsyncError(err, 'Upgrade to authenticated');
      setError(appError.message);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [supabaseService, storageService]);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if Supabase is properly configured
      if (!supabaseService.isConfigured()) {
        console.warn('Supabase not configured, starting in guest mode');
        const guestUser = createGuestUser();
        setUser(guestUser);
        return;
      }

      // Check if user is already authenticated with Supabase
      const currentUser = await supabaseService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
      } else {
        // No authenticated user, but we don't want to automatically create a guest user
        // Let the user choose on the welcome screen
        setUser(null);
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      // If there's an error, clear any cached session and let user choose
      try {
        await supabaseService.signOut();
      } catch (signOutError) {
        console.warn('Failed to sign out during initialization:', signOutError);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabaseService, createGuestUser]);

  /**
   * Force show auth screens (for account creation/sign in from settings)
   */
  const showAuthScreens = useCallback(() => {
    setForceAuthScreen(true);
    setUser(null);
  }, []);

  /**
   * Delete user account and all data
   */
  const deleteAccount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated) {
        throw new Error('Cannot delete account: user not authenticated');
      }

      // Delete account from Supabase (includes all user data)
      await supabaseService.deleteAccount();

      // Switch to guest mode after successful deletion
      const guestUser = createGuestUser();
      setUser(guestUser);
    } catch (err) {
      const appError = handleAsyncError(err, 'Delete account');
      setError(appError.message);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, supabaseService, createGuestUser]);

  /**
   * Handle session refresh
   */
  const refreshSession = useCallback(async () => {
    try {
      if (!isAuthenticated) return;

      const refreshedUser = await supabaseService.refreshSession();
      if (refreshedUser) {
        setUser(refreshedUser);
      } else {
        // Session refresh failed, switch to guest mode
        await switchToGuest();
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      // If refresh fails, switch to guest mode
      await switchToGuest();
    }
  }, [isAuthenticated, supabaseService, switchToGuest]);

  /**
   * Handle deep link authentication
   */
  const handleDeepLinkAuth = useCallback(async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await supabaseService.handleDeepLinkAuth(url);

      if (result.success) {
        const currentUser = await supabaseService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setForceAuthScreen(false);
          return { success: true };
        }
      }

      if (result.error) {
        setError(result.error);
      }

      return { success: false, error: result.error };
    } catch (err) {
      const appError = handleAsyncError(err, 'Deep link authentication');
      setError(appError.message);
      return { success: false, error: appError.message };
    } finally {
      setLoading(false);
    }
  }, [supabaseService]);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up session refresh interval for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh session every 50 minutes (tokens expire after 1 hour)
    const refreshInterval = setInterval(refreshSession, 50 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshSession]);

  return {
    user: forceAuthScreen ? null : user,
    isAuthenticated,
    isGuest,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    switchToGuest,
    upgradeToAuthenticated,
    deleteAccount,
    showAuthScreens,
    resetPassword,
    updatePassword,
    handleDeepLinkAuth,
    clearError
  };
}