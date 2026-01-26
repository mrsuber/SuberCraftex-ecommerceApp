import React, { useState, useEffect } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, Smartphone, Building, ArrowLeft } from 'lucide-react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { PaymentMethod, SavedAddress } from '@/types';

type PaymentOption = {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: any;
  comingSoon?: boolean;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    method: 'card',
    label: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or Verve',
    icon: CreditCard,
    comingSoon: true,
  },
  {
    method: 'mobile_payment',
    label: 'Mobile Money',
    description: 'Pay with MTN MoMo, Airtel Money, etc.',
    icon: Smartphone,
    comingSoon: true,
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  const subtotal = getTotalPrice();
  const shippingCost = parseFloat(params.shippingCost || '0');
  const taxAmount = 0; // Could calculate tax here if needed
  const total = subtotal + shippingCost + taxAmount;

  // Fetch address details
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.addresses.list);
      return response.data as SavedAddress[];
    },
  });

  // Find the selected address when addresses load
  useEffect(() => {
    if (addresses.length > 0 && params.addressId) {
      const address = addresses.find((a: any) => a.id === params.addressId);
      if (address) {
        // Normalize the address fields (handle both camelCase and snake_case)
        setShippingAddress({
          fullName: address.fullName || (address as any).full_name,
          phone: address.phone,
          email: (address as any).email || '',
          addressLine1: address.addressLine1 || (address as any).address_line1,
          addressLine2: address.addressLine2 || (address as any).address_line2 || '',
          city: address.city,
          state: address.state,
          postalCode: address.postalCode || (address as any).postal_code,
          country: address.country,
        });
      }
    }
  }, [addresses, params.addressId]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }

      // Format order data according to API requirements
      const orderData = {
        items: items.map((item) => ({
          id: item.productId,
          name: item.name,
          sku: (item as any).sku || 'N/A',
          image: item.image,
          price: item.price,
          quantity: item.quantity,
        })),
        shippingAddress: shippingAddress,
        billingAddress: shippingAddress, // Use shipping as billing for now
        shippingMethod: params.shippingMethod || 'standard',
        paymentMethod: selectedMethod,
        subtotal: subtotal,
        shippingCost: shippingCost,
        taxAmount: taxAmount,
        totalAmount: total,
      };

      const response = await apiClient.post(API_ENDPOINTS.orders.create, orderData);
      return response.data;
    },
    onSuccess: (data) => {
      clearCart();
      router.replace({
        pathname: '/checkout/confirmation',
        params: {
          orderId: data.order?.id || data.id,
          orderNumber: data.order?.orderNumber || data.order_number || data.orderNumber
        },
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      Alert.alert(
        'Order Failed',
        error.response?.data?.error || error.message || 'Failed to place order. Please try again.'
      );
    },
  });

  const handlePayment = async () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty.');
      return;
    }

    if (!shippingAddress) {
      Alert.alert('Address Required', 'Please wait for the address to load or go back and select an address.');
      return;
    }

    setIsProcessing(true);

    // For Pay on Delivery, create order directly
    // Card and mobile payments are coming soon
    createOrderMutation.mutate();
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
            const isDisabled = option.comingSoon;
            const isSelected = selectedMethod === option.method && !isDisabled;
            return (
              <TouchableOpacity
                key={option.method}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  isDisabled && styles.optionCardDisabled,
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    setSelectedMethod(option.method);
                  }
                }}
                disabled={isDisabled}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <View style={[styles.optionIcon, isDisabled && styles.optionIconDisabled]}>
                  <Icon size={24} color={isDisabled ? colors.gray[400] : colors.primary.DEFAULT} />
                </View>
                <View style={styles.optionContent}>
                  <View style={styles.optionLabelRow}>
                    <Text style={[styles.optionLabel, isDisabled && styles.optionLabelDisabled]}>
                      {option.label}
                    </Text>
                    {option.comingSoon && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.optionDescription, isDisabled && styles.optionDescriptionDisabled]}>
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected,
                    isDisabled && styles.radioButtonDisabled,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>


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
          title={
            isProcessing
              ? 'Processing...'
              : selectedMethod === 'cash'
              ? 'Place Order'
              : `Pay ${formatCurrency(total)}`
          }
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
  optionCardDisabled: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.8,
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
  optionIconDisabled: {
    backgroundColor: colors.gray[100],
  },
  optionContent: {
    flex: 1,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  optionLabelDisabled: {
    color: colors.gray[500],
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  optionDescriptionDisabled: {
    color: colors.gray[400],
  },
  comingSoonBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
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
  radioButtonDisabled: {
    borderColor: colors.gray[300],
    backgroundColor: colors.gray[100],
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
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
