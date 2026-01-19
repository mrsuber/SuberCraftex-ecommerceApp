import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { InvestorTransaction } from '@/types';

export default function TransactionsScreen() {
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

  const transactions = investor?.transactions || [];

  const getTransactionIcon = (type: string) => {
    if (type.includes('deposit') || type.includes('credit')) {
      return <ArrowDownRight size={18} color={colors.success} />;
    }
    if (type.includes('withdrawal') || type.includes('allocation')) {
      return <ArrowUpRight size={18} color={colors.error} />;
    }
    return <Clock size={18} color={colors.gray[500]} />;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      withdrawal_cash: 'Cash Withdrawal',
      withdrawal_profit: 'Profit Withdrawal',
      withdrawal_product: 'Product Withdrawal',
      withdrawal_equipment: 'Equipment Exit',
      allocation_product: 'Product Allocation',
      allocation_equipment: 'Equipment Allocation',
      profit_credit: 'Profit Credit',
      refund: 'Refund',
    };
    return labels[type] || type;
  };

  const renderTransaction = ({ item }: { item: InvestorTransaction }) => {
    const isPositive =
      item.type.includes('deposit') ||
      item.type.includes('credit') ||
      item.type === 'refund';

    return (
      <Card style={styles.transactionCard} variant="outlined">
        <CardContent style={styles.transactionContent}>
          <View style={styles.transactionIcon}>
            {getTransactionIcon(item.type)}
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionType}>
              {getTransactionTypeLabel(item.type)}
            </Text>
            <Text style={styles.transactionDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text
              style={[
                styles.transactionAmount,
                isPositive ? styles.positiveAmount : styles.negativeAmount,
              ]}
            >
              {isPositive ? '+' : '-'}
              {formatCurrency(parseFloat(item.amount))}
            </Text>
            <Text style={styles.balanceAfter}>
              Bal: {formatCurrency(parseFloat(item.balance_after))}
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Clock size={60} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No Transactions</Text>
        <Text style={styles.emptyText}>
          Your transaction history will appear here.
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Transaction History' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
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
  transactionCard: {
    marginBottom: spacing.sm,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  transactionDescription: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
    lineHeight: 16,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 4,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  balanceAfter: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
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
  },
});
