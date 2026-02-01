import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Palette, Check } from 'lucide-react-native';
import { servicesApi, DesignCategory, DesignSelection } from '@/api/services';
import { getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

interface DesignOptionsPickerProps {
  serviceId: string;
  value: DesignSelection[];
  onChange: (selections: DesignSelection[]) => void;
}

export function DesignOptionsPicker({
  serviceId,
  value,
  onChange,
}: DesignOptionsPickerProps) {
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await servicesApi.getDesignCategories(serviceId);
        setCategories(data);
      } catch (error) {
        console.error('Error fetching design categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [serviceId]);

  const toggleOption = (category: DesignCategory, option: DesignCategory['options'][0]) => {
    const existingCatIndex = value.findIndex((s) => s.categoryId === category.id);
    const optionEntry = {
      optionId: option.id,
      optionName: option.name,
      imageUrl: option.imageUrl,
    };

    let newSelections = [...value];

    if (existingCatIndex >= 0) {
      const existingCat = newSelections[existingCatIndex];
      const optionSelected = existingCat.optionIds.some((o) => o.optionId === option.id);

      if (optionSelected) {
        // Deselect this option
        const filtered = existingCat.optionIds.filter((o) => o.optionId !== option.id);
        if (filtered.length === 0) {
          // Remove entire category entry
          newSelections.splice(existingCatIndex, 1);
        } else {
          newSelections[existingCatIndex] = {
            ...existingCat,
            optionIds: filtered,
          };
        }
      } else {
        // Add this option to the category
        newSelections[existingCatIndex] = {
          ...existingCat,
          optionIds: [...existingCat.optionIds, optionEntry],
        };
      }
    } else {
      // New category selection
      newSelections.push({
        categoryId: category.id,
        categoryName: category.name,
        optionIds: [optionEntry],
      });
    }

    onChange(newSelections);
  };

  const isOptionSelected = (categoryId: string, optionId: string) => {
    const cat = value.find((s) => s.categoryId === categoryId);
    return cat?.optionIds.some((o) => o.optionId === optionId) ?? false;
  };

  const getCategorySelectionCount = (categoryId: string) => {
    const cat = value.find((s) => s.categoryId === categoryId);
    return cat?.optionIds.length ?? 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading design options...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Palette size={20} color={colors.gray[700]} />
        <Text style={styles.headerTitle}>Design Options</Text>
      </View>
      <Text style={styles.headerSubtitle}>
        Select the styles and features you want for your item
      </Text>

      {categories.map((category) => {
        const count = getCategorySelectionCount(category.id);
        const isMissing = category.isRequired && count === 0;

        return (
          <View
            key={category.id}
            style={[styles.categoryCard, isMissing && styles.categoryCardMissing]}
          >
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleRow}>
                <Text style={styles.categoryTitle}>Select {category.name}</Text>
                {category.isRequired && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>Required</Text>
                  </View>
                )}
              </View>
              {count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{count} selected</Text>
                </View>
              )}
            </View>
            {category.description && (
              <Text style={styles.categoryDescription}>{category.description}</Text>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionsScroll}
            >
              {category.options.filter(opt => opt.isActive).map((option) => {
                const selected = isOptionSelected(category.id, option.id);
                const imageUrl = getImageUrl(option.imageUrl);

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      selected && styles.optionCardSelected,
                    ]}
                    onPress={() => toggleOption(category, option)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionImageContainer}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.optionImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.optionImagePlaceholder}>
                          <Palette size={24} color={colors.gray[300]} />
                        </View>
                      )}
                      {selected && (
                        <View style={styles.selectedCheckmark}>
                          <Check size={14} color={colors.white} />
                        </View>
                      )}
                    </View>
                    <View style={styles.optionInfo}>
                      <Text
                        style={[
                          styles.optionName,
                          selected && styles.optionNameSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {option.name}
                      </Text>
                      {option.description && (
                        <Text style={styles.optionDescription} numberOfLines={1}>
                          {option.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: -spacing.xs,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    gap: spacing.sm,
  },
  categoryCardMissing: {
    borderColor: colors.warning.DEFAULT,
    backgroundColor: colors.warning[50],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  requiredBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredBadgeText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  countBadge: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  categoryDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  optionsScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  optionCard: {
    width: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.gray[50],
    overflow: 'hidden',
  },
  optionCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  optionImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray[100],
    position: 'relative',
  },
  optionImage: {
    width: '100%',
    height: '100%',
  },
  optionImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    padding: spacing.sm,
  },
  optionName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  optionNameSelected: {
    color: colors.primary.DEFAULT,
  },
  optionDescription: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
});
