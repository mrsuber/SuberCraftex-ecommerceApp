import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, borderRadius, spacing, shadows, fontSize, fontWeight } from '@/config/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({
  children,
  style,
  onPress,
  variant = 'default',
}: CardProps) {
  const cardStyles = [
    styles.card,
    variant === 'outlined' && styles.outlined,
    variant === 'elevated' && styles.elevated,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ title, subtitle, action, style }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  elevated: {
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs / 2,
  },
  content: {
    padding: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    gap: spacing.sm,
  },
});
