import React, { useRef } from "react"
import { View, StyleSheet, ViewStyle, Animated, Pressable } from "react-native"
import { theme } from "../../constants/theme"

interface ModernCardProps {
  children: React.ReactNode
  style?: ViewStyle
  onPress?: () => void
  variant?: "default" | "elevated" | "outlined" | "filled"
  padding?: "sm" | "md" | "lg"
  animated?: boolean
}

interface ModernCardHeaderProps {
  children: React.ReactNode
  style?: ViewStyle
}

interface ModernCardContentProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function ModernCard({ 
  children, 
  style, 
  onPress, 
  variant = "default",
  padding = "md",
  animated = true
}: ModernCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: theme.animations.duration.fast,
        useNativeDriver: true,
      }).start()
    }
  }

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: theme.animations.duration.fast,
        useNativeDriver: true,
      }).start()
    }
  }

  const getCardStyle = () => {
    const baseStyle = [styles.base, styles[padding]]
    
    switch (variant) {
      case "default":
        return [...baseStyle, styles.default]
      case "elevated":
        return [...baseStyle, styles.elevated]
      case "outlined":
        return [...baseStyle, styles.outlined]
      case "filled":
        return [...baseStyle, styles.filled]
      default:
        return [...baseStyle, styles.default]
    }
  }

  const cardStyle = [...getCardStyle(), style]

  if (onPress) {
    return (
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Pressable
          style={[cardStyle, { flex: 1 }]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {children}
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  )
}

export function ModernCardHeader({ children, style }: ModernCardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {children}
    </View>
  )
}

export function ModernCardContent({ children, style }: ModernCardContentProps) {
  return (
    <View style={[styles.content, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  sm: {
    padding: theme.spacing.xs,
  },
  md: {
    padding: theme.spacing.sm,
  },
  lg: {
    padding: theme.spacing.md,
  },
  default: {
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.sm,
  },
  elevated: {
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.lg,
  },
  outlined: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  filled: {
    backgroundColor: theme.colors.neutral[50],
    borderWidth: 1,
    borderColor: theme.colors.neutral[100],
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
})
