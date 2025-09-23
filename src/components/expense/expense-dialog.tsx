"use client"
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native"
import { ModernModal, ModernModalHeader, ModernModalContent, ModernModalFooter } from "../ui/modern-modal"
import { ModernButton } from "../ui/modern-button"
import { ModernCard, ModernCardContent } from "../ui/modern-card"
import { theme } from "../../constants/theme"
import type { Expense } from "./expense-list"

interface ExpenseDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  expenses: Expense[]
  onAddExpense: () => void
}

export function ExpenseDialog({ isOpen, onClose, date, expenses, onAddExpense }: ExpenseDialogProps) {
  const { height: screenHeight, width: screenWidth } = Dimensions.get("window")

  const isTablet = screenWidth >= 768
  const MAX_VISIBLE_ITEMS = isTablet ? 5 : 4
  const ITEM_HEIGHT = isTablet ? 90 : 80
  const maxListHeight = MAX_VISIBLE_ITEMS * ITEM_HEIGHT

  console.log("[v0] ExpenseDialog - isOpen:", isOpen)
  console.log("[v0] ExpenseDialog - expenses count:", expenses.length)
  console.log("[v0] ExpenseDialog - expenses data:", expenses)
  console.log("[v0] ExpenseDialog - maxListHeight:", maxListHeight)
  console.log("[v0] ExpenseDialog - isTablet:", isTablet)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "MMK",
    }).format(amount)
  }

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.price, 0)

  return (
    <ModernModal visible={isOpen} onClose={onClose} animationType="fade">
      <ModernModalHeader>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.dialogTitle}>{formatDate(date)}</Text>
            <Text style={styles.dialogSubtitle}>
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.totalCorner}>
            <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>
      </ModernModalHeader>

      <ModernModalContent style={styles.modalContent}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>📝 No expenses recorded for this date</Text>
            <ModernButton onPress={onAddExpense} style={styles.addFirstButton} fullWidth>
              ➕ Add First Expense
            </ModernButton>
          </View>
        ) : (
          <View style={{ minHeight: 0 }}>
            <Text style={{ color: "red", fontSize: 12, marginBottom: 5 }}>
              [DEBUG] Rendering {expenses.length} expenses
            </Text>
            <ScrollView
              style={{ maxHeight: maxListHeight }}
              contentContainerStyle={styles.expensesListContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
              nestedScrollEnabled={true}
            >
              
              {expenses.map((expense, index) => {
                console.log("[v0] Rendering expense:", expense.id, expense.content)
                return (
                  <ModernCard key={expense.id || index} variant="outlined" style={styles.expenseCard}>
                    <ModernCardContent>
                      <View style={styles.expenseItem}>
                        <View style={styles.expenseInfo}>
                          <Text style={styles.expenseContent} numberOfLines={2}>
                            {expense.content}
                          </Text>
                          <Text style={styles.expenseTime}>
                            {new Date(expense.created_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                        <Text style={styles.expensePrice}>{formatCurrency(expense.price)}</Text>
                      </View>
                    </ModernCardContent>
                  </ModernCard>
                )
              })}
            </ScrollView>
          </View>
        )}
      </ModernModalContent>

      <ModernModalFooter>
        <View style={styles.footerButtonContainer}>
          <ModernButton
            variant="secondary"
            onPress={onClose}
            style={{ ...styles.footerButton, ...styles.closeButton }}
          >
            ❌ Close
          </ModernButton>
          <ModernButton
            onPress={onAddExpense}
            style={{ ...styles.footerButton, ...styles.addButton }}
          >
            ➕ Add Another
          </ModernButton>
        </View>
      </ModernModalFooter>
    </ModernModal>
  )
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
  },
  dialogTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  dialogSubtitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  totalCorner: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.md,
  },
  totalAmount: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.inverse,
  },
  modalContent: {
    minHeight: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSizes.base,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
    fontWeight: theme.typography.fontWeights.medium,
  },
  addFirstButton: {
    maxWidth: 200,
  },
  expensesContainer: {},
  expensesList: {},
  expensesListContent: {
    paddingBottom: theme.spacing.sm,
  },
  expenseCard: {
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.sm,
    minHeight: 70,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.xs,
  },
  expenseInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  expenseContent: {
    fontSize: theme.typography.fontSizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  expenseTime: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  expensePrice: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  footerButtonContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  footerButton: {
    flex: 1,
    minHeight: 44,
    maxHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    // Additional styling for close button if needed
  },
  addButton: {
    // Additional styling for add button if needed
  },
})
