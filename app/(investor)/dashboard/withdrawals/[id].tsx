import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, XCircle, AlertTriangle, Smartphone } from 'lucide-react-native';
import { Button, Card, CardContent, CardHeader, Badge, Input } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDateTime, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { WithdrawalRequest, WithdrawalStatus } from '@/types';

export default function WithdrawalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState('');

  const {
    data: withdrawal,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['investor', 'withdrawal', id],
    queryFn: async () => {
      // Fetch from the list and find by ID (since we don't have a single withdrawal endpoint)
      const response = await apiClient.get(API_ENDPOINTS.investor.withdrawals);
      const withdrawals = response.data as WithdrawalRequest[];
      return withdrawals.find(w => w.id === id) || null;
    },
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: async (data: { confirmed: boolean; feedback?: string }) => {
      const response = await apiClient.post(
        API_ENDPOINTS.investor.confirmWithdrawal(id!),
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      Alert.alert(
        variables.confirmed ? 'Withdrawal Confirmed' : 'Dispute Submitted',
        variables.confirmed
          ? 'Your withdrawal has been confirmed and your balance has been updated.'
          : 'Your dispute has been submitted for review.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to process your request.'
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

  if (!withdrawal) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Withdrawal not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const getStatusIcon = (status: WithdrawalStatus) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle size={48} color={colors.success} />;
      case 'rejected':
      case 'disputed':
        return <XCircle size={48} color={colors.error} />;
      case 'awaiting_investor_confirmation':
        return <CheckCircle size={48} color={colors.warning} />;
      case 'pending':
      case 'approved':
      case 'processing':
        return <Clock size={48} color={colors.warning} />;
      default:
        return <AlertTriangle size={48} color={colors.gray[400]} />;
    }
  };

  const getStatusLabel = (status: WithdrawalStatus) => {
    const labels: Record<string, string> = {
      pending: 'Under Review',
      approved: 'Approved - Processing',
      awaiting_investor_confirmation: 'Awaiting Your Confirmation',
      processing: 'Processing',
      completed: 'Completed',
      confirmed: 'Confirmed',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      disputed: 'Disputed - Under Review',
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash Withdrawal',
      profit: 'Profit Withdrawal',
      product: 'Product Claim',
      equipment_share: 'Equipment Share Exit',
    };
    return labels[type] || type;
  };

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Receipt',
      `Have you received ${formatCurrency(parseFloat(withdrawal.approved_amount || withdrawal.amount))} in your mobile money account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          onPress: () => confirmMutation.mutate({ confirmed: true }),
        },
      ]
    );
  };

  const handleDispute = () => {
    if (!feedback.trim()) {
      Alert.alert('Feedback Required', 'Please provide details about the dispute.');
      return;
    }

    Alert.alert(
      'Submit Dispute',
      'Are you sure you want to dispute this withdrawal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Dispute',
          style: 'destructive',
          onPress: () => confirmMutation.mutate({ confirmed: false, feedback }),
        },
      ]
    );
  };

  const isAwaitingConfirmation = withdrawal.status === 'awaiting_investor_confirmation';
  const finalAmount = parseFloat(withdrawal.approved_amount || withdrawal.amount);

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Withdrawal Details' }} />
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
          {/* Status Header */}
          <View style={styles.statusSection}>
            {getStatusIcon(withdrawal.status)}
            <Text style={styles.statusLabel}>{getStatusLabel(withdrawal.status)}</Text>
            <Text style={styles.requestNumber}>#{withdrawal.request_number}</Text>
          </View>

          {/* Amount Card */}
          <View style={styles.section}>
            <Card variant="elevated" style={styles.amountCard}>
              <CardContent>
                <Text style={styles.amountLabel}>Withdrawal Amount</Text>
                <Text style={styles.amountValue}>{formatCurrency(finalAmount)}</Text>
                <Text style={styles.amountType}>{getTypeLabel(withdrawal.type)}</Text>
              </CardContent>
            </Card>
          </View>

          {/* Mobile Money Details */}
          {(withdrawal.momo_number || withdrawal.momo_name || withdrawal.momo_provider) && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Mobile Money Details" />
                <CardContent>
                  <View style={styles.momoHeader}>
                    <Smartphone size={20} color={colors.primary.DEFAULT} />
                    <Text style={styles.momoProvider}>{withdrawal.momo_provider}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <Text style={styles.infoValue}>{withdrawal.momo_number}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Name</Text>
                    <Text style={styles.infoValue}>{withdrawal.momo_name}</Text>
                  </View>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Request Info */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Request Information" />
              <CardContent>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Requested On</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTime(withdrawal.requested_at)}
                  </Text>
                </View>
                {withdrawal.processed_at && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Processed On</Text>
                    <Text style={styles.infoValue}>
                      {formatDateTime(withdrawal.processed_at)}
                    </Text>
                  </View>
                )}
                {withdrawal.investor_confirmed_at && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Confirmed On</Text>
                    <Text style={styles.infoValue}>
                      {formatDateTime(withdrawal.investor_confirmed_at)}
                    </Text>
                  </View>
                )}
                {withdrawal.request_reason && (
                  <View style={styles.notesSection}>
                    <Text style={styles.infoLabel}>Your Reason</Text>
                    <Text style={styles.notesText}>{withdrawal.request_reason}</Text>
                  </View>
                )}
                {withdrawal.investor_notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.infoLabel}>Your Notes</Text>
                    <Text style={styles.notesText}>{withdrawal.investor_notes}</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Admin Receipt Image */}
          {withdrawal.admin_receipt_url && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Payment Receipt" subtitle="Proof of payment from admin" />
                <CardContent>
                  <Image
                    source={{ uri: getImageUrl(withdrawal.admin_receipt_url) }}
                    style={styles.receiptImage}
                    resizeMode="contain"
                  />
                </CardContent>
              </Card>
            </View>
          )}

          {/* Admin Notes */}
          {withdrawal.admin_notes && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Admin Notes" />
                <CardContent>
                  <Text style={styles.notesText}>{withdrawal.admin_notes}</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Rejection Reason */}
          {withdrawal.rejection_reason && (
            <View style={styles.section}>
              <Card variant="outlined" style={styles.rejectionCard}>
                <CardHeader title="Rejection Reason" />
                <CardContent>
                  <Text style={styles.rejectionText}>{withdrawal.rejection_reason}</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Investor Feedback (for disputed) */}
          {withdrawal.investor_feedback && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Your Dispute Feedback" />
                <CardContent>
                  <Text style={styles.notesText}>{withdrawal.investor_feedback}</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Confirmation Actions */}
          {isAwaitingConfirmation && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader
                  title="Confirm Your Withdrawal"
                  subtitle="Please verify you received the payment"
                />
                <CardContent>
                  <Input
                    label="Feedback (required for disputes)"
                    placeholder="Enter any issues or corrections..."
                    multiline
                    numberOfLines={3}
                    value={feedback}
                    onChangeText={setFeedback}
                  />
                </CardContent>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {isAwaitingConfirmation && (
          <View style={styles.bottomActions}>
            <Button
              title="Dispute"
              variant="outline"
              onPress={handleDispute}
              loading={confirmMutation.isPending}
              style={styles.disputeButton}
            />
            <Button
              title="Confirm Receipt"
              onPress={handleConfirm}
              loading={confirmMutation.isPending}
              style={styles.confirmButton}
            />
          </View>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  statusLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  requestNumber: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  amountCard: {
    backgroundColor: colors.primary.DEFAULT,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  amountType: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  momoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  momoProvider: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
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
  rejectionCard: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  rejectionText: {
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  disputeButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});
