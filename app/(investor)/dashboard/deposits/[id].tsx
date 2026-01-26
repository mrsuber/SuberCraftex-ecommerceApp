import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react-native';
import { Button, Card, CardContent, CardHeader, Badge, Input } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDateTime, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { InvestorDeposit } from '@/types';

export default function DepositConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState('');

  const { data: deposit, isLoading } = useQuery({
    queryKey: ['investor', 'deposit', id],
    queryFn: async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.investor.deposits}/${id}`);
      return response.data as InvestorDeposit;
    },
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: async (data: { confirmed: boolean; feedback?: string }) => {
      const response = await apiClient.post(
        `${API_ENDPOINTS.investor.deposits}/${id}/confirm`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      Alert.alert(
        variables.confirmed ? 'Deposit Confirmed' : 'Dispute Submitted',
        variables.confirmed
          ? 'Your deposit has been confirmed and added to your balance.'
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

  if (!deposit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Deposit not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  // Helper to access deposit fields (handles both camelCase API and snake_case types)
  const dep = deposit as any;
  const confirmationStatus = dep.confirmationStatus || dep.confirmation_status;
  const grossAmount = dep.grossAmount || dep.gross_amount;
  const depositedAt = dep.depositedAt || dep.deposited_at;

  const getStatusIcon = () => {
    switch (confirmationStatus) {
      case 'confirmed':
        return <CheckCircle size={48} color={colors.success} />;
      case 'disputed':
        return <XCircle size={48} color={colors.error} />;
      case 'pending_confirmation':
        return <Clock size={48} color={colors.warning} />;
      default:
        return <AlertTriangle size={48} color={colors.gray[400]} />;
    }
  };

  const getStatusLabel = () => {
    switch (confirmationStatus) {
      case 'confirmed':
        return 'Confirmed';
      case 'disputed':
        return 'Disputed';
      case 'pending_confirmation':
        return 'Pending Confirmation';
      default:
        return confirmationStatus;
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Deposit',
      `Are you sure you want to confirm this deposit of ${formatCurrency(parseFloat(grossAmount))}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
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
      'Are you sure you want to dispute this deposit?',
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

  const isPending = confirmationStatus === 'pending_confirmation';

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Deposit Details' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status Header */}
          <View style={styles.statusSection}>
            {getStatusIcon()}
            <Text style={styles.statusLabel}>{getStatusLabel()}</Text>
            <Text style={styles.depositNumber}>#{dep.depositNumber || dep.deposit_number}</Text>
          </View>

          {/* Amount Details */}
          <View style={styles.section}>
            <Card variant="elevated" style={styles.amountCard}>
              <CardContent>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Gross Amount</Text>
                  <Text style={styles.grossAmount}>
                    {formatCurrency(parseFloat(grossAmount))}
                  </Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Admin Fee ({dep.adminFeePercentage || dep.admin_fee_percentage}%)</Text>
                  <Text style={styles.feeAmount}>
                    -{formatCurrency(parseFloat(dep.adminFeeAmount || dep.admin_fee_amount))}
                  </Text>
                </View>
                <View style={[styles.amountRow, styles.netRow]}>
                  <Text style={styles.netLabel}>Net Amount</Text>
                  <Text style={styles.netAmount}>
                    {formatCurrency(parseFloat(dep.netAmount || dep.net_amount))}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Deposit Info */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Deposit Information" />
              <CardContent>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Deposit Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTime(depositedAt)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment Method</Text>
                  <Text style={styles.infoValue}>
                    {(dep.paymentMethod || dep.payment_method)?.replace('_', ' ').toUpperCase() || 'N/A'}
                  </Text>
                </View>
                {(dep.referenceNumber || dep.reference_number) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reference</Text>
                    <Text style={styles.infoValue}>{dep.referenceNumber || dep.reference_number}</Text>
                  </View>
                )}
                {deposit.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.infoLabel}>Admin Notes</Text>
                    <Text style={styles.notesText}>{deposit.notes}</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Receipt Image */}
          {(dep.receiptImage || dep.receipt_image || dep.receiptUrl || dep.receipt_url) && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Receipt" />
                <CardContent>
                  <Image
                    source={{ uri: getImageUrl(dep.receiptImage || dep.receipt_image || dep.receiptUrl || dep.receipt_url) }}
                    style={styles.receiptImage}
                    resizeMode="contain"
                  />
                </CardContent>
              </Card>
            </View>
          )}

          {/* Confirmation Actions */}
          {isPending && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader
                  title="Confirm Your Deposit"
                  subtitle="Please review the details and confirm or dispute"
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

          {/* Confirmation History */}
          {(dep.confirmedAt || dep.confirmed_at) && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Confirmation History" />
                <CardContent>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Confirmed At</Text>
                    <Text style={styles.infoValue}>
                      {formatDateTime(dep.confirmedAt || dep.confirmed_at)}
                    </Text>
                  </View>
                  {(dep.investorFeedback || dep.investor_feedback) && (
                    <View style={styles.notesSection}>
                      <Text style={styles.infoLabel}>Your Feedback</Text>
                      <Text style={styles.notesText}>{dep.investorFeedback || dep.investor_feedback}</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {isPending && (
          <View style={styles.bottomActions}>
            <Button
              title="Dispute"
              variant="outline"
              onPress={handleDispute}
              loading={confirmMutation.isPending}
              style={styles.disputeButton}
            />
            <Button
              title="Confirm Deposit"
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
  },
  depositNumber: {
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
  },
  grossAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  feeAmount: {
    fontSize: fontSize.base,
    color: colors.white,
    opacity: 0.8,
  },
  netRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginBottom: 0,
  },
  netLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  netAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
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
