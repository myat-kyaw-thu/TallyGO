import React, { useState } from "react"
import { View, Text, StyleSheet } from "react-native"
import { ModernButton } from "../ui/modern-button"
import { ModernInput } from "../ui/modern-input"
import { ModernCard, ModernCardHeader, ModernCardContent } from "../ui/modern-card"
import { theme } from "../../constants/theme"

interface ExpenseFormProps {
  onSubmit: (expense: { content: string; price: number; date: string }) => void
  onCancel?: () => void
  initialDate?: string
}

export function ExpenseForm({ onSubmit, onCancel, initialDate }: ExpenseFormProps) {
  const [content, setContent] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0])

  const handleSubmit = () => {
    if (!content.trim() || !price.trim()) {
      return
    }

    const priceNumber = Number.parseFloat(price)
    if (isNaN(priceNumber) || priceNumber <= 0) {
      return
    }

    onSubmit({
      content: content.trim(),
      price: priceNumber,
      date,
    })

    // Reset form
    setContent("")
    setPrice("")
  }

  const isValid = content.trim() && price.trim() && !isNaN(Number.parseFloat(price)) && Number.parseFloat(price) > 0

  return (
    <ModernCard variant="elevated" style={styles.formCard}>
      <ModernCardHeader>
        <Text style={styles.formTitle}>Add New Expense</Text>
      </ModernCardHeader>
      <ModernCardContent>
        <View style={styles.form}>
          <ModernInput
            label="What did you spend on?"
            placeholder="Coffee, groceries, gas..."
            value={content}
            onChangeText={setContent}
            autoCapitalize="words"
          />

          <ModernInput
            label="Amount"
            placeholder="0.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          <ModernInput
            label="Date"
            value={date}
            onChangeText={setDate}
          />

          <View style={styles.buttonContainer}>
            <ModernButton 
              onPress={handleSubmit} 
              style={styles.submitButton}
              disabled={!isValid}
              fullWidth
            >
              Add Expense
            </ModernButton>
            {onCancel && (
              <ModernButton 
                variant="secondary" 
                onPress={onCancel} 
                style={styles.cancelButton}
                fullWidth
              >
                Cancel
              </ModernButton>
            )}
          </View>
        </View>
      </ModernCardContent>
    </ModernCard>
  )
}

const styles = StyleSheet.create({
  formCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  form: {
    gap: theme.spacing.lg,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  submitButton: {
    // Styles handled by ModernButton
  },
  cancelButton: {
    // Styles handled by ModernButton
  },
})