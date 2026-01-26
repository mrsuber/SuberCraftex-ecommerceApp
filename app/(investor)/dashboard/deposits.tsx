import React, { useState, useEffect } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import {
  Wallet,
  Banknote,
  Smartphone,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Plus,
  Upload,
  Camera,
  Image as ImageIcon,
  Copy,
  ArrowRight,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Input, Card, CardContent, CardHeader, Badge } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

type PaymentMethod = 'cash' | 'mobile_money';

type DepositStatus =
  | 'awaiting_payment'
  | 'awaiting_admin_confirmation'
  | 'awaiting_receipt'
  | 'pending_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'cancelled';

interface Deposit {
  id: string;
  depositNumber: string;
  grossAmount: string;
  amount: string;
  charges: string;
  paymentMethod: string;
  confirmationStatus: DepositStatus;
  investorReceiptUrl?: string;
  receiptUrl?: string;
  notes?: string;
  depositedAt: string;
  createdAt: string;
  adminConfirmedAt?: string;
}

// Helper to get current step for mobile money flow
const getMobileMoneyStep = (status: DepositStatus): number => {
  switch (status) {
    case 'awaiting_payment':
      return 1; // Step 1: Send money
    case 'awaiting_admin_confirmation':
      return 2; // Step 2: Receipt uploaded, waiting for admin
    case 'pending_confirmation':
      return 3; // Step 3: Admin confirmed, investor to confirm
    case 'confirmed':
      return 4; // Complete
    default:
      return 1;
  }
};

interface MobileMoneySettings {
  mobileMoneyNumber: string;
  mobileMoneyName: string;
  mobileMoneyProvider: string;
  mobileMoneyInstructions: string;
}

const PAYMENT_METHODS = [
  {
    type: 'cash' as PaymentMethod,
    label: 'Cash',
    description: 'Hand cash directly to admin',
    icon: Banknote,
  },
  {
    type: 'mobile_money' as PaymentMethod,
    label: 'Mobile Money',
    description: 'Send via MTN, Airtel, or Orange Money',
    icon: Smartphone,
  },
];

export default function DepositsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mobile_money');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Fetch mobile money settings
  const { data: mobileMoneySettings } = useQuery({
    queryKey: ['settings', 'mobile-money'],
    queryFn: async () => {
      const response = await apiClient.get('/api/settings/mobile-money');
      return response.data as MobileMoneySettings;
    },
  });

  // Fetch deposits
  const {
    data: deposits,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['investor', 'deposits'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.deposits);
      return response.data as Deposit[];
    },
  });

  // Request deposit mutation
  const requestMutation = useMutation({
    mutationFn: async (data: { amount: number; paymentMethod: PaymentMethod; notes?: string }) => {
      const response = await apiClient.post(API_ENDPOINTS.investor.deposits, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investor', 'deposits'] });
      queryClient.invalidateQueries({ queryKey: ['investor', 'me'] });
      setShowRequestForm(false);
      setAmount('');
      setNotes('');

      if (selectedMethod === 'mobile_money') {
        setActiveDepositId(data.id);
      } else {
        Alert.alert(
          'Deposit Requested',
          'Please hand the cash to the admin and wait for confirmation.',
          [{ text: 'OK' }]
        );
      }
    },
    onError: (error: any) => {
      Alert.alert(
        'Request Failed',
        error.response?.data?.error || 'Failed to submit deposit request.'
      );
    },
  });

  // Upload receipt mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async ({ depositId, receiptUrl }: { depositId: string; receiptUrl: string }) => {
      const response = await apiClient.post(
        `${API_ENDPOINTS.investor.deposits}/${depositId}/upload-receipt`,
        { receiptUrl }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor', 'deposits'] });
      setActiveDepositId(null);
      Alert.alert(
        'Receipt Uploaded',
        'Your receipt has been uploaded. Please wait for admin to confirm.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error || 'Failed to upload receipt.'
      );
    },
  });

  const handleRequestDeposit = () => {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (numAmount < 1000) {
      Alert.alert('Minimum Deposit', 'Minimum deposit amount is 1,000 FCFA.');
      return;
    }

    if (selectedMethod === 'mobile_money' && (!mobileMoneySettings?.mobileMoneyNumber)) {
      Alert.alert('Not Available', 'Mobile money deposit is not configured yet. Please contact admin.');
      return;
    }

    Alert.alert(
      'Confirm Deposit Request',
      `Request deposit of ${formatCurrency(numAmount)} via ${selectedMethod === 'cash' ? 'Cash' : 'Mobile Money'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            requestMutation.mutate({
              amount: numAmount,
              paymentMethod: selectedMethod,
              notes: notes || undefined,
            }),
        },
      ]
    );
  };

  const handleCopyNumber = async () => {
    if (mobileMoneySettings?.mobileMoneyNumber) {
      await Clipboard.setStringAsync(mobileMoneySettings.mobileMoneyNumber);
      Alert.alert('Copied', 'Phone number copied to clipboard');
    }
  };

  const handlePickImage = async (depositId: string) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadReceipt(depositId, result.assets[0].uri);
    }
  };

  const handleTakePhoto = async (depositId: string) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadReceipt(depositId, result.assets[0].uri);
    }
  };

  const uploadReceipt = async (depositId: string, imageUri: string) => {
    setUploadingReceipt(true);

    try {
      // First upload the image
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
      formData.append('type', 'investor-receipt');

      const uploadResponse = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const receiptUrl = uploadResponse.data.url;

      // Then submit the receipt URL
      await uploadReceiptMutation.mutateAsync({ depositId, receiptUrl });
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload receipt image.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const getStatusBadge = (status: DepositStatus) => {
    const configs: Record<DepositStatus, { variant: 'warning' | 'info' | 'success' | 'error' | 'default'; label: string }> = {
      awaiting_payment: { variant: 'warning', label: 'Step 1: Send Money' },
      awaiting_admin_confirmation: { variant: 'info', label: 'Step 2: Verifying' },
      awaiting_receipt: { variant: 'warning', label: 'Upload Receipt' },
      pending_confirmation: { variant: 'success', label: 'Step 3: Confirm' },
      confirmed: { variant: 'success', label: 'Confirmed' },
      disputed: { variant: 'error', label: 'Disputed - Pending' },
      cancelled: { variant: 'default', label: 'Cancelled' },
    };

    const config = configs[status] || configs.awaiting_payment;
    return <Badge label={config.label} variant={config.variant} />;
  };

  // Confirm deposit mutation (for step 3)
  const confirmDepositMutation = useMutation({
    mutationFn: async ({ depositId, confirmed, feedback }: { depositId: string; confirmed: boolean; feedback?: string }) => {
      const response = await apiClient.post(
        `${API_ENDPOINTS.investor.deposits}/${depositId}/confirm`,
        { confirmed, feedback }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor', 'deposits'] });
      queryClient.invalidateQueries({ queryKey: ['investor', 'me'] });
      setActiveDepositId(null);
      Alert.alert(
        'Deposit Confirmed',
        'Your deposit has been confirmed and added to your balance!',
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Confirmation Failed',
        error.response?.data?.error || 'Failed to confirm deposit.'
      );
    },
  });

  // Find active mobile money deposit (any status that needs attention, including disputed)
  const activeMobileDeposit = deposits?.find(
    d => d.id === activeDepositId ||
    (d.paymentMethod === 'mobile_money' &&
     ['awaiting_payment', 'awaiting_admin_confirmation', 'pending_confirmation', 'disputed'].includes(d.confirmationStatus))
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  // Show mobile money flow if there's an active deposit (including disputed)
  if (activeMobileDeposit && ['awaiting_payment', 'awaiting_admin_confirmation', 'pending_confirmation', 'disputed'].includes(activeMobileDeposit.confirmationStatus)) {
    const currentStep = getMobileMoneyStep(activeMobileDeposit.confirmationStatus);

    // Helper to render step indicator
    const renderStepIndicator = () => (
      <>
        <View style={styles.stepIndicator}>
          <View style={[styles.step, currentStep >= 1 && styles.stepActive, currentStep > 1 && styles.stepCompleted]}>
            {currentStep > 1 ? (
              <CheckCircle size={16} color={colors.white} />
            ) : (
              <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
            )}
          </View>
          <View style={[styles.stepLine, currentStep > 1 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 2 && styles.stepActive, currentStep > 2 && styles.stepCompleted]}>
            {currentStep > 2 ? (
              <CheckCircle size={16} color={colors.white} />
            ) : (
              <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
            )}
          </View>
          <View style={[styles.stepLine, currentStep > 2 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 3 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Send Money</Text>
          <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Upload Receipt</Text>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Confirm</Text>
        </View>
      </>
    );

    // STEP 1: Send Money
    if (currentStep === 1) {
      return (
        <>
          <Stack.Screen options={{ headerTitle: 'Mobile Money Deposit' }} />
          <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderStepIndicator()}

              {/* Amount Card */}
              <View style={styles.section}>
                <Card variant="elevated" style={styles.amountCard}>
                  <CardContent>
                    <Text style={styles.amountLabel}>Amount to Send</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(parseFloat(activeMobileDeposit.grossAmount))}
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Mobile Money Details */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="Send Money To" />
                  <CardContent>
                    <View style={styles.momoDetails}>
                      <View style={styles.momoProvider}>
                        <Smartphone size={24} color={colors.primary.DEFAULT} />
                        <Text style={styles.momoProviderText}>
                          {mobileMoneySettings?.mobileMoneyProvider || 'Mobile Money'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.momoNumberContainer}
                        onPress={handleCopyNumber}
                      >
                        <Text style={styles.momoNumber}>
                          {mobileMoneySettings?.mobileMoneyNumber || 'Not configured'}
                        </Text>
                        <Copy size={20} color={colors.primary.DEFAULT} />
                      </TouchableOpacity>

                      <Text style={styles.momoName}>
                        Name: {mobileMoneySettings?.mobileMoneyName || 'Not configured'}
                      </Text>

                      <View style={styles.momoInstructions}>
                        <AlertCircle size={16} color={colors.warning} />
                        <Text style={styles.momoInstructionsText}>
                          {mobileMoneySettings?.mobileMoneyInstructions ||
                            'Send the exact amount shown above. Verify the name matches before confirming your transaction.'}
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </View>

              {/* Action Buttons */}
              <View style={styles.section}>
                <Button
                  title="I've Sent the Money - Upload Receipt"
                  onPress={() => {
                    Alert.alert(
                      'Upload Receipt',
                      'Take a photo or screenshot of your mobile money confirmation message',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Take Photo', onPress: () => handleTakePhoto(activeMobileDeposit.id) },
                        { text: 'Choose from Gallery', onPress: () => handlePickImage(activeMobileDeposit.id) },
                      ]
                    );
                  }}
                  loading={uploadingReceipt}
                  fullWidth
                  size="lg"
                />

                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => setActiveDepositId(null)}
                >
                  <Text style={styles.cancelLinkText}>Cancel and go back</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </>
      );
    }

    // STEP 2: Receipt Uploaded - Waiting for Admin Confirmation
    if (currentStep === 2) {
      return (
        <>
          <Stack.Screen options={{ headerTitle: 'Waiting for Confirmation' }} />
          <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderStepIndicator()}

              {/* Status Card */}
              <View style={styles.section}>
                <Card variant="elevated" style={styles.waitingCard}>
                  <CardContent style={styles.waitingCardContent}>
                    <Clock size={48} color={colors.warning} />
                    <Text style={styles.waitingTitle}>Receipt Under Review</Text>
                    <Text style={styles.waitingText}>
                      Your receipt has been submitted. Admin is verifying your payment.
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Amount Details */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="Deposit Details" />
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount Sent</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(parseFloat(activeMobileDeposit.grossAmount))}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Receipt</Text>
                      <Badge label="Uploaded" variant="success" />
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Badge label="Verifying" variant="warning" />
                    </View>
                  </CardContent>
                </Card>
              </View>

              {/* What to expect */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="What happens next?" />
                  <CardContent>
                    <View style={styles.infoBox}>
                      <AlertCircle size={16} color={colors.info} />
                      <Text style={styles.infoText}>
                        Admin will verify your payment and confirm any transaction charges.
                        You'll then need to do a final confirmation before the funds are added to your account.
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </View>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setActiveDepositId(null)}
              >
                <Text style={styles.cancelLinkText}>Go back to deposits</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </>
      );
    }

    // STEP 3: Admin Confirmed - Investor Final Confirmation
    if (currentStep === 3) {
      const grossAmount = parseFloat(activeMobileDeposit.grossAmount);
      const charges = parseFloat(activeMobileDeposit.charges || '0');
      const netAmount = parseFloat(activeMobileDeposit.amount);

      return (
        <>
          <Stack.Screen options={{ headerTitle: 'Confirm Deposit' }} />
          <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderStepIndicator()}

              {/* Success Banner */}
              <View style={styles.section}>
                <Card variant="elevated" style={styles.successCard}>
                  <CardContent style={styles.successCardContent}>
                    <CheckCircle size={48} color={colors.success} />
                    <Text style={styles.successTitle}>Payment Verified!</Text>
                    <Text style={styles.successText}>
                      Admin has confirmed receiving your payment. Please review the details and confirm.
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Amount Breakdown */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="Deposit Summary" />
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount Sent</Text>
                      <Text style={styles.detailValue}>{formatCurrency(grossAmount)}</Text>
                    </View>
                    {charges > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Transaction Charges</Text>
                        <Text style={[styles.detailValue, { color: colors.error }]}>
                          -{formatCurrency(charges)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, styles.detailLabelBold]}>Amount to Credit</Text>
                      <Text style={[styles.detailValue, styles.detailValueBold, { color: colors.success }]}>
                        {formatCurrency(netAmount)}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </View>

              {/* Admin Notes */}
              {activeMobileDeposit.notes && (
                <View style={styles.section}>
                  <Card variant="outlined">
                    <CardHeader title="Admin Notes" />
                    <CardContent>
                      <Text style={styles.notesText}>{activeMobileDeposit.notes}</Text>
                    </CardContent>
                  </Card>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.section}>
                <Button
                  title="Confirm Deposit"
                  onPress={() => {
                    Alert.alert(
                      'Confirm Deposit',
                      `Are you sure you want to confirm this deposit?\n\nAmount to Credit: ${formatCurrency(netAmount)}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Confirm',
                          onPress: () => confirmDepositMutation.mutate({
                            depositId: activeMobileDeposit.id,
                            confirmed: true,
                          }),
                        },
                      ]
                    );
                  }}
                  loading={confirmDepositMutation.isPending}
                  fullWidth
                  size="lg"
                />

                <Button
                  title="Dispute"
                  variant="outline"
                  onPress={() => {
                    Alert.prompt(
                      'Dispute Deposit',
                      'Please explain the issue with this deposit:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Submit Dispute',
                          onPress: (feedback: string | undefined) => {
                            if (!feedback || feedback.trim().length === 0) {
                              Alert.alert('Error', 'Please provide a reason for the dispute');
                              return;
                            }
                            confirmDepositMutation.mutate({
                              depositId: activeMobileDeposit.id,
                              confirmed: false,
                              feedback: feedback.trim(),
                            });
                          },
                        },
                      ],
                      'plain-text'
                    );
                  }}
                  loading={confirmDepositMutation.isPending}
                  fullWidth
                  style={{ marginTop: spacing.md }}
                />

                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => setActiveDepositId(null)}
                >
                  <Text style={styles.cancelLinkText}>Go back to deposits</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </>
      );
    }

    // DISPUTED - Show dispute pending screen
    if (activeMobileDeposit.confirmationStatus === 'disputed') {
      const grossAmount = parseFloat(activeMobileDeposit.grossAmount);
      const charges = parseFloat(activeMobileDeposit.charges || '0');
      const netAmount = parseFloat(activeMobileDeposit.amount);

      return (
        <>
          <Stack.Screen options={{ headerTitle: 'Deposit Disputed' }} />
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

              {/* Amount Details */}
              <View style={styles.section}>
                <Card variant="outlined">
                  <CardHeader title="Deposit Details" />
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount Sent</Text>
                      <Text style={styles.detailValue}>{formatCurrency(grossAmount)}</Text>
                    </View>
                    {charges > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Charges</Text>
                        <Text style={[styles.detailValue, { color: colors.error }]}>
                          -{formatCurrency(charges)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, styles.detailLabelBold]}>Net Amount</Text>
                      <Text style={[styles.detailValue, styles.detailValueBold]}>
                        {formatCurrency(netAmount)}
                      </Text>
                    </View>
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
                        Once admin reviews and responds to your dispute, this deposit will be available for you to confirm again. Pull down to refresh and check for updates.
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </View>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setActiveDepositId(null)}
              >
                <Text style={styles.cancelLinkText}>Go back to deposits</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </>
      );
    }
  }

  // Separate deposits by status - disputed stays in pending since it needs resolution
  const pendingDeposits = deposits?.filter(
    (d) => ['awaiting_payment', 'awaiting_admin_confirmation', 'awaiting_receipt', 'pending_confirmation', 'disputed'].includes(d.confirmationStatus)
  ) || [];
  const completedDeposits = deposits?.filter(
    (d) => ['confirmed', 'cancelled'].includes(d.confirmationStatus)
  ) || [];

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Deposits' }} />
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
          {/* Request Deposit Section */}
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
                  <Text style={styles.requestButtonTitle}>Request Deposit</Text>
                  <Text style={styles.requestButtonSubtitle}>
                    Top up your investor account
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.gray[400]} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader
                  title="Request Deposit"
                  subtitle="Choose payment method and enter amount"
                />
                <CardContent>
                  {/* Payment Method Selection */}
                  <Text style={styles.fieldLabel}>Payment Method</Text>
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <TouchableOpacity
                        key={method.type}
                        style={[
                          styles.methodCard,
                          selectedMethod === method.type && styles.methodCardSelected,
                        ]}
                        onPress={() => setSelectedMethod(method.type)}
                      >
                        <View style={styles.methodIcon}>
                          <Icon size={24} color={colors.primary.DEFAULT} />
                        </View>
                        <View style={styles.methodContent}>
                          <Text style={styles.methodLabel}>{method.label}</Text>
                          <Text style={styles.methodDescription}>{method.description}</Text>
                        </View>
                        <View
                          style={[
                            styles.radioButton,
                            selectedMethod === method.type && styles.radioButtonSelected,
                          ]}
                        >
                          {selectedMethod === method.type && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Amount Input */}
                  <Input
                    label="Amount (FCFA)"
                    placeholder="Enter deposit amount"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                  />

                  {/* Quick Amounts */}
                  <View style={styles.quickAmounts}>
                    {[5000, 10000, 25000, 50000].map((quickAmount) => (
                      <TouchableOpacity
                        key={quickAmount}
                        style={styles.quickAmountButton}
                        onPress={() => setAmount(quickAmount.toString())}
                      >
                        <Text style={styles.quickAmountText}>
                          {formatCurrency(quickAmount)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Notes */}
                  <Input
                    label="Notes (Optional)"
                    placeholder="Any additional information..."
                    multiline
                    numberOfLines={2}
                    value={notes}
                    onChangeText={setNotes}
                  />

                  {/* Info Box */}
                  <View style={styles.infoBox}>
                    <AlertCircle size={16} color={colors.info} />
                    <Text style={styles.infoText}>
                      {selectedMethod === 'cash'
                        ? 'After submitting, hand the cash to the admin. They will confirm and your balance will be updated.'
                        : 'After submitting, you\'ll see the mobile money number to send to. Upload your receipt after sending.'}
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
                        setNotes('');
                      }}
                      style={styles.cancelButton}
                    />
                    <Button
                      title="Continue"
                      onPress={handleRequestDeposit}
                      loading={requestMutation.isPending}
                      disabled={!amount || parseFloat(amount) <= 0}
                      style={styles.submitButton}
                    />
                  </View>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Pending Deposits */}
          {pendingDeposits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Deposits</Text>
              {pendingDeposits.map((deposit) => (
                <TouchableOpacity
                  key={deposit.id}
                  onPress={() => {
                    // For mobile money deposits, show the step-by-step flow
                    if (deposit.paymentMethod === 'mobile_money' &&
                        ['awaiting_payment', 'awaiting_admin_confirmation', 'pending_confirmation'].includes(deposit.confirmationStatus)) {
                      setActiveDepositId(deposit.id);
                    } else {
                      router.push(`/(investor)/dashboard/deposits/${deposit.id}`);
                    }
                  }}
                >
                  <Card style={styles.depositCard} variant="outlined">
                    <CardContent style={styles.depositContent}>
                      <View style={styles.depositInfo}>
                        <Text style={styles.depositNumber}>#{deposit.depositNumber}</Text>
                        <Text style={styles.depositAmount}>
                          {formatCurrency(parseFloat(deposit.grossAmount))}
                        </Text>
                        <Text style={styles.depositDate}>
                          {formatDate(deposit.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.depositStatus}>
                        {getStatusBadge(deposit.confirmationStatus)}
                        <ChevronRight size={18} color={colors.gray[400]} style={styles.chevron} />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Completed Deposits */}
          {completedDeposits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deposit History</Text>
              {completedDeposits.map((deposit) => (
                <TouchableOpacity
                  key={deposit.id}
                  onPress={() => router.push(`/(investor)/dashboard/deposits/${deposit.id}`)}
                >
                  <Card style={styles.depositCard} variant="outlined">
                    <CardContent style={styles.depositContent}>
                      <View style={styles.depositInfo}>
                        <Text style={styles.depositNumber}>#{deposit.depositNumber}</Text>
                        <Text style={styles.depositAmount}>
                          {formatCurrency(parseFloat(deposit.grossAmount))}
                        </Text>
                        <Text style={styles.depositDate}>
                          {formatDate(deposit.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.depositStatus}>
                        {getStatusBadge(deposit.confirmationStatus)}
                        <ChevronRight size={18} color={colors.gray[400]} style={styles.chevron} />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {(!deposits || deposits.length === 0) && !showRequestForm && (
            <View style={styles.emptyState}>
              <Wallet size={48} color={colors.gray[300]} />
              <Text style={styles.emptyTitle}>No Deposits Yet</Text>
              <Text style={styles.emptyText}>
                Request your first deposit to start investing
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
  section: {
    padding: spacing.lg,
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
  // Amount Card
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
  // Mobile Money Details
  momoDetails: {
    gap: spacing.md,
  },
  momoProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  momoProviderText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  momoNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary[50],
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  momoNumber: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    letterSpacing: 2,
  },
  momoName: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  momoInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  momoInstructionsText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  cancelLinkText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
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
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  methodCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  methodContent: {
    flex: 1,
  },
  methodLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  methodDescription: {
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickAmountButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  quickAmountText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
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
  depositNumber: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  depositAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  depositDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  depositStatus: {
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
  // Waiting Card (Step 2)
  waitingCard: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning,
    borderWidth: 1,
  },
  waitingCardContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  waitingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  waitingText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  // Success Card (Step 3)
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
  detailLabelBold: {
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
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
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
});
