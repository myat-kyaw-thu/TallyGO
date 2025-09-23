import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { ModernButton } from "../ui/modern-button"
import { ModernCard, ModernCardContent } from "../ui/modern-card"
import { theme } from "../../constants/theme"

export type FilterPeriod = "day" | "week" | "month"

interface ExpenseFilterProps {
  currentFilter: FilterPeriod
  onFilterChange: (filter: FilterPeriod) => void
  totalAmount: number
}

export function ExpenseFilter({ currentFilter, onFilterChange, totalAmount }: ExpenseFilterProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "MMK",
    }).format(amount)
  }

  const getFilterLabel = (filter: FilterPeriod) => {
    switch (filter) {
      case "day":
        return "📅 Today"
      case "week":
        return "📊 Week"
      case "month":
        return "📈 Month"
    }
  }

  return (
    <View style={styles.container}>
      {/* Period Total */}
      <ModernCard variant="filled" style={styles.totalCard}>
        <ModernCardContent style={styles.totalContent}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {getFilterLabel(currentFilter)}
            </Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
          </View>
        </ModernCardContent>
      </ModernCard>

      {/* Filter Buttons */}
      <View style={styles.filterButtons}>
        {(["day", "week", "month"] as FilterPeriod[]).map((filter) => (
          <ModernButton
            key={filter}
            variant={currentFilter === filter ? "primary" : "secondary"}
            onPress={() => onFilterChange(filter)}
            style={styles.filterButton}
          >
            {getFilterLabel(filter)}
          </ModernButton>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  totalCard: {
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.neutral[200],
  },
  totalContent: {
    paddingVertical: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.neutral[700],
    fontWeight: theme.typography.fontWeights.medium,
  },
  totalAmount: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.neutral[800],
  },
  filterButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  filterButton: {
    flex: 1,
  },
})