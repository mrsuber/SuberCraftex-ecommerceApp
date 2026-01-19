import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Package, TrendingUp } from 'lucide-react-native';
import { Badge, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { InvestorProductAllocation } from '@/types';

export default function ProductAllocationsScreen() {
  const {
    data: investor,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['investor', 'me'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.me);
      return response.data;
    },
  });

  const allocations = investor?.product_allocations || [];

  const totalInvested = allocations.reduce(
    (sum: number, a: InvestorProductAllocation) => sum + parseFloat(a.total_investment),
    0
  );
  const totalProfit = allocations.reduce(
    (sum: number, a: InvestorProductAllocation) => sum + parseFloat(a.profit_generated),
    0
  );

  const renderAllocation = ({ item }: { item: InvestorProductAllocation }) => (
    <Card style={styles.allocationCard} variant="outlined">
      <CardContent style={styles.allocationContent}>
        <View style={styles.productImage}>
          {item.product?.featured_image ? (
            <Image
              source={{ uri: item.product.featured_image }}
              style={styles.image}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Package size={24} color={colors.gray[300]} />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product?.name || 'Product'}
          </Text>
          <Text style={styles.productSku}>SKU: {item.product?.sku}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Invested</Text>
              <Text style={styles.statValue}>
                {formatCurrency(parseFloat(item.total_investment))}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Qty</Text>
              <Text style={styles.statValue}>{item.quantity}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Sold</Text>
              <Text style={styles.progressValue}>
                {item.quantity_sold} / {item.quantity}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(item.quantity_sold / item.quantity) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.profitRow}>
            <TrendingUp size={16} color={colors.success} />
            <Text style={styles.profitLabel}>Profit Generated</Text>
            <Text style={styles.profitValue}>
              {formatCurrency(parseFloat(item.profit_generated))}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.summarySection}>
      <Card variant="elevated" style={styles.summaryCard}>
        <CardContent style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Invested</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalInvested)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Profit</Text>
            <Text style={[styles.summaryValue, styles.profitText]}>
              {formatCurrency(totalProfit)}
            </Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Package size={60} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No Product Allocations</Text>
        <Text style={styles.emptyText}>
          Your product investments will appear here once you make deposits and
          the admin allocates them to products.
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Product Allocations' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={allocations}
            renderItem={renderAllocation}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={allocations.length > 0 ? renderHeader : null}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
  summarySection: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.primary.DEFAULT,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.white,
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: 2,
  },
  profitText: {
    color: '#90EE90',
  },
  allocationCard: {
    marginBottom: spacing.md,
  },
  allocationContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  image: {
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
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: 2,
  },
  productSku: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {},
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  progressRow: {
    marginBottom: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  progressValue: {
    fontSize: fontSize.xs,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  profitLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  profitValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
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
    lineHeight: 22,
  },
});
