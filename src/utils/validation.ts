import type { DailyGoalCompletion, Expense, GoalTemplate, WeeklyReport } from '../types';

/**
 * Validation utilities for TallyGO data types
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate expense data
 */
export function validateExpense(expense: Partial<Expense>): ValidationResult {
  const errors: string[] = [];

  if (!expense.content || expense.content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (expense.content && expense.content.length > 200) {
    errors.push('Content must be less than 200 characters');
  }

  if (expense.price === undefined || expense.price === null) {
    errors.push('Price is required');
  }

  if (expense.price !== undefined && expense.price < 0) {
    errors.push('Price must be positive');
  }

  if (expense.price !== undefined && expense.price > 999999999.99) {
    errors.push('Price is too large');
  }

  if (!expense.date) {
    errors.push('Date is required');
  }

  if (expense.date && !isValidDateString(expense.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate goal template data
 */
export function validateGoalTemplate(template: Partial<GoalTemplate>): ValidationResult {
  const errors: string[] = [];

  if (!template.title || template.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (template.title && template.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  if (template.day_of_week === undefined || template.day_of_week === null) {
    errors.push('Day of week is required');
  }

  if (template.day_of_week !== undefined && (template.day_of_week < 1 || template.day_of_week > 7)) {
    errors.push('Day of week must be between 1 and 7 (Monday=1)');
  }

  if (template.order_index !== undefined && template.order_index < 0) {
    errors.push('Order index must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate daily goal completion data
 */
export function validateDailyGoalCompletion(completion: Partial<DailyGoalCompletion>): ValidationResult {
  const errors: string[] = [];

  if (!completion.goal_template_id) {
    errors.push('Goal template ID is required');
  }

  if (!completion.completion_date) {
    errors.push('Completion date is required');
  }

  if (completion.completion_date && !isValidDateString(completion.completion_date)) {
    errors.push('Completion date must be in YYYY-MM-DD format');
  }

  if (completion.is_completed === undefined || completion.is_completed === null) {
    errors.push('Completion status is required');
  }

  if (completion.is_completed && !completion.completed_at) {
    errors.push('Completed at timestamp is required when goal is completed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate weekly report data
 */
export function validateWeeklyReport(report: Partial<WeeklyReport>): ValidationResult {
  const errors: string[] = [];

  if (!report.week_start_date) {
    errors.push('Week start date is required');
  }

  if (report.week_start_date && !isValidDateString(report.week_start_date)) {
    errors.push('Week start date must be in YYYY-MM-DD format');
  }

  if (!report.report_data) {
    errors.push('Report data is required');
  }

  if (report.report_data) {
    if (!Array.isArray(report.report_data.goals)) {
      errors.push('Report data must contain goals array');
    }

    if (typeof report.report_data.overall_completion_rate !== 'number') {
      errors.push('Overall completion rate must be a number');
    }

    if (report.report_data.overall_completion_rate < 0 || report.report_data.overall_completion_rate > 1) {
      errors.push('Overall completion rate must be between 0 and 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult;
export function validateEmail(email: string): boolean;
export function validateEmail(email: string): ValidationResult | boolean {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  }

  if (email && !emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  const result = {
    isValid: errors.length === 0,
    errors
  };

  // Return boolean for simple usage
  if (arguments.length === 1) {
    return emailRegex.test(email);
  }

  return result;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  }

  if (password && password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (password && password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Simple email validation (returns boolean)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid date in YYYY-MM-DD format
 */
export function isValidDateString(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString + 'T00:00:00.000Z');
  return date.toISOString().startsWith(dateString);
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Validate and sanitize expense input
 */
export function sanitizeExpenseInput(input: {
  content: string;
  price: number | string;
  date: string;
}): { content: string; price: number; date: string; } {
  return {
    content: sanitizeString(input.content),
    price: typeof input.price === 'string' ? parseFloat(input.price) : input.price,
    date: input.date.trim()
  };
}

/**
 * Validate and sanitize goal template input
 */
export function sanitizeGoalTemplateInput(input: {
  title: string;
  day_of_week: number | string;
  order_index?: number | string;
}): { title: string; day_of_week: number; order_index: number; } {
  return {
    title: sanitizeString(input.title),
    day_of_week: typeof input.day_of_week === 'string' ? parseInt(input.day_of_week) : input.day_of_week,
    order_index: input.order_index
      ? (typeof input.order_index === 'string' ? parseInt(input.order_index) : input.order_index)
      : 0
  };
}