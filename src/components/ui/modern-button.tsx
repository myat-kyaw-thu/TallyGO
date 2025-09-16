import React, { useRef } from "react"
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Animated, Pressable } from "react-native"
import { theme } from "../../constants/theme"

interface ModernButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "success" | "warning" | "error"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  onPress?: () => void
  style?: ViewStyle
  disabled?: boolean
  fullWidth?: boolean
  loading?: boolean
}

export function ModernButton({ 
  variant = "primary", 
  size = "md", 
  children, 
  onPress, 
  style, 
  disabled = false,
  fullWidth = false,
  loading = false
}: ModernButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: theme.animations.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: theme.animations.duration.fast,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: theme.animations.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: theme.animations.duration.fast,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const getButtonStyle = () => {
    const baseStyle = [styles.base, styles[size]]
    
    switch (variant) {
      case "primary":
        return [...baseStyle, styles.primary]
      case "secondary":
        return [...baseStyle, styles.secondary]
      case "ghost":
        return [...baseStyle, styles.ghost]
      case "success":
        return [...baseStyle, styles.success]
      case "warning":
        return [...baseStyle, styles.warning]
      case "error":
        return [...baseStyle, styles.error]
      default:
        return [...baseStyle, styles.primary]
    }
  }

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]]
    
    switch (variant) {
      case "primary":
        return [...baseStyle, styles.primaryText]
      case "secondary":
        return [...baseStyle, styles.secondaryText]
      case "ghost":
        return [...baseStyle, styles.ghostText]
      case "success":
        return [...baseStyle, styles.successText]
      case "warning":
        return [...baseStyle, styles.warningText]
      case "error":
        return [...baseStyle, styles.errorText]
      default:
        return [...baseStyle, styles.primaryText]
    }
  }

  const buttonStyle = [
    ...getButtonStyle(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ]

  const textStyle = [
    ...getTextStyle(),
    disabled && styles.disabledText,
  ]

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        fullWidth && styles.fullWidth,
      ]}
    >
      <Pressable
        style={buttonStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        <Text style={textStyle}>
          {loading ? "Loading..." : children}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  sm: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 28,
  },
  md: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 32,
  },
  lg: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 36,
  },
  primary: {
    backgroundColor: theme.colors.primary[600],
  },
  secondary: {
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  success: {
    backgroundColor: theme.colors.success[600],
  },
  warning: {
    backgroundColor: theme.colors.warning[600],
  },
  error: {
    backgroundColor: theme.colors.error[600],
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: 'center',
  },
  smText: {
    fontSize: theme.typography.fontSizes.sm,
  },
  mdText: {
    fontSize: theme.typography.fontSizes.base,
  },
  lgText: {
    fontSize: theme.typography.fontSizes.lg,
  },
  primaryText: {
    color: theme.colors.text.inverse,
  },
  secondaryText: {
    color: theme.colors.text.primary,
  },
  ghostText: {
    color: theme.colors.primary[600],
  },
  successText: {
    color: theme.colors.text.inverse,
  },
  warningText: {
    color: theme.colors.text.inverse,
  },
  errorText: {
    color: theme.colors.text.inverse,
  },
  disabledText: {
    opacity: 0.7,
  },
})
