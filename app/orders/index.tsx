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
import { Package, ChevronRight } from 'lucide-react-native';
import { Badge, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Order } from '@/types';

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
      return response.data as Order[];
    },
  });

  const renderOrder = ({ item }: { item: Order }) => {
    const firstItem = item.order_items?.[0];
    const additionalItems = (item.order_items?.length || 1) - 1;

    return (
      <Card
        style={styles.orderCard}
        variant="outlined"
        onPress={() => router.push(`/orders/${item.id}`)}
      >
        <CardContent style={styles.orderContent}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
              <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
            </View>
            <Badge
              label={formatStatusLabel(item.status)}
              variant={getStatusBadgeVariant(item.status)}
            />
          </View>

          {firstItem && (
            <View style={styles.orderItem}>
              <View style={styles.itemImage}>
                {firstItem.product_image ? (
                  <Image
                    source={{ uri: firstItem.product_image }}
                    style={styles.productImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Package size={24} color={colors.gray[300]} />
                  </View>
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {firstItem.product_name}
                </Text>
                <Text style={styles.itemDetails}>
                  {formatCurrency(firstItem.price)} × {firstItem.quantity}
                </Text>
                {additionalItems > 0 && (
                  <Text style={styles.moreItems}>
                    +{additionalItems} more item{additionalItems > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.orderFooter}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(item.total_amount)}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.gray[400]} />
          </View>
        </CardContent>
      </Card>
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
      <Stack.Screen options={{ headerTitle: 'My Orders' }} />
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
    backgroundColor: colors.gray[50],
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  orderContent: {
    padding: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
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
    color: colors.gray[900],
  },
  itemDetails: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  moreItems: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
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
