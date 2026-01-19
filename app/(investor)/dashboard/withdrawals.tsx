import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, TrendingUp, Package, Settings } from 'lucide-react-native';
import { Button, Input, Card, CardContent, CardHeader, Badge } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { WithdrawalType } from '@/types';

type WithdrawalOption = {
  type: WithdrawalType;
  label: string;
  description: string;
  icon: any;
  balanceKey: 'cash_balance' | 'profit_balance';
};

const WITHDRAWAL_OPTIONS: WithdrawalOption[] = [
  {
    type: 'cash',
    label: 'Cash Withdrawal',
    description: 'Withdraw from your cash balance',
    icon: Wallet,
    balanceKey: 'cash_balance',
  },
  {
    type: 'profit',
    label: 'Profit Withdrawal',
    description: 'Withdraw from your profit balance',
    icon: TrendingUp,
    balanceKey: 'profit_balance',
  },
  {
    type: 'product',
    label: 'Product Withdrawal',
    description: 'Receive products at cost price',
    icon: Package,
    balanceKey: 'cash_balance',
  },
  {
    type: 'equipment_share',
    label: 'Equipment Exit',
    description: 'Sell your equipment share',
    icon: Settings,
    balanceKey: 'cash_balance',
  },
];

export default function WithdrawalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<WithdrawalType>('cash');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data: investor, isLoading } = useQuery({
    queryKey: ['investor', 'me'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.me);
      return response.data;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { type: WithdrawalType; amount: number; reason?: string }) => {
      const response = await apiClient.post(API_ENDPOINTS.investor.withdrawals, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      Alert.alert(
        'Withdrawal Requested',
        `Your withdrawal request #${data.request_number} has been submitted for review.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Withdrawal Failed',
        error.response?.data?.error || 'Failed to submit withdrawal request.'
      );
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  const selectedOption = WITHDRAWAL_OPTIONS.find((o) => o.type === selectedType);
  const availableBalance = selectedOption
    ? parseFloat(investor?.[selectedOption.balanceKey] || '0')
    : 0;

  const handleWithdraw = () => {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (numAmount > availableBalance) {
      Alert.alert('Insufficient Balance', 'You don\'t have enough balance for this withdrawal.');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw ${formatCurrency(numAmount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            withdrawMutation.mutate({
              type: selectedType,
              amount: numAmount,
              reason: reason || undefined,
            }),
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Request Withdrawal' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Balance Summary */}
          <View style={styles.balanceSection}>
            <Card variant="outlined">
              <CardContent style={styles.balanceContent}>
                <View style={styles.balanceItem}>
                  <Wallet size={20} color={colors.primary.DEFAULT} />
                  <Text style={styles.balanceLabel}>Cash Balance</Text>
                  <Text style={styles.balanceValue}>
                    {formatCurrency(parseFloat(investor?.cash_balance || '0'))}
                  </Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <TrendingUp size={20} color={colors.success} />
                  <Text style={styles.balanceLabel}>Profit Balance</Text>
                  <Text style={styles.balanceValue}>
                    {formatCurrency(parseFloat(investor?.profit_balance || '0'))}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Withdrawal Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawal Type</Text>
            {WITHDRAWAL_OPTIONS.map((option) => {
              const Icon = option.icon;
              const balance = parseFloat(investor?.[option.balanceKey] || '0');

              return (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.optionCard,
                    selectedType === option.type && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedType(option.type)}
                  disabled={balance <= 0 && option.type !== 'equipment_share'}
                >
                  <View style={styles.optionIcon}>
                    <Icon size={24} color={colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedType === option.type && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedType === option.type && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader
                title="Withdrawal Amount"
                subtitle={`Available: ${formatCurrency(availableBalance)}`}
              />
              <CardContent>
                <Input
                  label="Amount"
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />

                <View style={styles.quickAmounts}>
                  {[25, 50, 75, 100].map((percent) => {
                    const quickAmount = (availableBalance * percent) / 100;
                    return (
                      <TouchableOpacity
                        key={percent}
                        style={styles.quickAmountButton}
                        onPress={() => setAmount(quickAmount.toFixed(2))}
                      >
                        <Text style={styles.quickAmountText}>{percent}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Input
                  label="Reason (Optional)"
                  placeholder="Why are you withdrawing?"
                  multiline
                  numberOfLines={3}
                  value={reason}
                  onChangeText={setReason}
                />
              </CardContent>
            </Card>
          </View>

          {/* Info Note */}
          <View style={styles.section}>
            <Card style={styles.infoCard} variant="outlined">
              <CardContent>
                <Text style={styles.infoTitle}>Processing Time</Text>
                <Text style={styles.infoText}>
                  Withdrawal requests are typically processed within 24-48 hours.
                  You will receive a notification once your request is approved.
                </Text>
              </CardContent>
            </Card>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomAction}>
          <Button
            title={`Request Withdrawal${amount ? ` - ${formatCurrency(parseFloat(amount) || 0)}` : ''}`}
            onPress={handleWithdraw}
            loading={withdrawMutation.isPending}
            disabled={!amount || parseFloat(amount) <= 0}
            fullWidth
            size="lg"
          />
        </View>
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
  balanceSection: {
    padding: spacing.lg,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  balanceValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  infoCard: {
    backgroundColor: colors.info + '10',
    borderColor: colors.info,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
