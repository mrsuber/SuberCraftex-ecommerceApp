import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Truck,
  CreditCard,
  Wallet,
  Check,
  ChevronRight,
  ArrowLeft,
  Plus,
  Clock,
  Zap,
  Package,
} from 'lucide-react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Address } from '@/types';

type ShippingMethod = 'standard' | 'express' | 'overnight' | 'in_store';
type PaymentMethod = 'card' | 'cash' | 'mobile_payment';

const SHIPPING_OPTIONS = [
  { id: 'in_store', label: 'Shop Pickup', time: 'Pick up within 12 hours', cost: 0, icon: MapPin },
  { id: 'standard', label: 'Standard Delivery', time: '5-7 business days', cost: 0, icon: Package },
  { id: 'express', label: 'Express Delivery', time: '2-3 business days', cost: 2000, icon: Truck },
  { id: 'overnight', label: 'Next Day Delivery', time: 'Next business day', cost: 5000, icon: Zap },
];

const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Cash on Delivery', description: 'Pay when you receive your order', icon: Wallet, comingSoon: false },
  { id: 'mobile_payment', label: 'Mobile Money', description: 'MTN MoMo, Orange Money, etc.', icon: CreditCard, comingSoon: true },
  { id: 'card', label: 'Card Payment', description: 'Credit/Debit card via Stripe', icon: CreditCard, comingSoon: true },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Load user addresses
  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.addresses.list);
      return response.data as Address[];
    },
  });

  // Auto-select default address
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find((addr: any) => addr.isDefault || addr.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      } else {
        setSelectedAddress(addresses[0]);
      }
    }
  }, [addresses, selectedAddress]);

  const subtotal = getTotalPrice();
  const shippingCost = SHIPPING_OPTIONS.find(s => s.id === shippingMethod)?.cost || 0;
  const total = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    if (!isPickup && !selectedAddress) {
      Alert.alert('Missing Address', 'Please select a delivery address');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const addr = selectedAddress as any;

      // Format address for API (null for pickup orders without address)
      const addressData = addr ? {
        fullName: addr.fullName || addr.full_name,
        email: user?.email || '',
        phone: addr.phone,
        addressLine1: addr.addressLine1 || addr.address_line1,
        addressLine2: addr.addressLine2 || addr.address_line2 || '',
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode || addr.postal_code,
        country: addr.country,
      } : null;

      const orderData = {
        items: items.map((item) => ({
          id: item.productId,
          name: item.name,
          sku: item.productId,
          image: item.image || '',
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: addressData,
        billingAddress: addressData,
        shippingMethod,
        paymentMethod,
        subtotal,
        shippingCost: isPickup ? 0 : shippingCost,
        taxAmount: 0,
        totalAmount: isPickup ? subtotal : total,
      };

      const response = await apiClient.post(API_ENDPOINTS.orders.create, orderData);
      const order = response.data.order || response.data;

      await clearCart();

      const orderNumber = order.orderNumber || order.order_number || order.id;

      if (paymentMethod === 'cash') {
        Alert.alert(
          'Order Placed!',
          `Your order #${orderNumber} has been placed successfully!\n\nPayment: Cash on Delivery\n\nYou will pay when your order arrives.`,
          [
            {
              text: 'View Orders',
              onPress: () => router.replace('/(tabs)/account'),
            },
            {
              text: 'Continue Shopping',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        router.replace({
          pathname: '/checkout/confirmation',
          params: { orderId: order.id, orderNumber },
        });
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Order Failed',
        error.response?.data?.error || 'Unable to place order. Please try again.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const isPickup = shippingMethod === 'in_store';

  const canProceed = () => {
    if (currentStep === 1) return isPickup || selectedAddress !== null;
    return true;
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            {currentStep > step ? (
              <Check size={16} color={colors.white} />
            ) : (
              <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderAddressSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{isPickup ? 'Pickup Confirmation' : 'Delivery Address'}</Text>

      {isPickup ? (
        <View style={styles.pickupConfirmation}>
          <View style={styles.storeAddressCard}>
            <MapPin size={20} color={colors.primary.DEFAULT} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.storeAddressTitle}>Pickup Location</Text>
              <Text style={styles.storeAddressText}>SuberCraftex Store</Text>
              <Text style={styles.storeAddressText}>Douala, Cameroon</Text>
            </View>
          </View>
          <View style={styles.pickupNotice}>
            <Clock size={18} color="#92400e" />
            <Text style={styles.pickupNoticeText}>
              Please pick up your order within 12 hours of placing it.
            </Text>
          </View>
        </View>
      ) : null}

      {isPickup ? null : (
      <>
      {isLoadingAddresses ? (
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      ) : addresses.length === 0 ? (
        <View style={styles.emptyState}>
          <MapPin size={48} color={colors.gray[400]} />
          <Text style={styles.emptyText}>No saved addresses</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/checkout/shipping')}
          >
            <Plus size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.addButtonText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {addresses.map((address: any) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddress?.id === address.id && styles.cardSelected,
              ]}
              onPress={() => setSelectedAddress(address)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.radioButton}>
                  {selectedAddress?.id === address.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabel}>{address.fullName || address.full_name}</Text>
                  {(address.isDefault || address.is_default) && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.addressText}>{address.addressLine1 || address.address_line1}</Text>
              {(address.addressLine2 || address.address_line2) && (
                <Text style={styles.addressText}>{address.addressLine2 || address.address_line2}</Text>
              )}
              <Text style={styles.addressText}>
                {address.city}, {address.state} {address.postalCode || address.postal_code}
              </Text>
              <Text style={styles.addressPhone}>{address.phone}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => router.push('/checkout/shipping')}
          >
            <Plus size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.addAddressText}>Add New Address</Text>
          </TouchableOpacity>
        </>
      )}
      </>
      )}
    </View>
  );

  const renderShippingMethod = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Shipping Method</Text>

      {SHIPPING_OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              shippingMethod === option.id && styles.cardSelected,
            ]}
            onPress={() => setShippingMethod(option.id as ShippingMethod)}
          >
            <View style={styles.optionHeader}>
              <View style={styles.radioButton}>
                {shippingMethod === option.id && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.optionIcon}>
                <Icon size={24} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionTime}>{option.time}</Text>
              </View>
              <Text style={styles.optionCost}>
                {option.cost === 0 ? 'Free' : formatCurrency(option.cost)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {isPickup && (
        <View style={styles.pickupNotice}>
          <Clock size={18} color="#92400e" />
          <Text style={styles.pickupNoticeText}>
            Your order will be held for 12 hours. If not picked up, it will be automatically cancelled and items returned to stock.
          </Text>
        </View>
      )}

      {isPickup && (
        <View style={styles.storeAddressCard}>
          <MapPin size={18} color={colors.primary.DEFAULT} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.storeAddressTitle}>Pickup Location</Text>
            <Text style={styles.storeAddressText}>SuberCraftex Store</Text>
            <Text style={styles.storeAddressText}>Douala, Cameroon</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderPaymentMethod = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Method</Text>

      {PAYMENT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const disabled = option.comingSoon;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              paymentMethod === option.id && !disabled && styles.cardSelected,
              disabled && styles.optionDisabled,
            ]}
            onPress={() => !disabled && setPaymentMethod(option.id as PaymentMethod)}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.radioButton, disabled && { borderColor: colors.gray[300] }]}>
                {paymentMethod === option.id && !disabled && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.optionIcon}>
                <Icon size={24} color={disabled ? colors.gray[300] : colors.primary.DEFAULT} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionLabel, disabled && { color: colors.gray[400] }]}>{option.label}</Text>
                <Text style={styles.optionTime}>{disabled ? 'Coming soon' : option.description}</Text>
              </View>
              {disabled && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.securityNote}>
        <CreditCard size={16} color={colors.gray[500]} />
        <Text style={styles.securityText}>
          Your payment information is encrypted and secure
        </Text>
      </View>
    </View>
  );

  const renderOrderReview = () => {
    const addr = selectedAddress as any;
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Order Review</Text>

        {/* Delivery Address / Pickup Location */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>
            {isPickup ? 'Pickup Location' : 'Delivery Address'}
          </Text>
          {isPickup ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewText}>SuberCraftex Store</Text>
              <Text style={styles.reviewText}>Douala, Cameroon</Text>
              <Text style={[styles.reviewText, { color: '#92400e', marginTop: 4 }]}>
                Pick up within 12 hours
              </Text>
            </View>
          ) : addr ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewText}>{addr.fullName || addr.full_name}</Text>
              <Text style={styles.reviewText}>{addr.addressLine1 || addr.address_line1}</Text>
              <Text style={styles.reviewText}>
                {addr.city}, {addr.state} {addr.postalCode || addr.postal_code}
              </Text>
              <Text style={styles.reviewText}>{addr.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Shipping Method */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Shipping Method</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewText}>
              {SHIPPING_OPTIONS.find(s => s.id === shippingMethod)?.label} -{' '}
              {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Payment Method</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewText}>
              {PAYMENT_OPTIONS.find(p => p.id === paymentMethod)?.label}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Items ({items.length})</Text>
          <View style={styles.reviewCard}>
            {items.map((item) => (
              <View key={`${item.productId}-${item.variantId}`} style={styles.orderItem}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
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
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Checkout',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  router.back();
                }
              }}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {renderStepIndicator()}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderAddressSelection()}
          {currentStep === 2 && renderShippingMethod()}
          {currentStep === 3 && renderPaymentMethod()}
          {currentStep === 4 && renderOrderReview()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <ArrowLeft size={20} color={colors.primary.DEFAULT} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < 4 ? (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
              onPress={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ChevronRight size={20} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.placeOrderButton, isPlacingOrder && styles.buttonDisabled]}
              onPress={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Check size={20} color={colors.white} />
                  <Text style={styles.placeOrderText}>Place Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
  stepIndicator: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary.DEFAULT,
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
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  cardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  defaultBadge: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  defaultText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginLeft: 28,
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    marginLeft: 28,
    marginTop: spacing.xs,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: 2,
  },
  optionTime: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  optionCost: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  securityText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  reviewSection: {
    marginBottom: spacing.lg,
  },
  reviewSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  reviewText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: 2,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  itemQty: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  nextButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  placeOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  placeOrderText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  optionDisabled: {
    opacity: 0.6,
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
  },
  comingSoonBadge: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  comingSoonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
  },
  pickupNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#fffbeb',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    marginTop: spacing.md,
  },
  pickupNoticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#92400e',
    lineHeight: 20,
  },
  pickupConfirmation: {
    gap: spacing.md,
  },
  storeAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  storeAddressTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: 2,
  },
  storeAddressText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
});
