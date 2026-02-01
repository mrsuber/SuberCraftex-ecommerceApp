import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Plus,
  Smartphone,
  XCircle,
} from 'lucide-react-native';
import { Button, Input, Card, CardContent, CardHeader, Badge } from '@/components/ui';
import { Picker } from '@react-native-picker/picker';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { WithdrawalRequest, WithdrawalType, WithdrawalStatus } from '@/types';

type WithdrawalSource = 'cash' | 'profit';

const MOMO_PROVIDERS = [
  { value: 'MTN', label: 'MTN Mobile Money' },
  { value: 'Orange', label: 'Orange Money' },
];

// Helper to get current step for withdrawal flow
const getWithdrawalStep = (status: WithdrawalStatus): number => {
  switch (status) {
    case 'pending':
      return 1; // Step 1: Under review
    case 'approved':
      return 2; // Step 2: Approved, admin processing
    case 'awaiting_investor_confirmation':
      return 3; // Step 3: Admin sent money, investor to confirm
    case 'confirmed':
      return 4; // Complete
    default:
      return 1;
  }
};

export default function WithdrawalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedSource, setSelectedSource] = useState<WithdrawalSource>('cash');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoName, setMomoName] = useState('');
  const [momoProvider, setMomoProvider] = useState('MTN');
  const [activeWithdrawalId, setActiveWithdrawalId] = useState<string | null>(null);

  // Fetch investor profile
  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ['investor', 'me'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.me);
      return response.data;
    },
  });

  // Fetch withdrawals
  const {
    data: withdrawals,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['investor', 'withdrawals'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.withdrawals);
      return response.data as WithdrawalRequest[];
    },
  });

  // Request withdrawal mutation
  const requestMutation = useMutation({
    mutationFn: async (data: {
      type: WithdrawalType;
      amount: number;
      requestReason?: string;
      momoNumber: string;
      momoName: string;
      momoProvider: string;
    }) => {
      const response = await apiClient.post(API_ENDPOINTS.investor.withdrawals, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investor', 'withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['investor', 'me'] });
      setShowRequestForm(false);
      setAmount('');
      setReason('');
      setMomoNumber('');
      setMomoName('');
      Alert.alert(
        'Withdrawal Requested',
        `Your withdrawal request #${data.request_number} has been submitted for review.`,
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Request Failed',
        error.response?.data?.error || 'Failed to submit withdrawal request.'
      );
    },
  });

  // Confirm withdrawal mutation
  const confirmMutation = useMutation({
    mutationFn: async ({ withdrawalId, confirmed, feedback }: { withdrawalId: string; confirmed: boolean; feedback?: string }) => {
      const response = await apiClient.post(
        API_ENDPOINTS.investor.confirmWithdrawal(withdrawalId),
        { confirmed, feedback }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investor', 'withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['investor', 'me'] });
      setActiveWithdrawalId(null);
      Alert.alert(
        variables.confirmed ? 'Withdrawal Confirmed' : 'Dispute Submitted',
        variables.confirmed
          ? 'Your withdrawal has been confirmed and your balance has been updated.'
          : 'Your dispute has been submitted for review.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to process your request.'
      );
    },
  });

  // Helper to get balance
  const getBalance = (type: 'cash' | 'profit'): number => {
    const inv = investor as any;
    if (type === 'cash') {
      return parseFloat(inv?.cashBalance || inv?.cash_balance || '0');
    }
    return parseFloat(inv?.profitBalance || inv?.profit_balance || '0');
  };

  const cashBalance = getBalance('cash');
  const profitBalance = getBalance('profit');
  const availableBalance = selectedSource === 'cash' ? cashBalance : profitBalance;

  const handleRequestWithdrawal = () => {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (numAmount > availableBalance) {
      Alert.alert('Insufficient Balance', 'You don\'t have enough balance for this withdrawal.');
      return;
    }

    if (!momoNumber || !momoName || !momoProvider) {
      Alert.alert('Missing Information', 'Please provide your mobile money details.');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal Request',
      `Request withdrawal of ${formatCurrency(numAmount)} from your ${selectedSource} balance?\n\nMobile Money: ${momoProvider}\nNumber: ${momoNumber}\nName: ${momoName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          onPress: () =>
            requestMutation.mutate({
              type: selectedSource,
              amount: numAmount,
              requestReason: reason || undefined,
              momoNumber,
              momoName,
              momoProvider,
            }),
        },
      ]
    );
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    const configs: Record<string, { variant: 'warning' | 'info' | 'success' | 'error' | 'default'; label: string }> = {
      pending: { variant: 'warning', label: 'Under Review' },
      approved: { variant: 'info', label: 'Approved' },
      awaiting_investor_confirmation: { variant: 'success', label: 'Confirm Receipt' },
      processing: { variant: 'info', label: 'Processing' },
      completed: { variant: 'success', label: 'Completed' },
      confirmed: { variant: 'success', label: 'Confirmed' },
      rejected: { variant: 'error', label: 'Rejected' },
      cancelled: { variant: 'default', label: 'Cancelled' },
      disputed: { variant: 'error', label: 'Disputed' },
    };

    const config = configs[status] || configs.pending;
    return <Badge label={config.label} variant={config.variant} />;
  };

  if (isLoading || investorLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  // Find active withdrawal that needs attention
  const activeWithdrawal = withdrawals?.find(
    w => w.id === activeWithdrawalId ||
    ['awaiting_investor_confirmation', 'disputed'].includes(w.status)
  );

  // Show step-based view for active withdrawal
  if (activeWithdrawal && ['awaiting_investor_confirmation', 'disputed'].includes(activeWithdrawal.status)) {
    const currentStep = getWithdrawalStep(activeWithdrawal.status);
    const finalAmount = parseFloat(activeWithdrawal.approved_amount || activeWithdrawal.amount);

    // Step indicator renderer
    const renderStepIndicator = () => (
      <>
        <View style={styles.stepIndicator}>
          <View style={[styles.step, styles.stepCompleted]}>
            <CheckCircle size={16} color={colors.white} />
          </View>
          <View style={[styles.stepLine, styles.stepLineActive]} />
          <View style={[styles.step, styles.stepCompleted]}>
            <CheckCircle size={16} color={colors.white} />
          </View>
          <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 3 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Requested</Text>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Sent</Text>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Confirm</Text>
        </View>
      </>
    );

    // AWAITING INVESTOR CONFIRMATION - Admin sent money, investor needs to confirm
    if (activeWithdrawal.status === 'awaiting_investor_confirmation') {
      return (
        <>
          <Stack.Screen options={{ headerTitle: 'Confirm Withdrawal' }} />
          <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderStepIndicator()}

              {/* Success Banner */}
              <View style={styles.section}>
                <Card variant="elevated" style={styles.successCard}>
                  <CardContent style={styles.successCardContent}>
                    <CheckCircle size={48} color={colors.success} />
                    <Text style={styles.successTitle}>Payment Sent!</Text>
                    <Text style={styles.successText}>
                      Admin has sent the payment to your mobile money account. Please confirm receipt.
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Amount Details */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="Withdrawal Details" />
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Request Number</Text>
                      <Text style={styles.detailValue}>#{activeWithdrawal.request_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount Sent</Text>
                      <Text style={[styles.detailValue, styles.detailValueBold, { color: colors.success }]}>
                        {formatCurrency(finalAmount)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sent To</Text>
                      <Text style={styles.detailValue}>{activeWithdrawal.momo_provider}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>{activeWithdrawal.momo_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Name</Text>
                      <Text style={styles.detailValue}>{activeWithdrawal.momo_name}</Text>
                    </View>
                  </CardContent>
                </Card>
              </View>

              {/* Admin Receipt Image */}
              {activeWithdrawal.admin_receipt_url && (
                <View style={styles.section}>
                  <Card variant="outlined">
                    <CardHeader title="Payment Receipt" subtitle="Proof of payment from admin" />
                    <CardContent>
                      <Image
                        source={{ uri: getImageUrl(activeWithdrawal.admin_receipt_url) }}
                        style={styles.receiptImage}
                        resizeMode="contain"
                      />
                    </CardContent>
                  </Card>
                </View>
              )}

              {/* Admin Notes */}
              {activeWithdrawal.admin_notes && (
                <View style={styles.section}>
                  <Card variant="outlined">
                    <CardHeader title="Admin Notes" />
                    <CardContent>
                      <Text style={styles.notesText}>{activeWithdrawal.admin_notes}</Text>
                    </CardContent>
                  </Card>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.section}>
                <Button
                  title="Confirm Receipt"
                  onPress={() => {
                    Alert.alert(
                      'Confirm Receipt',
                      `Have you received ${formatCurrency(finalAmount)} in your ${activeWithdrawal.momo_provider} account (${activeWithdrawal.momo_number})?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Yes, Confirm',
                          onPress: () => confirmMutation.mutate({
                            withdrawalId: activeWithdrawal.id,
                            confirmed: true,
                          }),
                        },
                      ]
                    );
                  }}
                  loading={confirmMutation.isPending}
                  fullWidth
                  size="lg"
                />

                <Button
                  title="Dispute - I didn't receive payment"
                  variant="outline"
                  onPress={() => {
                    Alert.prompt(
                      'Dispute Payment',
                      'Please explain the issue with this payment:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Submit Dispute',
                          onPress: (feedback: string | undefined) => {
                            if (!feedback || feedback.trim().length === 0) {
                              Alert.alert('Error', 'Please provide a reason for the dispute');
                              return;
                            }
                            confirmMutation.mutate({
                              withdrawalId: activeWithdrawal.id,
                              confirmed: false,
                              feedback: feedback.trim(),
                            });
                          },
                        },
                      ],
                      'plain-text'
                    );
                  }}
                  loading={confirmMutation.isPending}
                  fullWidth
                  style={{ marginTop: spacing.md }}
                />

                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => setActiveWithdrawalId(null)}
                >
                  <Text style={styles.cancelLinkText}>Go back to withdrawals</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </>
      );
    }

    // DISPUTED - Show dispute pending screen
    if (activeWithdrawal.status === 'disputed') {
      return (
        <>
          <Stack.Screen options={{ headerTitle: 'Withdrawal Disputed' }} />
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
              {/* Disputed Banner */}
              <View style={styles.section}>
                <Card variant="elevated" style={styles.disputedCard}>
                  <CardContent style={styles.disputedCardContent}>
                    <AlertCircle size={48} color={colors.error} />
                    <Text style={styles.disputedTitle}>Dispute Under Review</Text>
                    <Text style={styles.disputedText}>
                      Your dispute has been submitted. Admin is reviewing your concern and will respond soon.
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Details */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="Withdrawal Details" />
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Request Number</Text>
                      <Text style={styles.detailValue}>#{activeWithdrawal.request_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={styles.detailValue}>{formatCurrency(finalAmount)}</Text>
                    </View>
                    {activeWithdrawal.investor_feedback && (
                      <View style={styles.notesSection}>
                        <Text style={styles.detailLabel}>Your Feedback</Text>
                        <Text style={styles.notesText}>{activeWithdrawal.investor_feedback}</Text>
                      </View>
                    )}
                  </CardContent>
                </Card>
              </View>

              {/* What happens next */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="What happens next?" />
                  <CardContent>
                    <View style={styles.infoBox}>
                      <AlertCircle size={16} color={colors.info} />
                      <Text style={styles.infoText}>
                        Once admin reviews and responds to your dispute, you'll be notified. Pull down to refresh and check for updates.
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </View>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setActiveWithdrawalId(null)}
              >
                <Text style={styles.cancelLinkText}>Go back to withdrawals</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </>
      );
    }
  }

  // Separate withdrawals by status
  const pendingWithdrawals = withdrawals?.filter(
    (w) => ['pending', 'approved', 'awaiting_investor_confirmation', 'processing', 'disputed'].includes(w.status)
  ) || [];
  const completedWithdrawals = withdrawals?.filter(
    (w) => ['completed', 'confirmed', 'rejected', 'cancelled'].includes(w.status)
  ) || [];

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Withdrawals' }} />
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
          {/* Balance Summary */}
          <View style={styles.balanceSection}>
            <Card variant="outlined">
              <CardContent style={styles.balanceContent}>
                <View style={styles.balanceItem}>
                  <Wallet size={20} color={colors.primary.DEFAULT} />
                  <Text style={styles.balanceLabel}>Cash Balance</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(cashBalance)}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <TrendingUp size={20} color={colors.success} />
                  <Text style={styles.balanceLabel}>Profit Balance</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(profitBalance)}</Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Request Withdrawal Section */}
          {!showRequestForm ? (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.requestButton}
                onPress={() => setShowRequestForm(true)}
              >
                <View style={styles.requestButtonIcon}>
                  <Plus size={24} color={colors.white} />
                </View>
                <View style={styles.requestButtonContent}>
                  <Text style={styles.requestButtonTitle}>Request Withdrawal</Text>
                  <Text style={styles.requestButtonSubtitle}>
                    Withdraw from your investor account
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.gray[400]} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader
                  title="Request Withdrawal"
                  subtitle="Select source and enter amount"
                />
                <CardContent>
                  {/* Source Selection */}
                  <Text style={styles.fieldLabel}>Withdraw From</Text>
                  <TouchableOpacity
                    style={[
                      styles.sourceCard,
                      selectedSource === 'cash' && styles.sourceCardSelected,
                    ]}
                    onPress={() => setSelectedSource('cash')}
                  >
                    <View style={styles.sourceIcon}>
                      <Wallet size={24} color={colors.primary.DEFAULT} />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={styles.sourceLabel}>Cash Balance</Text>
                      <Text style={styles.sourceBalance}>Available: {formatCurrency(cashBalance)}</Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedSource === 'cash' && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedSource === 'cash' && <View style={styles.radioButtonInner} />}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sourceCard,
                      selectedSource === 'profit' && styles.sourceCardSelected,
                    ]}
                    onPress={() => setSelectedSource('profit')}
                  >
                    <View style={styles.sourceIcon}>
                      <TrendingUp size={24} color={colors.success} />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={styles.sourceLabel}>Profit Balance</Text>
                      <Text style={styles.sourceBalance}>Available: {formatCurrency(profitBalance)}</Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedSource === 'profit' && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedSource === 'profit' && <View style={styles.radioButtonInner} />}
                    </View>
                  </TouchableOpacity>

                  {/* Amount Input */}
                  <Input
                    label="Amount (FCFA)"
                    placeholder="Enter withdrawal amount"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                  />

                  {/* Quick Amounts */}
                  <View style={styles.quickAmounts}>
                    {[25, 50, 75, 100].map((percent) => {
                      const quickAmount = (availableBalance * percent) / 100;
                      return (
                        <TouchableOpacity
                          key={percent}
                          style={styles.quickAmountButton}
                          onPress={() => setAmount(quickAmount.toFixed(0))}
                        >
                          <Text style={styles.quickAmountText}>{percent}%</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Mobile Money Details */}
                  <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Mobile Money Details</Text>
                  <View style={styles.momoInfo}>
                    <Smartphone size={16} color={colors.info} />
                    <Text style={styles.momoInfoText}>
                      Provide your mobile money details where we'll send the funds
                    </Text>
                  </View>

                  <View style={styles.pickerContainer}>
                    <Text style={styles.inputLabel}>Provider</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={momoProvider}
                        onValueChange={(value) => setMomoProvider(value)}
                        style={styles.picker}
                      >
                        {MOMO_PROVIDERS.map((p) => (
                          <Picker.Item key={p.value} label={p.label} value={p.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <Input
                    label="Phone Number"
                    placeholder="Enter your mobile money number"
                    keyboardType="phone-pad"
                    value={momoNumber}
                    onChangeText={setMomoNumber}
                  />

                  <Input
                    label="Account Name"
                    placeholder="Name registered on the account"
                    value={momoName}
                    onChangeText={setMomoName}
                  />

                  {/* Reason */}
                  <Input
                    label="Reason (Optional)"
                    placeholder="Why are you withdrawing?"
                    multiline
                    numberOfLines={2}
                    value={reason}
                    onChangeText={setReason}
                  />

                  {/* Info Box */}
                  <View style={styles.infoBox}>
                    <AlertCircle size={16} color={colors.info} />
                    <Text style={styles.infoText}>
                      After approval, admin will send the funds to your mobile money account. You'll need to confirm receipt before your balance is updated.
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.formActions}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setShowRequestForm(false);
                        setAmount('');
                        setReason('');
                        setMomoNumber('');
                        setMomoName('');
                      }}
                      style={styles.cancelButton}
                    />
                    <Button
                      title="Submit Request"
                      onPress={handleRequestWithdrawal}
                      loading={requestMutation.isPending}
                      disabled={!amount || parseFloat(amount) <= 0 || !momoNumber || !momoName}
                      style={styles.submitButton}
                    />
                  </View>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Pending Withdrawals */}
          {pendingWithdrawals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Withdrawals</Text>
              {pendingWithdrawals.map((withdrawal) => (
                <TouchableOpacity
                  key={withdrawal.id}
                  onPress={() => {
                    if (['awaiting_investor_confirmation', 'disputed'].includes(withdrawal.status)) {
                      setActiveWithdrawalId(withdrawal.id);
                    } else {
                      router.push(`/(investor)/dashboard/withdrawals/${withdrawal.id}`);
                    }
                  }}
                >
                  <Card style={styles.withdrawalCard} variant="outlined">
                    <CardContent style={styles.withdrawalContent}>
                      <View style={styles.withdrawalInfo}>
                        <Text style={styles.withdrawalNumber}>#{withdrawal.request_number}</Text>
                        <Text style={styles.withdrawalAmount}>
                          {formatCurrency(parseFloat(withdrawal.approved_amount || withdrawal.amount))}
                        </Text>
                        <Text style={styles.withdrawalDate}>
                          {formatDate(withdrawal.requested_at)}
                        </Text>
                      </View>
                      <View style={styles.withdrawalStatus}>
                        {getStatusBadge(withdrawal.status)}
                        <ChevronRight size={18} color={colors.gray[400]} style={styles.chevron} />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Completed Withdrawals */}
          {completedWithdrawals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Withdrawal History</Text>
              {completedWithdrawals.map((withdrawal) => (
                <TouchableOpacity
                  key={withdrawal.id}
                  onPress={() => router.push(`/(investor)/dashboard/withdrawals/${withdrawal.id}`)}
                >
                  <Card style={styles.withdrawalCard} variant="outlined">
                    <CardContent style={styles.withdrawalContent}>
                      <View style={styles.withdrawalInfo}>
                        <Text style={styles.withdrawalNumber}>#{withdrawal.request_number}</Text>
                        <Text style={styles.withdrawalAmount}>
                          {formatCurrency(parseFloat(withdrawal.approved_amount || withdrawal.amount))}
                        </Text>
                        <Text style={styles.withdrawalDate}>
                          {formatDate(withdrawal.requested_at)}
                        </Text>
                      </View>
                      <View style={styles.withdrawalStatus}>
                        {getStatusBadge(withdrawal.status)}
                        <ChevronRight size={18} color={colors.gray[400]} style={styles.chevron} />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {(!withdrawals || withdrawals.length === 0) && !showRequestForm && (
            <View style={styles.emptyState}>
              <Wallet size={48} color={colors.gray[300]} />
              <Text style={styles.emptyTitle}>No Withdrawals Yet</Text>
              <Text style={styles.emptyText}>
                Request your first withdrawal when you're ready
              </Text>
            </View>
          )}
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
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  stepCompleted: {
    backgroundColor: colors.success,
  },
  stepNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.gray[500],
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.sm,
  },
  stepLineActive: {
    backgroundColor: colors.success,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  stepLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    textAlign: 'center',
    flex: 1,
  },
  stepLabelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
  // Request Button
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
  },
  requestButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  requestButtonContent: {
    flex: 1,
  },
  requestButtonTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  requestButtonSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  sourceCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sourceContent: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  sourceBalance: {
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
  momoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.sm,
  },
  momoInfoText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  pickerContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  withdrawalCard: {
    marginBottom: spacing.sm,
  },
  withdrawalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalNumber: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  withdrawalAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  withdrawalDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  withdrawalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Success Card
  successCard: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
    borderWidth: 1,
  },
  successCardContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginTop: spacing.md,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  // Disputed Card
  disputedCard: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error,
    borderWidth: 1,
  },
  disputedCardContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  disputedTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginTop: spacing.md,
  },
  disputedText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  // Detail Rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  detailValueBold: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  notesSection: {
    paddingTop: spacing.md,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  cancelLinkText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
});
