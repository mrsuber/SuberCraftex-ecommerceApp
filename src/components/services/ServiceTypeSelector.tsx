import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Hammer, Wrench, Check } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Service, ServiceType } from '@/types';

interface ServiceTypeSelectorProps {
  service: Service;
  selectedType: ServiceType | null;
  onSelectType: (type: ServiceType) => void;
}

const serviceTypeConfig = {
  onsite: {
    icon: MapPin,
    title: 'On-Site Service',
    description: 'We come to your location for installation, repair, or consultation',
    features: ['Schedule appointment', 'We visit your location', 'Quick turnaround'],
  },
  custom_production: {
    icon: Hammer,
    title: 'Custom Production',
    description: 'Create something completely new from scratch with your specifications',
    features: ['Custom design', 'Quality materials', 'Quote-based pricing'],
  },
  collect_repair: {
    icon: Wrench,
    title: 'Collect & Repair',
    description: 'Workshop service for repairs, renewals, and restorations',
    features: ['Drop-off or collection', 'Workshop service', 'Progress tracking'],
  },
};

export function ServiceTypeSelector({
  service,
  selectedType,
  onSelectType,
}: ServiceTypeSelectorProps) {
  const availableTypes: ServiceType[] = [];

  // Check both snake_case and camelCase versions (API may return either)
  const supportsOnsite = (service as any).supports_onsite || (service as any).supportsOnsite;
  const supportsCustomProduction = (service as any).supports_custom_production || (service as any).supportsCustomProduction;
  const supportsCollectRepair = (service as any).supports_collect_repair || (service as any).supportsCollectRepair;

  if (supportsOnsite) availableTypes.push('onsite');
  if (supportsCustomProduction) availableTypes.push('custom_production');
  if (supportsCollectRepair) availableTypes.push('collect_repair');

  // If only one type is available, auto-select it
  React.useEffect(() => {
    if (availableTypes.length === 1 && !selectedType) {
      onSelectType(availableTypes[0]);
    }
  }, [availableTypes.length, selectedType]);

  if (availableTypes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No service types available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Service Type</Text>
      <Text style={styles.subtitle}>Choose how you'd like to receive this service</Text>

      {availableTypes.map((type) => {
        const config = serviceTypeConfig[type];
        const Icon = config.icon;
        const isSelected = selectedType === type;

        return (
          <TouchableOpacity
            key={type}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelectType(type)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Icon size={24} color={isSelected ? colors.white : colors.gray[600]} />
              </View>
              {isSelected && (
                <View style={styles.checkContainer}>
                  <Check size={16} color={colors.white} />
                </View>
              )}
            </View>

            <Text style={styles.cardTitle}>{config.title}</Text>
            <Text style={styles.cardDescription}>{config.description}</Text>

            <View style={styles.featuresContainer}>
              {config.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check size={14} color={colors.primary.DEFAULT} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  featuresContainer: {
    gap: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
});
