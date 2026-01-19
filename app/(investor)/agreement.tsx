import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, FileText } from 'lucide-react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const AGREEMENT_SECTIONS = [
  {
    title: '1. Investment Terms',
    content: `By participating in the SuberCraftex Investment Program, you agree to invest funds that will be allocated to products or equipment. Your returns will be based on the performance of these allocations.`,
  },
  {
    title: '2. Profit Distribution',
    content: `Profits from product sales and equipment usage will be distributed according to your investment percentage. Product allocations return 70% of profit to investors, while equipment allocations share profits based on your stake.`,
  },
  {
    title: '3. Withdrawal Terms',
    content: `You may withdraw your funds through four methods: Cash Withdrawal (subject to available cash balance), Profit Withdrawal, Product Withdrawal (receive products at cost price), or Equipment Share Exit (sell your equipment stake).`,
  },
  {
    title: '4. Risk Disclosure',
    content: `All investments carry risk. While we strive to protect your capital through tangible asset allocation, returns are not guaranteed. Past performance does not indicate future results.`,
  },
  {
    title: '5. KYC Requirements',
    content: `You must complete identity verification (KYC) before making deposits or withdrawals. This is required by law to prevent fraud and money laundering.`,
  },
  {
    title: '6. Fees and Charges',
    content: `Mobile money deposits may incur transaction fees from the payment provider. These charges are deducted before crediting your account. There are no hidden fees from SuberCraftex.`,
  },
  {
    title: '7. Account Security',
    content: `You are responsible for maintaining the security of your account. Do not share your login credentials. Report any suspicious activity immediately.`,
  },
  {
    title: '8. Termination',
    content: `Either party may terminate this agreement with 30 days notice. Upon termination, all outstanding balances will be settled according to the withdrawal terms.`,
  },
];

export default function AgreementScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert(
        'Agreement Required',
        'Please read and accept the investment agreement to continue.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.investor.acceptAgreement);
      Alert.alert(
        'Welcome!',
        'You are now registered as an investor. You can start making deposits once your KYC is approved.',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(investor)/dashboard') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to accept agreement. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <FileText size={32} color={colors.primary.DEFAULT} />
          </View>
          <Text style={styles.title}>Investment Agreement</Text>
          <Text style={styles.subtitle}>
            Please read the following terms carefully before proceeding
          </Text>
        </View>

        {/* Agreement Content */}
        <View style={styles.content}>
          {AGREEMENT_SECTIONS.map((section, index) => (
            <Card key={index} style={styles.sectionCard} variant="outlined">
              <CardContent>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionContent}>{section.content}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Accept Checkbox */}
        <View style={styles.acceptSection}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAccepted(!accepted)}
          >
            <View
              style={[
                styles.checkboxBox,
                accepted && styles.checkboxBoxChecked,
              ]}
            >
              {accepted && <Check size={16} color={colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read, understood, and agree to the Investment Agreement and
              Terms of Service
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <Button
          title="Accept & Continue"
          onPress={handleAccept}
          loading={isLoading}
          disabled={!accepted}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  sectionContent: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 22,
  },
  acceptSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 22,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
