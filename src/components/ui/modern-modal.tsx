"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { Modal, View, StyleSheet, Animated, Dimensions, Pressable } from "react-native"
import { theme } from "../../constants/theme"

interface ModernModalProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  style?: any
  animationType?: "fade" | "slide" | "none"
  transparent?: boolean
  dismissible?: boolean
}

interface ModernModalHeaderProps {
  children: React.ReactNode
  style?: any
}

interface ModernModalContentProps {
  children: React.ReactNode
  style?: any
}

interface ModernModalFooterProps {
  children: React.ReactNode
  style?: any
}

const { width, height } = Dimensions.get("window")

export function ModernModal({
  visible,
  onClose,
  children,
  style,
  animationType = "fade",
  transparent = true,
  dismissible = true,
}: ModernModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const slideAnim = useRef(new Animated.Value(300)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animations.duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: theme.animations.duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: theme.animations.duration.normal,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: theme.animations.duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: theme.animations.duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: theme.animations.duration.normal,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const getModalStyle = () => {
    switch (animationType) {
      case "slide":
        return {
          transform: [{ translateY: slideAnim }],
        }
      case "fade":
      default:
        return {
          transform: [{ scale: scaleAnim }],
        }
    }
  }

  const getModalDimensions = () => {
    const isTablet = width >= 768
    const modalWidth = isTablet ? Math.min(width * 0.6, 500) : width - theme.spacing.xl * 2
    const modalHeight = isTablet ? Math.min(height * 0.7, 600) : Math.min(height * 0.8, 550)

    return {
      width: modalWidth,
      maxHeight: modalHeight,
    }
  }

  return (
    <Modal visible={visible} transparent={transparent} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={dismissible ? onClose : undefined} />
        <Animated.View style={[styles.modal, getModalDimensions(), getModalStyle(), style]}>{children}</Animated.View>
      </Animated.View>
    </Modal>
  )
}

export function ModernModalHeader({ children, style }: ModernModalHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function ModernModalContent({ children, style }: ModernModalContentProps) {
  return <View style={[styles.content, style]}>{children}</View>
}

export function ModernModalFooter({ children, style }: ModernModalFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    overflow: "hidden",
    ...theme.shadows.xl,
    flexDirection: "column",
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
    minHeight: 60,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 0,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "flex-end",
    minHeight: 60,
    maxHeight: 80,
  },
})
