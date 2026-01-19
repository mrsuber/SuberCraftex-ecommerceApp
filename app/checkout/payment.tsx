import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { CreditCard, Smartphone, Building, ArrowLeft } from 'lucide-react-native';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { PaymentMethod } from '@/types';

type PaymentOption = {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: any;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    method: 'card',
    label: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or Verve',
    icon: CreditCard,
  },
  {
    method: 'mobile_payment',
    label: 'Mobile Money',
    description: 'Pay with MTN MoMo, Airtel Money, etc.',
    icon: Smartphone,
  },
  {
    method: 'cash',
    label: 'Pay on Delivery',
    description: 'Cash payment when order arrives',
    icon: Building,
  },
];

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    addressId?: string;
    shippingMethod?: string;
    shippingCost?: string;
  }>();

  const { items, getTotalPrice, clearCart } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = getTotalPrice();
  const shippingCost = parseFloat(params.shippingCost || '0');
  const total = subtotal + shippingCost;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddressId: params.addressId,
        shippingMethod: params.shippingMethod,
        paymentMethod: selectedMethod,
      };

      const response = await apiClient.post(API_ENDPOINTS.orders.create, orderData);
      return response.data;
    },
    onSuccess: (order) => {
      clearCart();
      router.replace({
        pathname: '/checkout/confirmation',
        params: { orderId: order.id, orderNumber: order.order_number },
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      Alert.alert(
        'Order Failed',
        error.response?.data?.error || 'Failed to place order. Please try again.'
      );
    },
  });

  const handlePayment = async () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty.');
      return;
    }

    setIsProcessing(true);

    if (selectedMethod === 'card') {
      // For card payments, we would integrate with Stripe here
      // For now, simulate a successful payment
      try {
        // Create payment intent
        const response = await apiClient.post(API_ENDPOINTS.payments.createIntent, {
          amount: total,
          currency: 'ngn',
        });

        // In a real app, you would use Stripe SDK to confirm the payment
        // For demo, we'll just create the order
        createOrderMutation.mutate();
      } catch (error: any) {
        setIsProcessing(false);
        Alert.alert('Payment Failed', 'Could not process card payment.');
      }
    } else {
      // For other payment methods, create order directly
      createOrderMutation.mutate();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Payment',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.method}
                style={[
                  styles.optionCard,
                  selectedMethod === option.method && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedMethod(option.method)}
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
                    selectedMethod === option.method && styles.radioButtonSelected,
                  ]}
                >
                  {selectedMethod === option.method && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Card Details (if card selected) */}
        {selectedMethod === 'card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Details</Text>
            <Card variant="outlined">
              <CardContent>
                <Input
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  keyboardType="number-pad"
                  maxLength={19}
                />
                <View style={styles.cardRow}>
                  <View style={styles.cardHalf}>
                    <Input
                      label="Expiry Date"
                      placeholder="MM/YY"
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.cardHalf}>
                    <Input
                      label="CVV"
                      placeholder="123"
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
                <Input
                  label="Cardholder Name"
                  placeholder="Name on card"
                  autoCapitalize="characters"
                />
              </CardContent>
            </Card>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <Card variant="outlined">
            <CardContent>
              {/* Cart Items */}
              {items.map((item) => (
                <View key={`${item.productId}-${item.variantId}`} style={styles.cartItem}>
                  <View style={styles.cartItemImage}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                    ) : (
                      <View style={styles.itemImagePlaceholder} />
                    )}
                  </View>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.variantName && (
                      <Text style={styles.itemVariant}>{item.variantName}</Text>
                    )}
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              {/* Totals */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>{formatCurrency(total)}</Text>
        </View>
        <Button
          title={isProcessing ? 'Processing...' : `Pay ${formatCurrency(total)}`}
          onPress={handlePayment}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.payButton}
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
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
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
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardHalf: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[200],
  },
  cartItemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  itemVariant: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  itemQuantity: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  summaryTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: spacing.md,
  },
  bottomTotal: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  bottomTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  payButton: {
    flex: 1,
  },
});
