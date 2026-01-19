import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Package, Truck } from 'lucide-react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    orderNumber?: string;
  }>();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <CheckCircle size={80} color={colors.success} />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Order Confirmed!</Text>
        <Text style={styles.subtitle}>
          Thank you for your purchase. Your order has been placed successfully.
        </Text>

        {/* Order Number */}
        <Card style={styles.orderCard} variant="elevated">
          <CardContent style={styles.orderCardContent}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>{params.orderNumber || 'N/A'}</Text>
          </CardContent>
        </Card>

        {/* What's Next */}
        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Package size={24} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Order Processing</Text>
              <Text style={styles.stepDescription}>
                We're preparing your order for shipment.
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Truck size={24} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Shipping Updates</Text>
              <Text style={styles.stepDescription}>
                You'll receive tracking info via email and in-app notifications.
              </Text>
            </View>
          </View>
        </View>

        {/* Email Notice */}
        <Card style={styles.noticeCard} variant="outlined">
          <CardContent>
            <Text style={styles.noticeText}>
              A confirmation email has been sent to your registered email address with
              your order details and receipt.
            </Text>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title="View Order"
          onPress={() => router.replace(`/orders/${params.orderId}`)}
          fullWidth
          style={styles.viewOrderButton}
        />
        <Button
          title="Continue Shopping"
          variant="outline"
          onPress={() => router.replace('/(tabs)')}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  orderCard: {
    width: '100%',
    marginBottom: spacing.xl,
    backgroundColor: colors.primary[50],
  },
  orderCardContent: {
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  orderNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    letterSpacing: 1,
  },
  nextSteps: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  nextStepsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  stepTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  stepConnector: {
    width: 2,
    height: 24,
    backgroundColor: colors.primary[200],
    marginLeft: 23,
    marginVertical: spacing.xs,
  },
  noticeCard: {
    width: '100%',
    backgroundColor: colors.gray[50],
  },
  noticeText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomActions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: spacing.md,
  },
  viewOrderButton: {
    marginBottom: 0,
  },
});
