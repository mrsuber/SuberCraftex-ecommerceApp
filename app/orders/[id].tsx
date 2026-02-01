import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  MapPin,
  CreditCard,
  Truck,
  Check,
  Clock,
  XCircle,
  Store,
  Wallet,
  AlertTriangle,
} from 'lucide-react-native';
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Order, OrderStatus } from '@/types';

const STATUS_STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'paid', label: 'Payment Confirmed', icon: CreditCard },
  { status: 'processing', label: 'Processing', icon: Package },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: Check },
];

// Countdown timer hook
const useCountdown = (targetDate: Date | null) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { hours, minutes, seconds, expired: false };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.orders.detail(id!));
      // API might return { order: {...} } or just {...}
      return (response.data.order || response.data) as Order;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  // Handle both camelCase (API) and snake_case (types)
  const ord = order as any;
  const orderNumber = ord.orderNumber || ord.order_number;
  const createdAt = ord.createdAt || ord.created_at;
  const orderStatus = ord.orderStatus || ord.status || ord.order_status;
  const trackingNumber = ord.trackingNumber || ord.tracking_number;
  const orderItems = ord.orderItems || ord.order_items || [];
  const shippingAddress = ord.shippingAddress || ord.shipping_address;
  const subtotal = ord.subtotal || 0;
  const shippingCost = ord.shippingCost ?? ord.shipping_cost ?? 0;
  const discountAmount = ord.discountAmount ?? ord.discount_amount ?? 0;
  const taxAmount = ord.taxAmount ?? ord.tax_amount ?? 0;
  const totalAmount = ord.totalAmount || ord.total_amount || 0;
  const paymentMethod = ord.paymentMethod || ord.payment_method || 'cash';
  const shippingMethod = ord.shippingMethod || ord.shipping_method || 'standard';
  const pickupDeadline = ord.pickupDeadline || ord.pickup_deadline;

  const isPickupOrder = shippingMethod === 'in_store';
  const pickupDeadlineDate = pickupDeadline ? new Date(pickupDeadline) : null;
  const countdown = useCountdown(pickupDeadlineDate);

  // Auto-refetch when countdown expires to get updated order status
  useEffect(() => {
    if (countdown.expired && isPickupOrder && orderStatus === 'pending') {
      const timer = setTimeout(() => refetch(), 2000);
      return () => clearTimeout(timer);
    }
  }, [countdown.expired, isPickupOrder, orderStatus, refetch]);

  const isCancelled = orderStatus === 'cancelled' || orderStatus === 'refunded';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === orderStatus);

  return (
    <>
      <Stack.Screen options={{ headerTitle: `Order #${orderNumber}` }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <Badge
              label={formatStatusLabel(orderStatus)}
              variant={getStatusBadgeVariant(orderStatus)}
              size="md"
            />
            <Text style={styles.statusDate}>
              Placed on {formatDate(createdAt)}
            </Text>
          </View>

          {/* Order Timeline */}
          {!isCancelled && (
            <Card style={styles.section} variant="outlined">
              <CardContent>
                <Text style={styles.sectionTitle}>Order Status</Text>
                <View style={styles.timeline}>
                  {STATUS_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <View key={step.status} style={styles.timelineStep}>
                        <View style={styles.timelineIconContainer}>
                          <View
                            style={[
                              styles.timelineIcon,
                              isCompleted && styles.timelineIconCompleted,
                              isCurrent && styles.timelineIconCurrent,
                            ]}
                          >
                            <Icon
                              size={18}
                              color={isCompleted ? colors.white : colors.gray[400]}
                            />
                          </View>
                          {index < STATUS_STEPS.length - 1 && (
                            <View
                              style={[
                                styles.timelineLine,
                                isCompleted && styles.timelineLineCompleted,
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text
                            style={[
                              styles.timelineLabel,
                              isCompleted && styles.timelineLabelCompleted,
                            ]}
                          >
                            {step.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {trackingNumber && (
                  <View style={styles.trackingInfo}>
                    <Text style={styles.trackingLabel}>Tracking Number</Text>
                    <Text style={styles.trackingNumber}>{trackingNumber}</Text>
                    <Button
                      title="Track Package"
                      variant="outline"
                      size="sm"
                      onPress={() => router.push(`/tracking/${order.id}`)}
                      style={styles.trackButton}
                    />
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping & Payment Method */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title="Delivery & Payment" />
            <CardContent>
              {/* Shipping Method */}
              <View style={styles.methodRow}>
                {isPickupOrder ? (
                  <Store size={20} color={colors.primary.DEFAULT} />
                ) : (
                  <Truck size={20} color={colors.primary.DEFAULT} />
                )}
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>
                    {isPickupOrder ? 'Shop Pickup' :
                      shippingMethod === 'express' ? 'Express Delivery' :
                      shippingMethod === 'overnight' ? 'Next Day Delivery' :
                      'Standard Delivery'}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {isPickupOrder ? 'Pick up at SuberCraftex Store, Douala' :
                      shippingMethod === 'express' ? '2-3 business days' :
                      shippingMethod === 'overnight' ? 'Next business day' :
                      '5-7 business days'}
                  </Text>
                </View>
              </View>

              {/* Pickup Countdown */}
              {isPickupOrder && orderStatus === 'pending' && pickupDeadlineDate && (
                <View style={[
                  styles.pickupCountdown,
                  countdown.expired && styles.pickupCountdownExpired,
                  !countdown.expired && countdown.hours < 2 && styles.pickupCountdownWarning,
                ]}>
                  {countdown.expired ? (
                    <>
                      <XCircle size={20} color="#dc2626" />
                      <View style={styles.countdownInfo}>
                        <Text style={styles.countdownExpiredTitle}>Pickup Time Expired</Text>
                        <Text style={styles.countdownExpiredText}>
                          This order will be auto-cancelled shortly
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Clock size={20} color={countdown.hours < 2 ? '#d97706' : colors.primary.DEFAULT} />
                      <View style={styles.countdownInfo}>
                        <Text style={[
                          styles.countdownTitle,
                          countdown.hours < 2 && styles.countdownTitleWarning
                        ]}>
                          Time remaining to pick up
                        </Text>
                        <Text style={[
                          styles.countdownTime,
                          countdown.hours < 2 && styles.countdownTimeWarning
                        ]}>
                          {String(countdown.hours).padStart(2, '0')}:
                          {String(countdown.minutes).padStart(2, '0')}:
                          {String(countdown.seconds).padStart(2, '0')}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {isPickupOrder && orderStatus === 'pending' && (
                <View style={styles.pickupNote}>
                  <AlertTriangle size={14} color="#92400e" />
                  <Text style={styles.pickupNoteText}>
                    Order will be auto-cancelled if not picked up within 12 hours
                  </Text>
                </View>
              )}

              {/* Divider */}
              <View style={styles.methodDivider} />

              {/* Payment Method */}
              <View style={styles.methodRow}>
                <Wallet size={20} color={colors.primary.DEFAULT} />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>
                    {paymentMethod === 'card' ? 'Card Payment' :
                     paymentMethod === 'mobile_payment' ? 'Mobile Money' :
                     'Cash on Delivery'}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {paymentMethod === 'card' ? 'Paid via Credit/Debit Card' :
                     paymentMethod === 'mobile_payment' ? 'Paid via MTN MoMo / Orange Money' :
                     isPickupOrder ? 'Pay when you pick up your order' : 'Pay when you receive your order'}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title={`Items (${orderItems.length})`} />
            <CardContent>
              {orderItems.map((item: any) => {
                const productImage = item.productImage || item.product_image;
                const productName = item.productName || item.product_name || item.name;
                const productSku = item.productSku || item.product_sku || item.sku;
                const itemTotal = item.total || (item.price * item.quantity);

                return (
                  <View key={item.id} style={styles.orderItem}>
                    <View style={styles.itemImage}>
                      {productImage ? (
                        <Image
                          source={{ uri: productImage }}
                          style={styles.productImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Package size={24} color={colors.gray[300]} />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{productName}</Text>
                      {productSku && <Text style={styles.itemSku}>SKU: {productSku}</Text>}
                      <View style={styles.itemPricing}>
                        <Text style={styles.itemPrice}>
                          {formatCurrency(item.price)} × {item.quantity}
                        </Text>
                        <Text style={styles.itemTotal}>
                          {formatCurrency(itemTotal)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </CardContent>
          </Card>

          {/* Shipping Address / Pickup Location */}
          {isPickupOrder ? (
            <Card style={styles.section} variant="outlined">
              <CardHeader
                title="Pickup Location"
                action={<Store size={18} color={colors.gray[400]} />}
              />
              <CardContent>
                <Text style={styles.addressName}>SuberCraftex Store</Text>
                <Text style={styles.addressText}>Douala, Cameroon</Text>
                <Text style={[styles.addressText, { marginTop: spacing.xs }]}>
                  Bring your order confirmation or ID for pickup
                </Text>
              </CardContent>
            </Card>
          ) : shippingAddress && (
            <Card style={styles.section} variant="outlined">
              <CardHeader
                title="Shipping Address"
                action={<MapPin size={18} color={colors.gray[400]} />}
              />
              <CardContent>
                <Text style={styles.addressName}>
                  {shippingAddress.fullName || shippingAddress.full_name}
                </Text>
                <Text style={styles.addressText}>
                  {shippingAddress.addressLine1 || shippingAddress.address_line1}
                </Text>
                {(shippingAddress.addressLine2 || shippingAddress.address_line2) && (
                  <Text style={styles.addressText}>
                    {shippingAddress.addressLine2 || shippingAddress.address_line2}
                  </Text>
                )}
                <Text style={styles.addressText}>
                  {shippingAddress.city}, {shippingAddress.state}{' '}
                  {shippingAddress.postalCode || shippingAddress.postal_code}
                </Text>
                <Text style={styles.addressText}>{shippingAddress.phone}</Text>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title="Payment Summary" />
            <CardContent>
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
              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -{formatCurrency(discountAmount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>{formatCurrency(taxAmount)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
              </View>

              <View style={styles.paymentMethod}>
                <CreditCard size={18} color={colors.gray[500]} />
                <Text style={styles.paymentMethodText}>
                  {paymentMethod === 'card'
                    ? 'Paid with Card'
                    : paymentMethod === 'mobile_payment'
                    ? 'Paid with Mobile Money'
                    : 'Cash on Delivery'}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Actions */}
          {orderStatus === 'delivered' && (
            <View style={styles.actions}>
              <Button
                title="Reorder"
                onPress={() => {
                  // Add items back to cart
                }}
                fullWidth
              />
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
    backgroundColor: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  statusHeader: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  statusDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  section: {
    margin: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  timeline: {
    marginBottom: spacing.md,
  },
  timelineStep: {
    flexDirection: 'row',
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: colors.success,
  },
  timelineIconCurrent: {
    backgroundColor: colors.primary.DEFAULT,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.gray[200],
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: colors.success,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  timelineLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  timelineLabelCompleted: {
    color: colors.gray[900],
    fontWeight: fontWeight.medium,
  },
  trackingInfo: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  trackingLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  trackingNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  trackButton: {
    alignSelf: 'flex-start',
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: 2,
  },
  itemSku: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  itemPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  itemTotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  addressName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
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
    color: colors.gray[900],
  },
  discountValue: {
    color: colors.success,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  totalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  paymentMethodText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  actions: {
    padding: spacing.lg,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  methodDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  methodDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.md,
  },
  pickupCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  pickupCountdownWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  pickupCountdownExpired: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  countdownInfo: {
    flex: 1,
  },
  countdownTitle: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  countdownTitleWarning: {
    color: '#d97706',
  },
  countdownTime: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    fontVariant: ['tabular-nums'],
  },
  countdownTimeWarning: {
    color: '#d97706',
  },
  countdownExpiredTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#dc2626',
  },
  countdownExpiredText: {
    fontSize: fontSize.xs,
    color: '#dc2626',
  },
  pickupNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  pickupNoteText: {
    fontSize: fontSize.xs,
    color: '#92400e',
    flex: 1,
  },
});
