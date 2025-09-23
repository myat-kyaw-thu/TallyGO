import React, { useState } from "react"
import { View, Text, ScrollView, StyleSheet, Alert, StatusBar, Image, TouchableOpacity } from "react-native"
import { ModernButton } from "@/components/ui/modern-button"
import { ModernCard, ModernCardHeader, ModernCardContent } from "@/components/ui/modern-card"
import { ExpenseForm } from "@/components/expense/expense-form"
import { ExpenseList } from "@/components/expense/expense-list"
import { ExpenseDialog } from "@/components/expense/expense-dialog"
import { ExpenseFilter, type FilterPeriod } from "@/components/expense/expense-filter"
import { useExpenses } from "@/hooks/useExpenses"
import { theme } from "@/constants/theme"

export default function ExpenseTracker() {
  const { 
    expenses, 
    loading, 
    error,
    addExpense, 
    getFilteredExpenses, 
    getTotalAmount, 
    getExpensesForDate,
    getDatesWithTotals,
    getMasterTotal,
    clearAllData,
    getExpiryInfo
  } = useExpenses()

  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentFilter, setCurrentFilter] = useState<FilterPeriod>("month")

  const filteredExpenses = getFilteredExpenses(currentFilter)
  const totalAmount = getTotalAmount(filteredExpenses)
  const masterTotal = getMasterTotal()
  const datesWithTotals = getDatesWithTotals()

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleCloseDialog = () => {
    setSelectedDate(null)
  }

  const handleAddExpense = async (expense: { content: string; price: number; date: string }) => {
    try {
      await addExpense(expense)
      setShowForm(false)
    } catch (err) {
      Alert.alert('Error', 'Failed to add expense. Please try again.')
    }
  }

  const handleAddExpenseFromDialog = () => {
    setSelectedDate(null)
    setShowForm(true)
  }

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your expenses. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData()
              Alert.alert('Success', 'All data has been cleared.')
            } catch (err) {
              Alert.alert('Error', 'Failed to clear data. Please try again.')
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.secondary} />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.secondary} />
        <Text style={styles.errorText}>{error}</Text>
        <ModernButton onPress={() => window.location.reload()} style={styles.retryButton}>
          Retry
        </ModernButton>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.secondary} />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Image source={require('./assets/favicon.png')} style={styles.logo} />
            <Text style={styles.title}>TallyGO</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearData}>
            <Text style={styles.clearButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        {/* Master Total */}
        <ModernCard variant="filled" style={styles.masterTotalCard}>
          <ModernCardContent style={styles.masterTotalContent}>
            <View style={styles.totalRow}>
              <Text style={styles.masterTotalLabel}>💰 Total</Text>
              <Text style={styles.masterTotalAmount}>
                {masterTotal.toLocaleString()} MMK
              </Text>
            </View>
          </ModernCardContent>
        </ModernCard>

        {/* Filter and Period Total */}
        <ExpenseFilter 
          currentFilter={currentFilter} 
          onFilterChange={setCurrentFilter} 
          totalAmount={totalAmount} 
        />

        {/* Add Expense Button */}
        {!showForm && (
          <ModernButton 
            onPress={() => setShowForm(true)} 
            style={styles.addButton}
            fullWidth
            size="md"
          >
            ➕ Add Expense
          </ModernButton>
        )}

        {/* Expense Form */}
        {showForm && (
          <ExpenseForm 
            onSubmit={handleAddExpense} 
            onCancel={() => setShowForm(false)} 
          />
        )}

        {/* Date List with Daily Totals */}
        <View style={styles.dateListContainer}>
          <Text style={styles.sectionTitle}>📅 Daily Expenses</Text>
          {datesWithTotals.length === 0 ? (
            <ModernCard variant="outlined" style={styles.emptyCard}>
              <ModernCardContent style={styles.emptyContent}>
                <Text style={styles.emptyText}>📝 No expenses yet</Text>
                <Text style={styles.emptySubtext}>Add your first expense!</Text>
              </ModernCardContent>
            </ModernCard>
          ) : (
            <ExpenseList 
              expenses={datesWithTotals.map(d => d.expenses).flat()}
              onDateClick={handleDateClick}
              selectedDate={selectedDate || undefined}
            />
          )}
        </View>

        {/* Expense Dialog */}
        {typeof selectedDate === "string" && selectedDate.length > 0 && (
          <ExpenseDialog
            isOpen={true}
            onClose={handleCloseDialog}
            date={selectedDate}
            expenses={getExpensesForDate(selectedDate)}
            onAddExpense={handleAddExpenseFromDialog}
          />
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 10,
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.error[600],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontWeight: theme.typography.fontWeights.medium,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  logo: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: theme.typography.fontSizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  clearButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.neutral[100],
  },
  clearButtonText: {
    fontSize: theme.typography.fontSizes.lg,
  },
  masterTotalCard: {
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.neutral[200],
  },
  masterTotalContent: {
    paddingVertical: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterTotalLabel: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.neutral[700],
    fontWeight: theme.typography.fontWeights.medium,
  },
  masterTotalAmount: {
    fontSize: theme.typography.fontSizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.neutral[800],
  },
  addButton: {
    marginVertical: theme.spacing.xs,
  },
  dateListContainer: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  emptyCard: {
    borderColor: theme.colors.neutral[200],
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
})