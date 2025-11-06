import * as Linking from 'expo-linking';
import { SupabaseService } from './supabase';

/**
 * Deep linking service for handling authentication redirects
 */
export class LinkingService {
  private static instance: LinkingService;
  private supabaseService: SupabaseService;

  private constructor() {
    this.supabaseService = SupabaseService.getInstance();
  }

  public static getInstance(): LinkingService {
    if (!LinkingService.instance) {
      LinkingService.instance = new LinkingService();
    }
    return LinkingService.instance;
  }

  /**
   * Initialize deep linking listeners
   */
  public initialize() {
    // Handle initial URL if app was opened via deep link
    this.handleInitialURL();

    // Listen for incoming URLs while app is running
    const subscription = Linking.addEventListener('url', this.handleIncomingURL);

    return () => {
      subscription?.remove();
    };
  }

  /**
   * Handle initial URL when app is opened via deep link
   */
  private async handleInitialURL(): Promise<void> {
    try {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        await this.processAuthURL(initialURL);
      }
    } catch (error) {
      console.error('Error handling initial URL:', error);
    }
  }

  /**
   * Handle incoming URLs while app is running
   */
  private handleIncomingURL = async (event: { url: string; }): Promise<void> => {
    try {
      await this.processAuthURL(event.url);
    } catch (error) {
      console.error('Error handling incoming URL:', error);
    }
  };

  /**
   * Process authentication URLs from Supabase
   */
  private async processAuthURL(url: string): Promise<void> {
    try {
      const parsed = Linking.parse(url);

      // Check if this is a Supabase auth callback
      if (parsed.path === '/auth' || parsed.queryParams?.type) {
        const { queryParams } = parsed;

        if (queryParams?.type === 'signup' && queryParams?.access_token && queryParams?.refresh_token) {
          // Handle email confirmation
          await this.handleEmailConfirmation(queryParams);
        } else if (queryParams?.type === 'recovery' && queryParams?.access_token && queryParams?.refresh_token) {
          // Handle password reset
          await this.handlePasswordReset(queryParams);
        }
      }
    } catch (error) {
      console.error('Error processing auth URL:', error);
    }
  }

  /**
   * Handle email confirmation from Supabase
   */
  private async handleEmailConfirmation(params: any): Promise<void> {
    try {
      console.log('Handling email confirmation via deep link');

      // Set the session using the tokens from the URL
      const { error } = await this.supabaseService.setSession(
        params.access_token,
        params.refresh_token
      );

      if (error) {
        console.error('Error setting session from email confirmation:', error);
        return;
      }

      console.log('Email confirmed successfully via deep link');

      // You could emit an event here or update global state
      // to notify the app that email confirmation was successful

    } catch (error) {
      console.error('Error handling email confirmation:', error);
    }
  }

  /**
   * Handle password reset from Supabase
   */
  private async handlePasswordReset(params: any): Promise<void> {
    try {
      console.log('Handling password reset via deep link');

      // Set the session using the tokens from the URL
      const { error } = await this.supabaseService.setSession(
        params.access_token,
        params.refresh_token
      );

      if (error) {
        console.error('Error setting session from password reset:', error);
        return;
      }

      console.log('Password reset session established via deep link');

      // Store a flag to indicate password reset is in progress
      if (typeof window !== 'undefined') {
        localStorage.setItem('password_reset_active', 'true');
      }

      // The app should navigate to the password reset screen
      // This will be handled by the navigation logic

    } catch (error) {
      console.error('Error handling password reset:', error);
    }
  }

  /**
   * Get the app's deep link URL for Supabase configuration
   */
  public getAuthRedirectURL(): string {
    const scheme = Linking.createURL('/auth');
    return scheme;
  }

  /**
   * Get development redirect URL for Expo
   */
  public getDevRedirectURL(): string {
    // For Expo development, use the dev server URL
    const devURL = Linking.createURL('/auth');
    return devURL;
  }
}