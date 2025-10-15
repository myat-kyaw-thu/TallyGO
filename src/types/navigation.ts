// ============================================================================
// Navigation Types for TallyGO
// ============================================================================

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  EmailConfirmation: { email: string; };
  Main: undefined;
};

export type MainTabParamList = {
  Expenses: undefined;
  Goals: undefined;
  Settings: undefined;
};

export type GoalsStackParamList = {
  Dashboard: undefined;
  Templates: undefined;
  Reports: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Account: undefined;
  DataManagement: undefined;
};

// Navigation prop types for screens
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

// Root Stack Navigation Props
export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;

export type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;
export type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
export type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
export type EmailConfirmationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EmailConfirmation'>;

// Main Tab Navigation Props
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

export type ExpensesTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Expenses'>,
  StackNavigationProp<RootStackParamList>
>;

export type GoalsTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Goals'>,
  CompositeNavigationProp<
    StackNavigationProp<GoalsStackParamList>,
    StackNavigationProp<RootStackParamList>
  >
>;

export type SettingsTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Settings'>,
  CompositeNavigationProp<
    StackNavigationProp<SettingsStackParamList>,
    StackNavigationProp<RootStackParamList>
  >
>;

export type SettingsMainScreenNavigationProp = StackNavigationProp<SettingsStackParamList, 'SettingsMain'>;
export type DataManagementScreenNavigationProp = StackNavigationProp<SettingsStackParamList, 'DataManagement'>;
export type AccountScreenNavigationProp = StackNavigationProp<SettingsStackParamList, 'Account'>;

// Route Props
export type WelcomeScreenRouteProp = RouteProp<RootStackParamList, 'Welcome'>;
export type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;
export type SignUpScreenRouteProp = RouteProp<RootStackParamList, 'SignUp'>;
export type EmailConfirmationScreenRouteProp = RouteProp<RootStackParamList, 'EmailConfirmation'>;

export type ExpensesTabRouteProp = RouteProp<MainTabParamList, 'Expenses'>;
export type GoalsTabRouteProp = RouteProp<MainTabParamList, 'Goals'>;
export type SettingsTabRouteProp = RouteProp<MainTabParamList, 'Settings'>;

export type SettingsMainScreenRouteProp = RouteProp<SettingsStackParamList, 'SettingsMain'>;
export type DataManagementScreenRouteProp = RouteProp<SettingsStackParamList, 'DataManagement'>;
export type AccountScreenRouteProp = RouteProp<SettingsStackParamList, 'Account'>;

// Screen Props (combining navigation and route)
export interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
  route: WelcomeScreenRouteProp;
}

export interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
}

export interface SignUpScreenProps {
  navigation: SignUpScreenNavigationProp;
  route: SignUpScreenRouteProp;
}

export interface EmailConfirmationScreenProps {
  navigation: EmailConfirmationScreenNavigationProp;
  route: EmailConfirmationScreenRouteProp;
}

export interface ExpensesTabProps {
  navigation: ExpensesTabNavigationProp;
  route: ExpensesTabRouteProp;
}

export interface GoalsTabProps {
  navigation: GoalsTabNavigationProp;
  route: GoalsTabRouteProp;
}

export interface SettingsTabProps {
  navigation: SettingsTabNavigationProp;
  route: SettingsTabRouteProp;
}

export interface SettingsMainScreenProps {
  navigation: SettingsMainScreenNavigationProp;
  route: SettingsMainScreenRouteProp;
}

export interface DataManagementScreenProps {
  navigation: DataManagementScreenNavigationProp;
  route: DataManagementScreenRouteProp;
}

export interface AccountScreenProps {
  navigation: AccountScreenNavigationProp;
  route: AccountScreenRouteProp;
}