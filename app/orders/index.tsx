import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, ChevronLeft, Calendar, ShoppingBag } from 'lucide-react-native';
import { Badge, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/config/theme';
import type { Order } from '@/types';

// Helper to get short order number (last 8 chars)
const getShortOrderNumber = (orderNumber: string): string => {
  if (!orderNumber) return 'N/A';
  // If it's a long format like ORD-1234567890-ABCDEF, show last part
  const parts = orderNumber.split('-');
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return orderNumber.slice(-8).toUpperCase();
};

export default function OrdersScreen() {
  const router = useRouter();

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.orders.list);
      // API returns { orders: [...] }
      return (response.data.orders || response.data || []) as Order[];
    },
  });

  const renderOrder = ({ item }: { item: Order }) => {
    // Handle both camelCase (API) and snake_case (types)
    const ord = item as any;
    const orderItems = ord.orderItems || ord.order_items || [];
    const firstItem = orderItems[0];
    const itemCount = orderItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
    const orderNumber = ord.orderNumber || ord.order_number || '';
    const createdAt = ord.createdAt || ord.created_at;
    const orderStatus = ord.orderStatus || ord.status || ord.order_status || 'pending';
    const totalAmount = ord.totalAmount || ord.total_amount || 0;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/orders/${item.id}`)}
      >
        {/* Status Badge - Top Right Corner */}
        <View style={styles.badgeContainer}>
          <Badge
            label={formatStatusLabel(orderStatus)}
            variant={getStatusBadgeVariant(orderStatus)}
            size="sm"
          />
        </View>

        {/* Order Info Row */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIconContainer}>
            <ShoppingBag size={20} color={colors.primary.DEFAULT} />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              #{getShortOrderNumber(orderNumber)}
            </Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color={colors.gray[400]} />
              <Text style={styles.orderDate}>{formatDate(createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Product Preview */}
        {firstItem && (
          <View style={styles.orderItem}>
            <View style={styles.itemImage}>
              {(firstItem.productImage || firstItem.product_image) ? (
                <Image
                  source={{ uri: firstItem.productImage || firstItem.product_image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Package size={20} color={colors.gray[400]} />
                </View>
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {firstItem.productName || firstItem.product_name || 'Product'}
              </Text>
              <Text style={styles.itemQuantity}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
        )}

        {/* Footer with Total */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={16} color={colors.primary.DEFAULT} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Package size={60} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptyText}>
          Your order history will appear here once you make a purchase.
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'My Orders',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: spacing.sm, padding: spacing.xs }}
            >
              <ChevronLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary.DEFAULT]}
                tintColor={colors.primary.DEFAULT}
              />
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.sm,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingRight: 80, // Space for badge
  },
  orderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  orderDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
    lineHeight: 18,
  },
  itemQuantity: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  totalLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
