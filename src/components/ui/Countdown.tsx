import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

interface CountdownProps {
  targetDate: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateCountdown(targetDate: string): CountdownValues {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isExpired: false,
  };
}

export function Countdown({ targetDate, size = 'medium', showLabels = true }: CountdownProps) {
  const [countdown, setCountdown] = useState<CountdownValues>(() =>
    calculateCountdown(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdown = calculateCountdown(targetDate);
      setCountdown(newCountdown);

      if (newCountdown.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (countdown.isExpired) {
    return (
      <View style={styles.expiredContainer}>
        <Text style={styles.expiredText}>Available Now</Text>
      </View>
    );
  }

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      value: styles.valueSmall,
      label: styles.labelSmall,
    },
    medium: {
      container: styles.containerMedium,
      value: styles.valueMedium,
      label: styles.labelMedium,
    },
    large: {
      container: styles.containerLarge,
      value: styles.valueLarge,
      label: styles.labelLarge,
    },
  };

  const currentSize = sizeStyles[size];

  // For small size, show compact format
  if (size === 'small') {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactText}>
          {countdown.days > 0
            ? `${countdown.days}d ${countdown.hours}h`
            : countdown.hours > 0
            ? `${countdown.hours}h ${countdown.minutes}m`
            : `${countdown.minutes}m ${countdown.seconds}s`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={currentSize.container}>
        <Text style={currentSize.value}>{String(countdown.days).padStart(2, '0')}</Text>
        {showLabels && <Text style={currentSize.label}>days</Text>}
      </View>
      <Text style={styles.separator}>:</Text>
      <View style={currentSize.container}>
        <Text style={currentSize.value}>{String(countdown.hours).padStart(2, '0')}</Text>
        {showLabels && <Text style={currentSize.label}>hrs</Text>}
      </View>
      <Text style={styles.separator}>:</Text>
      <View style={currentSize.container}>
        <Text style={currentSize.value}>{String(countdown.minutes).padStart(2, '0')}</Text>
        {showLabels && <Text style={currentSize.label}>min</Text>}
      </View>
      <Text style={styles.separator}>:</Text>
      <View style={currentSize.container}>
        <Text style={currentSize.value}>{String(countdown.seconds).padStart(2, '0')}</Text>
        {showLabels && <Text style={currentSize.label}>sec</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  // Compact format for small cards (transparent for overlay use)
  compactContainer: {
    // No background - designed to be placed on colored badges
  },
  compactText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  // Small size
  containerSmall: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    minWidth: 36,
  },
  valueSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  labelSmall: {
    fontSize: 8,
    color: colors.gray[500],
    marginTop: 1,
  },
  // Medium size
  containerMedium: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minWidth: 48,
  },
  valueMedium: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  labelMedium: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  // Large size
  containerLarge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 64,
  },
  valueLarge: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  labelLarge: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  separator: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[400],
  },
  expiredContainer: {
    // Transparent for overlay use
  },
  expiredText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#4ade80', // Bright green that works on dark backgrounds
  },
});
