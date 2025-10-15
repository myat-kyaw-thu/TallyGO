import type {
  DailyGoalCompletion,
  GoalTemplate,
  WeeklyReport
} from '../types';
import { addDays, formatDateToString, getWeekStart } from '../utils/date';
import { calculateCompletionRate } from '../utils/helpers';

/**
 * Weekly Report Service
 * Handles calculation and generation of weekly progress reports
 */
export class WeeklyReportService {
  /**
   * Calculate completion statistics for a goal template within a specific week
   */
  static calculateGoalStats(
    template: GoalTemplate,
    weekStartDate: string,
    completions: DailyGoalCompletion[]
  ): {
    template_id: string;
    title: string;
    completions: number;
    total_days: number;
    completion_rate: number;
  } {
    const startDate = new Date(weekStartDate);

    // Count how many days this template should appear in the week
    let totalDays = 0;
    const templateCompletions: DailyGoalCompletion[] = [];

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      const dayOfWeek = checkDate.getDay() === 0 ? 7 : checkDate.getDay();
      const dateString = formatDateToString(checkDate);

      if (template.day_of_week === dayOfWeek) {
        totalDays++;

        // Find completion for this date
        const completion = completions.find(
          c => c.goal_template_id === template.id &&
            c.completion_date === dateString &&
            c.is_completed
        );

        if (completion) {
          templateCompletions.push(completion);
        }
      }
    }

    const completionRate = calculateCompletionRate(templateCompletions.length, totalDays);

    return {
      template_id: template.id,
      title: template.title,
      completions: templateCompletions.length,
      total_days: totalDays,
      completion_rate: completionRate
    };
  }

  /**
   * Calculate overall completion rate for all goals in a week
   */
  static calculateOverallCompletionRate(
    goalStats: Array<{
      completions: number;
      total_days: number;
    }>
  ): number {
    const totalPossible = goalStats.reduce((sum, stat) => sum + stat.total_days, 0);
    const totalCompleted = goalStats.reduce((sum, stat) => sum + stat.completions, 0);

    return calculateCompletionRate(totalCompleted, totalPossible);
  }

  /**
   * Generate weekly report data structure
   */
  static generateReportData(
    goalTemplates: GoalTemplate[],
    completions: DailyGoalCompletion[],
    weekStartDate: string
  ): WeeklyReport['report_data'] {
    // Only include active templates
    const activeTemplates = goalTemplates.filter(template => template.is_active);

    // Calculate stats for each goal template
    const goalStats = activeTemplates.map(template =>
      this.calculateGoalStats(template, weekStartDate, completions)
    );

    // Calculate overall completion rate
    const overallCompletionRate = this.calculateOverallCompletionRate(goalStats);

    return {
      goals: goalStats,
      overall_completion_rate: overallCompletionRate
    };
  }

  /**
   * Create a complete weekly report object
   */
  static createWeeklyReport(
    userId: string,
    goalTemplates: GoalTemplate[],
    completions: DailyGoalCompletion[],
    weekStartDate: string
  ): Omit<WeeklyReport, 'id' | 'generated_at'> {
    const reportData = this.generateReportData(goalTemplates, completions, weekStartDate);

    return {
      user_id: userId,
      week_start_date: weekStartDate,
      report_data: reportData
    };
  }

  /**
   * Get the week start date for a given date (Monday of that week)
   */
  static getWeekStartForDate(date: Date = new Date()): string {
    return formatDateToString(getWeekStart(date));
  }

  /**
   * Get the current week start date
   */
  static getCurrentWeekStart(): string {
    return this.getWeekStartForDate(new Date());
  }

  /**
   * Get the previous week start date
   */
  static getPreviousWeekStart(): string {
    const today = new Date();
    const previousWeek = addDays(today, -7);
    return this.getWeekStartForDate(previousWeek);
  }

  /**
   * Check if it's time to generate a weekly report (Sunday 11:30 PM)
   */
  static isWeeklyReportTime(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if it's Sunday (0) and between 23:30 and 23:59
    return dayOfWeek === 0 && hours === 23 && minutes >= 30;
  }

  /**
   * Get completions for a specific week
   */
  static getWeekCompletions(
    completions: DailyGoalCompletion[],
    weekStartDate: string
  ): DailyGoalCompletion[] {
    const startDate = new Date(weekStartDate);
    const endDate = addDays(startDate, 6);
    const startDateString = formatDateToString(startDate);
    const endDateString = formatDateToString(endDate);

    return completions.filter(completion => {
      const completionDate = completion.completion_date;
      return completionDate >= startDateString && completionDate <= endDateString;
    });
  }

  /**
   * Validate report data before generation
   */
  static validateReportData(
    userId: string,
    goalTemplates: GoalTemplate[],
    weekStartDate: string
  ): { isValid: boolean; errors: string[]; } {
    const errors: string[] = [];

    if (!userId || userId.trim() === '') {
      errors.push('User ID is required');
    }

    if (!weekStartDate || weekStartDate.trim() === '') {
      errors.push('Week start date is required');
    } else {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(weekStartDate)) {
        errors.push('Week start date must be in YYYY-MM-DD format');
      } else {
        // Validate that it's actually a Monday
        const date = new Date(weekStartDate);
        const dayOfWeek = date.getDay();
        const mondayDayOfWeek = 1;
        if (dayOfWeek !== mondayDayOfWeek) {
          errors.push('Week start date must be a Monday');
        }
      }
    }

    if (!Array.isArray(goalTemplates)) {
      errors.push('Goal templates must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate report summary text for notifications
   */
  static generateReportSummary(reportData: WeeklyReport['report_data']): string {
    const { goals, overall_completion_rate } = reportData;

    if (goals.length === 0) {
      return 'No goals were active this week.';
    }

    const completedGoals = goals.filter(goal => goal.completion_rate >= 1.0).length;
    const totalGoals = goals.length;

    let summary = `Weekly Report: ${Math.round(overall_completion_rate * 100)}% overall completion. `;

    if (completedGoals === totalGoals) {
      summary += `Perfect week! All ${totalGoals} goals completed.`;
    } else if (completedGoals > 0) {
      summary += `${completedGoals} of ${totalGoals} goals fully completed.`;
    } else {
      summary += 'Keep pushing! Focus on consistency next week.';
    }

    return summary;
  }

  /**
   * Get color code for completion rate visualization
   */
  static getCompletionRateColor(rate: number): string {
    if (rate >= 0.9) return '#10B981'; // Excellent - Green
    if (rate >= 0.7) return '#F59E0B'; // Good - Amber
    if (rate >= 0.5) return '#EF4444'; // Needs improvement - Red
    return '#6B7280'; // Poor - Gray
  }

  /**
   * Get completion rate category for display
   */
  static getCompletionRateCategory(rate: number): string {
    if (rate >= 0.9) return 'Excellent';
    if (rate >= 0.7) return 'Good';
    if (rate >= 0.5) return 'Fair';
    return 'Needs Improvement';
  }
}