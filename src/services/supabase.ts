import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { APP_CONFIG, DB_TABLES } from '../constants/config';
import type {
  DailyGoalCompletion,
  Expense,
  GoalTemplate,

  SupabaseServiceInterface,
  User,
  WeeklyReport
} from '../types';
import {
  createAuthError,
  createNetworkError,
  createStorageError,
  handleAsyncError,
  retryWithBackoff
} from '../utils/errors';

/**
 * Supabase service for TallyGO
 * Handles authentication and database operations
 */
export class SupabaseService implements SupabaseServiceInterface {
  private static instance: SupabaseService;
  private client: SupabaseClient;
  private currentUser: User | null = null;

  private constructor() {
    this.client = createClient(
      APP_CONFIG.supabaseUrl,
      APP_CONFIG.supabaseAnonKey
    );
  }
  handleDeepLinkAuth(url: string): Promise<{
    success: boolean; error
    // The user will be set when they click the email link and the session is established
    ? // Don't set currentUser yet - wait for email confirmation
    : string;
  }> {
    throw new Error('Method not implemented.');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Check if Supabase client is properly configured
   */
  public isConfigured(): boolean {
    return !!(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);
  }

  /**
   * Test connection to Supabase
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from(DB_TABLES.USERS).select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * Check connection health with retry
   */
  public async checkConnectionHealth(): Promise<{ isHealthy: boolean; error?: string; }> {
    try {
      const isHealthy = await retryWithBackoff(
        () => this.testConnection(),
        2, // Max 2 retries for health check
        1000 // 1 second base delay
      );

      return { isHealthy };
    } catch (error) {
      const appError = handleAsyncError(error, 'Connection health check');
      return {
        isHealthy: false,
        error: appError.message
      };
    }
  }

  /**
   * Get current authenticated user from Supabase
   */
  private async getSupabaseUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) {
        // Don't log auth session missing errors as they're expected for guest users
        if (error.message !== 'Auth session missing!') {
          console.error('Error getting Supabase user:', error);
        }
        return null;
      }
      return user;
    } catch (error) {
      // Don't log auth session missing errors as they're expected for guest users
      if (error instanceof Error && error.message !== 'Auth session missing!') {
        console.error('Error getting Supabase user:', error);
      }
      return null;
    }
  }

  /**
   * Convert Supabase user to app User type
   */
  private convertSupabaseUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      isGuest: false,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at || supabaseUser.created_at
    };
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Sign up new user with proper email confirmation
   */
  public async signUp(email: string, password: string, redirectURL?: string): Promise<User> {
    try {
      if (!this.isConfigured()) {
        throw createAuthError('Supabase is not properly configured');
      }

      // Use the provided redirect URL or default to deep link
      const emailRedirectTo = redirectURL || 'tallygo://auth';

      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        }
      });

      if (error) {
        // Handle specific signup errors
        if (error.message.includes('already registered')) {
          throw createAuthError('An account with this email already exists. Please sign in instead.');
        }
        throw createAuthError(error.message, error);
      }

      if (!data.user) throw createAuthError('No user returned from signup');

      console.log('User signed up successfully. Please check your email for confirmation link.');

      // DO NOT create user record immediately - wait for email confirmation
      // The trigger on_auth_user_created will handle this automatically when the user confirms their email
      // The user record will be created when they click the email confirmation link

      // Don't set currentUser yet - wait for email confirmation
      // The user will be set when they click the email link and the session is established

      return {
        id: data.user.id,
        email: data.user.email,
        isGuest: false,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at
      };
    } catch (error) {
      throw handleAsyncError(error, 'User signup');
    }
  }

  /**
   * Set session using access and refresh tokens (for deep linking)
   */
  public async setSession(accessToken: string, refreshToken: string): Promise<{ error: any; }> {
    try {
      const { data, error } = await this.client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error('Error setting session:', error);
        return { error };
      }

      if (data.user) {
        const user = this.convertSupabaseUser(data.user);
        this.currentUser = user;

        // Ensure user record exists in our users table
        try {
          console.log('Creating user record for session user:', data.user.id);

          const { error: rpcError } = await this.client
            .rpc('ensure_user_record', { user_id: data.user.id });

          if (rpcError) {
            console.warn('Failed to create user record via RPC during session set:', rpcError);

            // Try direct insert as fallback
            try {
              const { error: insertError } = await this.client
                .from(DB_TABLES.USERS)
                .insert([{
                  id: data.user.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]);

              if (insertError) {
                console.warn('Failed to create user record via direct insert during session set:', insertError);
              } else {
                console.log('User record created successfully via direct insert during session set');
              }
            } catch (insertError) {
              console.warn('Both RPC and direct insert failed during session set:', insertError);
            }
          } else {
            console.log('User record created successfully via RPC during session set');
          }
        } catch (userTableError) {
          console.warn('Error during user record creation in session set:', userTableError);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Error in setSession:', error);
      return { error };
    }
  }


  /**
   * Send password reset email
   */
  public async resetPassword(email: string, redirectURL?: string): Promise<void> {
    try {
      if (!this.isConfigured()) {
        throw createAuthError('Supabase is not properly configured');
      }

      // Use the provided redirect URL or default to deep link
      const emailRedirectTo = redirectURL || 'tallygo://auth';

      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: emailRedirectTo,
      });

      if (error) {
        throw createAuthError(error.message, error);
      }

      console.log('Password reset email sent successfully');
    } catch (error) {
      throw handleAsyncError(error, 'Reset password');
    }
  }

  /**
   * Update user password (after password reset)
   */
  public async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw createAuthError(error.message, error);
      }

      console.log('Password updated successfully');
    } catch (error) {
      throw handleAsyncError(error, 'Update password');
    }
  }



  /**
   * Sign in existing user
   */
  public async signIn(email: string, password: string): Promise<User> {
    try {
      if (!this.isConfigured()) {
        throw createAuthError('Supabase is not properly configured');
      }

      // Try to sign in
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Handle specific auth errors with better user messages
        if (error.message === 'Email not confirmed') {
          throw createAuthError('Please confirm your email by clicking the link we sent to your inbox.');
        } else if (error.message === 'Invalid login credentials') {
          throw createAuthError('Invalid email or password. Please check your credentials and try again.');
        } else {
          throw createAuthError(error.message, error);
        }
      }

      if (!data.user) throw createAuthError('No user returned from signin');

      // Check if email is confirmed
      if (!data.user.email_confirmed_at) {
        throw createAuthError('Please confirm your email by clicking the link we sent to your inbox.');
      }

      // Ensure user record exists in our users table
      try {
        const { data: existingUser, error: selectError } = await this.client
          .from(DB_TABLES.USERS)
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (selectError && selectError.code === 'PGRST116') {
          // User record doesn't exist, create it
          console.log('Creating user record for signed-in user:', data.user.id);

          const { error: rpcError } = await this.client
            .rpc('ensure_user_record', { user_id: data.user.id });

          if (rpcError) {
            console.warn('Failed to create user record on signin via RPC:', rpcError);

            // Try direct insert as fallback
            try {
              const { error: insertError } = await this.client
                .from(DB_TABLES.USERS)
                .insert([{
                  id: data.user.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]);

              if (insertError) {
                console.warn('Failed to create user record via direct insert on signin:', insertError);
              } else {
                console.log('User record created successfully via direct insert on signin');
              }
            } catch (insertError) {
              console.warn('Both RPC and direct insert failed on signin:', insertError);
            }
          } else {
            console.log('User record created successfully via RPC on signin');
          }
        }
      } catch (userTableError) {
        console.warn('Error checking/creating user record on signin:', userTableError);
        // Continue without creating user record - auth user exists
      }

      const user = this.convertSupabaseUser(data.user);
      this.currentUser = user;
      return user;
    } catch (error) {
      throw handleAsyncError(error, 'User signin');
    }
  }

  /**
   * Sign out current user
   */
  public async signOut(): Promise<void> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) {
        // Log the error but don't throw for certain expected errors
        if (error.message === 'Auth session missing!' || error.message.includes('session')) {
          console.warn('Sign out called but no session exists:', error.message);
        } else {
          throw createAuthError(error.message, error);
        }
      }

      this.currentUser = null;
    } catch (error) {
      // Clear the current user even if sign out fails
      this.currentUser = null;
      throw handleAsyncError(error, 'User signout');
    }
  }

  /**
   * Get current user
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      if (this.currentUser) return this.currentUser;

      const supabaseUser = await this.getSupabaseUser();
      if (!supabaseUser) return null;

      const user = this.convertSupabaseUser(supabaseUser);
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Refresh user session
   */
  public async refreshSession(): Promise<User | null> {
    try {
      const { data, error } = await this.client.auth.refreshSession();
      if (error) throw createAuthError(error.message, error);
      if (!data.user) return null;

      const user = this.convertSupabaseUser(data.user);
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  }

  /**
   * Delete user account and all associated data
   */
  public async deleteAccount(): Promise<void> {
    try {
      const userId = await this.ensureAuthenticated();

      // Delete all user data in the correct order (respecting foreign key constraints)
      // 1. Delete daily goal completions first
      await this.client
        .from(DB_TABLES.DAILY_GOAL_COMPLETIONS)
        .delete()
        .eq('user_id', userId);

      // 2. Delete weekly reports
      await this.client
        .from(DB_TABLES.WEEKLY_REPORTS)
        .delete()
        .eq('user_id', userId);

      // 3. Delete goal templates
      await this.client
        .from(DB_TABLES.GOAL_TEMPLATES)
        .delete()
        .eq('user_id', userId);

      // 4. Delete expenses
      await this.client
        .from(DB_TABLES.EXPENSES)
        .delete()
        .eq('user_id', userId);

      // 5. Delete user record
      await this.client
        .from(DB_TABLES.USERS)
        .delete()
        .eq('id', userId);

      // 6. Finally, delete the auth user (this will cascade delete everything if RLS is properly configured)
      const { error: authError } = await this.client.auth.admin.deleteUser(userId);

      // Note: admin.deleteUser requires service role key, which we don't have in client
      // So we'll use the user's own session to delete their account
      const { error } = await this.client.rpc('delete_user_account');

      if (error) {
        console.warn('Could not delete auth user via RPC, user will need to be cleaned up manually:', error);
        // Don't throw here as the data cleanup was successful
      }

      this.currentUser = null;
    } catch (error) {
      throw handleAsyncError(error, 'Delete account');
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Ensure user is authenticated and user record exists
   */
  private async ensureAuthenticated(): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw createAuthError('User not authenticated');
    }

    // Ensure user record exists in our users table
    try {
      const { data: existingUser, error: selectError } = await this.client
        .from(DB_TABLES.USERS)
        .select('id')
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code === 'PGRST116') {
        // User record doesn't exist, create it using the RPC function
        console.log('Creating user record for authenticated user:', user.id);

        const { error: rpcError } = await this.client
          .rpc('ensure_user_record', { user_id: user.id });

        if (rpcError) {
          console.error('Failed to create user record via RPC:', rpcError);

          // If RPC fails, try direct insert as fallback
          try {
            const { error: insertError } = await this.client
              .from(DB_TABLES.USERS)
              .insert([{
                id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);

            if (insertError) {
              console.error('Failed to create user record via direct insert:', insertError);
              throw createStorageError(`Failed to create user record: ${insertError.message}`);
            }

            console.log('User record created successfully via direct insert');
          } catch (insertError) {
            console.error('Both RPC and direct insert failed:', insertError);
            throw createStorageError(`Failed to create user record: ${rpcError.message}`);
          }
        } else {
          console.log('User record created successfully via RPC');
        }
      }
    } catch (userTableError) {
      console.warn('Error checking/creating user record:', userTableError);
      // Don't throw here - let the operation continue if user record creation fails
      // The user is still authenticated even if the user record doesn't exist
    }

    return user.id;
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(error: any, operation: string): never {
    console.error(`Database error during ${operation}:`, error);

    if (error.code === 'PGRST116') {
      throw createStorageError(`No data found for ${operation}`);
    }

    if (error.message?.includes('network')) {
      throw createNetworkError(`Network error during ${operation}: ${error.message}`);
    }

    throw createStorageError(`Database error during ${operation}: ${error.message || 'Unknown error'}`);
  }

  // ============================================================================
  // Expense Database Operations
  // ============================================================================

  /**
   * Get all expenses for the current user
   */
  public async getExpenses(): Promise<Expense[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await this.client
        .from(DB_TABLES.EXPENSES)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) this.handleDatabaseError(error, 'get expenses');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Get expenses');
    }
  }

  /**
   * Add a new expense
   */
  public async addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    try {
      const userId = await this.ensureAuthenticated();

      const newExpense = {
        ...expense,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(DB_TABLES.EXPENSES)
        .insert([newExpense])
        .select()
        .single();

      if (error) this.handleDatabaseError(error, 'add expense');
      if (!data) throw createStorageError('No data returned from expense creation');

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Add expense');
    }
  }

  /**
   * Update an existing expense
   */
  public async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      const userId = await this.ensureAuthenticated();

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(DB_TABLES.EXPENSES)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) this.handleDatabaseError(error, 'update expense');
      if (!data) throw createStorageError('Expense not found or not authorized');

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Update expense');
    }
  }

  /**
   * Delete an expense
   */
  public async deleteExpense(id: string): Promise<void> {
    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await this.client
        .from(DB_TABLES.EXPENSES)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) this.handleDatabaseError(error, 'delete expense');
    } catch (error) {
      throw handleAsyncError(error, 'Delete expense');
    }
  }

  /**
   * Batch insert expenses (for sync efficiency)
   */
  public async batchInsertExpenses(expenses: Omit<Expense, 'id' | 'created_at' | 'updated_at'>[]): Promise<Expense[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const now = new Date().toISOString();
      const expensesWithMeta = expenses.map(expense => ({
        ...expense,
        user_id: userId,
        created_at: now,
        updated_at: now
      }));

      const { data, error } = await this.client
        .from(DB_TABLES.EXPENSES)
        .insert(expensesWithMeta)
        .select();

      if (error) this.handleDatabaseError(error, 'batch insert expenses');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Batch insert expenses');
    }
  }

  /**
   * Batch update expenses (for sync efficiency)
   */
  public async batchUpdateExpenses(updates: Array<{ id: string; updates: Partial<Expense>; }>): Promise<Expense[]> {
    try {
      const userId = await this.ensureAuthenticated();
      const results: Expense[] = [];

      // Process updates in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        const batchPromises = batch.map(({ id, updates: updateData }) =>
          this.updateExpense(id, updateData)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      throw handleAsyncError(error, 'Batch update expenses');
    }
  }

  /**
   * Get expenses for a specific date range
   */
  public async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await this.client
        .from(DB_TABLES.EXPENSES)
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) this.handleDatabaseError(error, 'get expenses by date range');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Get expenses by date range');
    }
  }

  /**
   * Resolve expense sync conflicts using last-write-wins strategy
   */
  public async resolveExpenseConflict(localExpense: Expense, serverExpense: Expense): Promise<Expense> {
    try {
      // Use last-write-wins strategy based on updated_at timestamp
      const localTime = new Date(localExpense.updated_at || localExpense.created_at).getTime();
      const serverTime = new Date(serverExpense.updated_at || serverExpense.created_at).getTime();

      if (localTime > serverTime) {
        // Local version is newer, update server
        return await this.updateExpense(localExpense.id, {
          content: localExpense.content,
          price: localExpense.price,
          date: localExpense.date
        });
      } else {
        // Server version is newer or same, return server version
        return serverExpense;
      }
    } catch (error) {
      throw handleAsyncError(error, 'Resolve expense conflict');
    }
  }

  // ============================================================================
  // Goal Template Database Operations
  // ============================================================================

  /**
   * Get all goal templates for the current user
   */
  public async getGoalTemplates(): Promise<GoalTemplate[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await this.client
        .from(DB_TABLES.GOAL_TEMPLATES)
        .select('*')
        .eq('user_id', userId)
        .order('day_of_week', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) this.handleDatabaseError(error, 'get goal templates');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Get goal templates');
    }
  }

  /**
   * Add a new goal template
   */
  public async addGoalTemplate(template: Omit<GoalTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<GoalTemplate> {
    try {
      const userId = await this.ensureAuthenticated();

      const newTemplate = {
        ...template,
        user_id: userId,
        created_at: new Date().toISOString()
      };

      // Try with updated_at first (as per schema), then fallback without it
      let data, error;

      // First attempt: with updated_at
      const templateWithUpdatedAt = {
        ...newTemplate,
        updated_at: new Date().toISOString()
      };

      const firstResult = await this.client
        .from(DB_TABLES.GOAL_TEMPLATES)
        .insert([templateWithUpdatedAt])
        .select()
        .single();

      if (firstResult.error && firstResult.error.message?.includes('updated_at')) {
        console.warn('updated_at column not found in schema cache, retrying without it');

        // Second attempt: without updated_at
        const secondResult = await this.client
          .from(DB_TABLES.GOAL_TEMPLATES)
          .insert([newTemplate])
          .select()
          .single();

        data = secondResult.data;
        error = secondResult.error;
      } else {
        data = firstResult.data;
        error = firstResult.error;
      }

      if (error) this.handleDatabaseError(error, 'add goal template');

      if (!data) throw createStorageError('No data returned from goal template creation');

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Add goal template');
    }
  }

  /**
   * Update an existing goal template
   */
  public async updateGoalTemplate(id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate> {
    try {
      const userId = await this.ensureAuthenticated();

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(DB_TABLES.GOAL_TEMPLATES)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) this.handleDatabaseError(error, 'update goal template');
      if (!data) throw createStorageError('Goal template not found or not authorized');

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Update goal template');
    }
  }

  /**
   * Delete a goal template
   */
  public async deleteGoalTemplate(id: string): Promise<void> {
    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await this.client
        .from(DB_TABLES.GOAL_TEMPLATES)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) this.handleDatabaseError(error, 'delete goal template');
    } catch (error) {
      throw handleAsyncError(error, 'Delete goal template');
    }
  }

  // ============================================================================
  // Daily Goal Completion Database Operations
  // ============================================================================

  /**
   * Get daily goal completions for a specific date or date range
   */
  public async getDailyCompletions(date?: string): Promise<DailyGoalCompletion[]> {
    try {
      const userId = await this.ensureAuthenticated();

      let query = this.client
        .from(DB_TABLES.DAILY_GOAL_COMPLETIONS)
        .select('*')
        .eq('user_id', userId);

      if (date) {
        query = query.eq('completion_date', date);
      }

      const { data, error } = await query.order('completion_date', { ascending: false });

      if (error) this.handleDatabaseError(error, 'get daily completions');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Get daily completions');
    }
  }

  /**
   * Update or create a goal completion
   */
  public async updateGoalCompletion(completion: Omit<DailyGoalCompletion, 'id' | 'created_at'>): Promise<DailyGoalCompletion> {
    try {
      const userId = await this.ensureAuthenticated();

      const completionData = {
        ...completion,
        user_id: userId,
        completed_at: completion.is_completed ? new Date().toISOString() : null
      };

      // Use upsert to handle both create and update cases
      const { data, error } = await this.client
        .from(DB_TABLES.DAILY_GOAL_COMPLETIONS)
        .upsert([completionData], {
          onConflict: 'goal_template_id,completion_date'
        })
        .select()
        .single();

      if (error) this.handleDatabaseError(error, 'update goal completion');
      if (!data) throw createStorageError('No data returned from goal completion update');

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Update goal completion');
    }
  }

  /**
   * Get completions for a specific week
   */
  public async getWeeklyCompletions(weekStartDate: string): Promise<DailyGoalCompletion[]> {
    try {
      const userId = await this.ensureAuthenticated();

      // Calculate week end date (6 days after start)
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const { data, error } = await this.client
        .from(DB_TABLES.DAILY_GOAL_COMPLETIONS)
        .select('*')
        .eq('user_id', userId)
        .gte('completion_date', weekStartDate)
        .lte('completion_date', endDate.toISOString().split('T')[0])
        .order('completion_date', { ascending: true });

      if (error) this.handleDatabaseError(error, 'get weekly completions');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Get weekly completions');
    }
  }

  // ============================================================================
  // Weekly Report Database Operations
  // ============================================================================

  /**
   * Get all weekly reports for the current user
   */
  public async getWeeklyReports(): Promise<WeeklyReport[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await this.client
        .from(DB_TABLES.WEEKLY_REPORTS)
        .select('*')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false });

      if (error) this.handleDatabaseError(error, 'get weekly reports');

      return data || [];
    } catch (error) {
      throw handleAsyncError(error, 'Get weekly reports');
    }
  }

  /**
   * Add a new weekly report
   */
  public async addWeeklyReport(report: Omit<WeeklyReport, 'id' | 'generated_at'>): Promise<WeeklyReport> {
    try {
      const userId = await this.ensureAuthenticated();

      const newReport = {
        ...report,
        user_id: userId,
        generated_at: new Date().toISOString()
      };

      // Use upsert to handle duplicate week reports
      const { data, error } = await this.client
        .from(DB_TABLES.WEEKLY_REPORTS)
        .upsert([newReport], {
          onConflict: 'user_id,week_start_date'
        })
        .select()
        .single();

      if (error) this.handleDatabaseError(error, 'add weekly report');
      if (!data) throw createStorageError('No data returned from weekly report creation');

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Add weekly report');
    }
  }

  /**
   * Get a specific weekly report
   */
  public async getWeeklyReport(weekStartDate: string): Promise<WeeklyReport | null> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await this.client
        .from(DB_TABLES.WEEKLY_REPORTS)
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return null
          return null;
        }
        this.handleDatabaseError(error, 'get weekly report');
      }

      return data;
    } catch (error) {
      throw handleAsyncError(error, 'Get weekly report');
    }
  }


}

// Export singleton instance for easy access
export const supabaseService = SupabaseService.getInstance();