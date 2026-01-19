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
import { Settings, TrendingUp, DollarSign } from 'lucide-react-native';
import { Badge, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { InvestorEquipmentAllocation } from '@/types';

export default function EquipmentAllocationsScreen() {
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

  const allocations = investor?.equipment_allocations || [];

  const totalInvested = allocations.reduce(
    (sum: number, a: InvestorEquipmentAllocation) => sum + parseFloat(a.amount_allocated),
    0
  );
  const totalProfit = allocations.reduce(
    (sum: number, a: InvestorEquipmentAllocation) => sum + parseFloat(a.total_profit_received),
    0
  );

  const renderAllocation = ({ item }: { item: InvestorEquipmentAllocation }) => (
    <Card style={styles.allocationCard} variant="outlined">
      <CardContent style={styles.allocationContent}>
        <View style={styles.equipmentImage}>
          {item.equipment?.photos?.[0] ? (
            <Image
              source={{ uri: item.equipment.photos[0] }}
              style={styles.image}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Settings size={32} color={colors.gray[300]} />
            </View>
          )}
        </View>

        <View style={styles.equipmentInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.equipmentName} numberOfLines={1}>
              {item.equipment?.name || 'Equipment'}
            </Text>
            <Badge
              label={item.has_exited ? 'Exited' : 'Active'}
              variant={item.has_exited ? 'default' : 'success'}
              size="sm"
            />
          </View>
          <Text style={styles.equipmentNumber}>
            #{item.equipment?.equipment_number}
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.stat}>
              <DollarSign size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.statLabel}>Invested</Text>
              <Text style={styles.statValue}>
                {formatCurrency(parseFloat(item.amount_allocated))}
              </Text>
            </View>
            <View style={styles.stat}>
              <TrendingUp size={14} color={colors.success} />
              <Text style={styles.statLabel}>Ownership</Text>
              <Text style={styles.statValue}>
                {parseFloat(item.investment_percentage).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.profitSection}>
            <View style={styles.profitItem}>
              <Text style={styles.profitLabel}>Profit Share</Text>
              <Text style={styles.profitValue}>
                {parseFloat(item.profit_share).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.profitItem}>
              <Text style={styles.profitLabel}>Total Earned</Text>
              <Text style={[styles.profitValue, styles.earnedValue]}>
                {formatCurrency(parseFloat(item.total_profit_received))}
              </Text>
            </View>
          </View>

          {item.equipment && (
            <View style={styles.equipmentStats}>
              <Text style={styles.equipmentStatsLabel}>Equipment Performance</Text>
              <View style={styles.equipmentStatsRow}>
                <View style={styles.equipmentStat}>
                  <Text style={styles.equipmentStatValue}>
                    {formatCurrency(parseFloat(item.equipment.total_revenue))}
                  </Text>
                  <Text style={styles.equipmentStatLabel}>Revenue</Text>
                </View>
                <View style={styles.equipmentStat}>
                  <Text style={styles.equipmentStatValue}>
                    {formatCurrency(parseFloat(item.equipment.total_profit))}
                  </Text>
                  <Text style={styles.equipmentStatLabel}>Profit</Text>
                </View>
              </View>
            </View>
          )}
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
            <Text style={styles.summaryLabel}>Total Earnings</Text>
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
        <Settings size={60} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No Equipment Shares</Text>
        <Text style={styles.emptyText}>
          Your equipment investment shares will appear here once the admin
          allocates your funds to equipment.
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Equipment Shares' }} />
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
    padding: spacing.md,
  },
  equipmentImage: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
  equipmentInfo: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  equipmentName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  equipmentNumber: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  profitSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray[100],
    marginBottom: spacing.md,
  },
  profitItem: {},
  profitLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  profitValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  earnedValue: {
    color: colors.success,
  },
  equipmentStats: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  equipmentStatsLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  equipmentStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  equipmentStat: {
    alignItems: 'center',
  },
  equipmentStatValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  equipmentStatLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
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
