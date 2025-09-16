import React, { useState, useRef } from "react"
import { View, Text, TextInput, StyleSheet, ViewStyle, Animated } from "react-native"
import { theme } from "../../constants/theme"

interface ModernInputProps {
  label?: string
  placeholder?: string
  value: string
  onChangeText: (text: string) => void
  error?: string
  style?: ViewStyle
  inputStyle?: ViewStyle
  multiline?: boolean
  numberOfLines?: number
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad"
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  secureTextEntry?: boolean
  disabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function ModernInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  style,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry = false,
  disabled = false,
  leftIcon,
  rightIcon,
}: ModernInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current
  const borderAnim = useRef(new Animated.Value(0)).current

  const handleFocus = () => {
    setIsFocused(true)
    Animated.parallel([
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: theme.animations.duration.normal,
        useNativeDriver: false,
      }),
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: theme.animations.duration.normal,
        useNativeDriver: false,
      }),
    ]).start()
  }

  const handleBlur = () => {
    setIsFocused(false)
    Animated.parallel([
      Animated.timing(labelAnim, {
        toValue: value ? 1 : 0,
        duration: theme.animations.duration.normal,
        useNativeDriver: false,
      }),
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: theme.animations.duration.normal,
        useNativeDriver: false,
      }),
    ]).start()
  }

  const handleTextChange = (text: string) => {
    onChangeText(text)
    if (text && !isFocused) {
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: theme.animations.duration.normal,
        useNativeDriver: false,
      }).start()
    }
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.neutral[300], theme.colors.primary[600]],
  })

  const labelScale = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  })

  const labelTranslateY = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  })

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Animated.Text
          style={[
            styles.label,
            {
              transform: [
                { scale: labelScale },
                { translateY: labelTranslateY },
              ],
              color: isFocused ? theme.colors.primary[600] : theme.colors.text.secondary,
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
      
      <View style={styles.inputContainer}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              borderColor,
              backgroundColor: disabled ? theme.colors.neutral[100] : theme.colors.background.primary,
            },
            error && styles.inputError,
          ]}
        >
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              inputStyle,
            ]}
            value={value}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.tertiary}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
            editable={!disabled}
          />
        </Animated.View>
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeights.normal,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.error[500],
  },
  leftIcon: {
    paddingLeft: theme.spacing.md,
  },
  rightIcon: {
    paddingRight: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.error[600],
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
})
