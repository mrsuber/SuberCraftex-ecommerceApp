import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, fontSize, fontWeight, spacing } from '@/config/theme';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: fontWeight.medium,
  },

  // Sizes
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  size_md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  textSize_sm: {
    fontSize: fontSize.xs,
  },
  textSize_md: {
    fontSize: fontSize.sm,
  },

  // Variants
  default: {
    backgroundColor: colors.gray[100],
  },
  text_default: {
    color: colors.gray[700],
  },

  primary: {
    backgroundColor: colors.primary[100],
  },
  text_primary: {
    color: colors.primary[700],
  },

  success: {
    backgroundColor: '#D1FAE5',
  },
  text_success: {
    color: '#047857',
  },

  warning: {
    backgroundColor: '#FEF3C7',
  },
  text_warning: {
    color: '#B45309',
  },

  error: {
    backgroundColor: '#FEE2E2',
  },
  text_error: {
    color: '#DC2626',
  },

  info: {
    backgroundColor: '#DBEAFE',
  },
  text_info: {
    color: '#1D4ED8',
  },
});

// Helper function to get badge variant from status
export function getStatusBadgeVariant(
  status: string
): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    // Order statuses
    pending: 'warning',
    paid: 'info',
    processing: 'info',
    shipped: 'info',
    out_for_delivery: 'info',
    delivered: 'success',
    cancelled: 'error',
    refunded: 'default',

    // Payment statuses
    failed: 'error',

    // Booking statuses
    quote_pending: 'warning',
    quote_sent: 'info',
    quote_approved: 'success',
    quote_rejected: 'error',
    awaiting_payment: 'warning',
    payment_partial: 'warning',
    confirmed: 'success',
    in_progress: 'info',
    awaiting_collection: 'info',
    completed: 'success',
    no_show: 'error',
    rescheduled: 'warning',

    // KYC statuses
    not_started: 'default',
    approved: 'success',
    rejected: 'error',

    // Investor statuses
    pending_verification: 'warning',
    active: 'success',
    suspended: 'error',
    exited: 'default',

    // Deposit confirmation
    pending_confirmation: 'warning',
    disputed: 'error',
  };

  return statusMap[status] || 'default';
}

// Helper function to format status label
export function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
