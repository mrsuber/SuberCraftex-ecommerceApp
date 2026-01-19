import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Check, Package } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '@/config/theme';
import type { Material } from '@/types';

// Theme color aliases for convenience
const themeColors = {
  primary: colors.primary[500],
  primaryLight: colors.primary[50],
  white: colors.white,
  border: colors.gray[300],
  muted: colors.gray[100],
  text: colors.gray[900],
  textSecondary: colors.gray[600],
  textMuted: colors.gray[400],
  success: colors.success,
  error: colors.error,
};

interface MaterialGridProps {
  materials: Material[];
  selectedMaterialIds: string[];
  onSelectMaterial: (material: Material) => void;
}

export function MaterialGrid({
  materials,
  selectedMaterialIds,
  onSelectMaterial,
}: MaterialGridProps) {
  if (materials.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Package size={48} color={themeColors.textMuted} />
        <Text style={styles.emptyText}>No materials available</Text>
        <Text style={styles.emptySubtext}>
          You can request custom materials below
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {materials.map((material) => {
        const isSelected = selectedMaterialIds.includes(material.id);
        return (
          <TouchableOpacity
            key={material.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelectMaterial(material)}
            activeOpacity={0.7}
          >
            {/* Selection indicator */}
            {isSelected && (
              <View style={styles.checkBadge}>
                <Check size={14} color={themeColors.white} />
              </View>
            )}

            {/* Material image */}
            <View style={styles.imageContainer}>
              {material.images && material.images.length > 0 ? (
                <Image
                  source={{ uri: material.images[0] }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Package size={32} color={themeColors.textMuted} />
                </View>
              )}
            </View>

            {/* Material info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={2}>
                {material.name}
              </Text>
              <Text style={styles.price}>
                ${material.price.toFixed(2)} / {material.unit}
              </Text>
              {material.stockQuantity > 0 ? (
                <Text style={styles.stock}>
                  {material.stockQuantity} in stock
                </Text>
              ) : (
                <Text style={[styles.stock, styles.outOfStock]}>
                  Out of stock
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface MaterialQuantitySelectorProps {
  material: Material;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function MaterialQuantitySelector({
  material,
  quantity,
  onQuantityChange,
  onRemove,
}: MaterialQuantitySelectorProps) {
  const maxQuantity = material.stockQuantity;

  return (
    <View style={styles.quantityContainer}>
      <View style={styles.quantityInfo}>
        <Text style={styles.quantityName}>{material.name}</Text>
        <Text style={styles.quantityPrice}>
          ${material.price.toFixed(2)} per {material.unit}
        </Text>
      </View>

      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => {
            if (quantity <= 1) {
              onRemove();
            } else {
              onQuantityChange(quantity - 1);
            }
          }}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>

        <Text style={styles.quantityValue}>{quantity}</Text>

        <TouchableOpacity
          style={[
            styles.quantityButton,
            quantity >= maxQuantity && styles.quantityButtonDisabled,
          ]}
          onPress={() => {
            if (quantity < maxQuantity) {
              onQuantityChange(quantity + 1);
            }
          }}
          disabled={quantity >= maxQuantity}
        >
          <Text
            style={[
              styles.quantityButtonText,
              quantity >= maxQuantity && styles.quantityButtonTextDisabled,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: themeColors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: themeColors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    width: 140,
    backgroundColor: themeColors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: themeColors.border,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primaryLight,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: themeColors.muted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.muted,
  },
  info: {
    padding: spacing.sm,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: themeColors.primary,
  },
  stock: {
    fontSize: fontSize.xs,
    color: themeColors.success,
    marginTop: spacing.xs,
  },
  outOfStock: {
    color: themeColors.error,
  },
  // Quantity selector styles
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: themeColors.muted,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  quantityInfo: {
    flex: 1,
  },
  quantityName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: themeColors.text,
  },
  quantityPrice: {
    fontSize: fontSize.xs,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColors.white,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: themeColors.muted,
    borderColor: themeColors.muted,
  },
  quantityButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: themeColors.text,
  },
  quantityButtonTextDisabled: {
    color: themeColors.textMuted,
  },
  quantityValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: themeColors.text,
    minWidth: 30,
    textAlign: 'center',
  },
});
