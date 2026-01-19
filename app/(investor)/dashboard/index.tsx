import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  Package,
  Settings as SettingsIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Investor, InvestorDeposit, InvestorTransaction } from '@/types';

export default function InvestorDashboardScreen() {
  const router = useRouter();

  const {
    data: investor,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['investor', 'me'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.me);
      return response.data as Investor;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!investor) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Investor account not found</Text>
        <Button
          title="Register as Investor"
          onPress={() => router.replace('/(investor)/register')}
        />
      </View>
    );
  }

  const cashBalance = parseFloat(investor.cash_balance);
  const profitBalance = parseFloat(investor.profit_balance);
  const totalBalance = cashBalance + profitBalance;

  const pendingDeposits = investor.deposits?.filter(
    (d) => d.confirmation_status === 'pending_confirmation'
  ) || [];

  const recentTransactions = investor.transactions?.slice(0, 5) || [];

  const getTransactionIcon = (type: string) => {
    if (type.includes('deposit') || type.includes('credit')) {
      return <ArrowDownRight size={16} color={colors.success} />;
    }
    if (type.includes('withdrawal') || type.includes('allocation')) {
      return <ArrowUpRight size={16} color={colors.error} />;
    }
    return <Clock size={16} color={colors.gray[500]} />;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Investor Dashboard',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(investor)/dashboard/settings')}
              style={styles.headerButton}
            >
              <SettingsIcon size={22} color={colors.gray[700]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.DEFAULT]}
              tintColor={colors.primary.DEFAULT}
            />
          }
        >
          {/* KYC Status Banner */}
          {investor.kyc_status !== 'approved' && (
            <View style={styles.kycBanner}>
              <AlertCircle size={20} color={colors.warning} />
              <Text style={styles.kycBannerText}>
                {investor.kyc_status === 'pending'
                  ? 'Your KYC is under review'
                  : investor.kyc_status === 'rejected'
                  ? 'KYC rejected. Please resubmit.'
                  : 'Complete KYC to start investing'}
              </Text>
              {investor.kyc_status !== 'pending' && (
                <Button
                  title="Verify"
                  size="sm"
                  onPress={() => router.push('/(investor)/verify')}
                />
              )}
            </View>
          )}

          {/* Balance Cards */}
          <View style={styles.balanceSection}>
            <Card style={styles.totalBalanceCard} variant="elevated">
              <CardContent>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.totalBalanceValue}>
                  {formatCurrency(totalBalance)}
                </Text>
                <View style={styles.balanceBreakdown}>
                  <View style={styles.balanceItem}>
                    <Wallet size={16} color={colors.primary.DEFAULT} />
                    <Text style={styles.balanceItemLabel}>Cash</Text>
                    <Text style={styles.balanceItemValue}>
                      {formatCurrency(cashBalance)}
                    </Text>
                  </View>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceItem}>
                    <TrendingUp size={16} color={colors.success} />
                    <Text style={styles.balanceItemLabel}>Profit</Text>
                    <Text style={styles.balanceItemValue}>
                      {formatCurrency(profitBalance)}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard} variant="outlined">
                <CardContent style={styles.statContent}>
                  <Text style={styles.statValue}>
                    {formatCurrency(parseFloat(investor.total_invested))}
                  </Text>
                  <Text style={styles.statLabel}>Total Invested</Text>
                </CardContent>
              </Card>
              <Card style={styles.statCard} variant="outlined">
                <CardContent style={styles.statContent}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {formatCurrency(parseFloat(investor.total_profit))}
                  </Text>
                  <Text style={styles.statLabel}>Total Profit</Text>
                </CardContent>
              </Card>
            </View>
          </View>

          {/* Pending Deposits */}
          {pendingDeposits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Confirmations</Text>
              {pendingDeposits.map((deposit) => (
                <Card
                  key={deposit.id}
                  style={styles.depositCard}
                  variant="outlined"
                  onPress={() =>
                    router.push(`/(investor)/dashboard/deposits/${deposit.id}`)
                  }
                >
                  <CardContent style={styles.depositContent}>
                    <View style={styles.depositInfo}>
                      <Text style={styles.depositAmount}>
                        {formatCurrency(parseFloat(deposit.gross_amount))}
                      </Text>
                      <Text style={styles.depositDate}>
                        {formatDate(deposit.deposited_at)}
                      </Text>
                    </View>
                    <View style={styles.depositAction}>
                      <Badge label="Confirm" variant="warning" />
                      <ChevronRight size={18} color={colors.gray[400]} />
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(investor)/dashboard/products')}
              >
                <View style={styles.actionIcon}>
                  <Package size={24} color={colors.primary.DEFAULT} />
                </View>
                <Text style={styles.actionLabel}>Products</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(investor)/dashboard/equipment')}
              >
                <View style={styles.actionIcon}>
                  <SettingsIcon size={24} color={colors.primary.DEFAULT} />
                </View>
                <Text style={styles.actionLabel}>Equipment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(investor)/dashboard/withdrawals')}
              >
                <View style={styles.actionIcon}>
                  <ArrowUpRight size={24} color={colors.primary.DEFAULT} />
                </View>
                <Text style={styles.actionLabel}>Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(investor)/dashboard/transactions')}
              >
                <View style={styles.actionIcon}>
                  <Clock size={24} color={colors.primary.DEFAULT} />
                </View>
                <Text style={styles.actionLabel}>History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity
                onPress={() => router.push('/(investor)/dashboard/transactions')}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <Card variant="outlined">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction, index) => (
                  <View
                    key={transaction.id}
                    style={[
                      styles.transactionItem,
                      index < recentTransactions.length - 1 &&
                        styles.transactionItemBorder,
                    ]}
                  >
                    <View style={styles.transactionIcon}>
                      {getTransactionIcon(transaction.type)}
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription} numberOfLines={1}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type.includes('withdrawal') ||
                        transaction.type.includes('allocation')
                          ? styles.transactionAmountNegative
                          : styles.transactionAmountPositive,
                      ]}
                    >
                      {transaction.type.includes('withdrawal') ||
                      transaction.type.includes('allocation')
                        ? '-'
                        : '+'}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </Text>
                  </View>
                ))
              ) : (
                <CardContent>
                  <Text style={styles.emptyText}>No transactions yet</Text>
                </CardContent>
              )}
            </Card>
          </View>
        </ScrollView>
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
    backgroundColor: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  headerButton: {
    padding: spacing.sm,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
  },
  kycBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[800],
  },
  balanceSection: {
    padding: spacing.lg,
  },
  totalBalanceCard: {
    backgroundColor: colors.primary.DEFAULT,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
  },
  totalBalanceValue: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginVertical: spacing.sm,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  balanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  balanceDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: spacing.md,
  },
  balanceItemLabel: {
    fontSize: fontSize.xs,
    color: colors.white,
    opacity: 0.8,
  },
  balanceItemValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginLeft: 'auto',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  depositCard: {
    marginBottom: spacing.sm,
  },
  depositContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  depositInfo: {
    flex: 1,
  },
  depositAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  depositDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  depositAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  transactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  transactionAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  transactionAmountPositive: {
    color: colors.success,
  },
  transactionAmountNegative: {
    color: colors.error,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray[500],
    fontSize: fontSize.sm,
  },
});
