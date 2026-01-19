import React from 'react';
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

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.orders.detail(id!));
      return response.data as Order;
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

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);

  return (
    <>
      <Stack.Screen options={{ headerTitle: `Order #${order.order_number}` }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <Badge
              label={formatStatusLabel(order.status)}
              variant={getStatusBadgeVariant(order.status)}
              size="md"
            />
            <Text style={styles.statusDate}>
              Placed on {formatDate(order.created_at)}
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

                {order.tracking_number && (
                  <View style={styles.trackingInfo}>
                    <Text style={styles.trackingLabel}>Tracking Number</Text>
                    <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
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

          {/* Order Items */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title={`Items (${order.order_items?.length || 0})`} />
            <CardContent>
              {order.order_items?.map((item) => (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.itemImage}>
                    {item.product_image ? (
                      <Image
                        source={{ uri: item.product_image }}
                        style={styles.productImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Package size={24} color={colors.gray[300]} />
                      </View>
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemSku}>SKU: {item.product_sku}</Text>
                    <View style={styles.itemPricing}>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(item.price)} × {item.quantity}
                      </Text>
                      <Text style={styles.itemTotal}>
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Card style={styles.section} variant="outlined">
              <CardHeader
                title="Shipping Address"
                action={<MapPin size={18} color={colors.gray[400]} />}
              />
              <CardContent>
                <Text style={styles.addressName}>{order.shipping_address.full_name}</Text>
                <Text style={styles.addressText}>
                  {order.shipping_address.address_line1}
                </Text>
                {order.shipping_address.address_line2 && (
                  <Text style={styles.addressText}>
                    {order.shipping_address.address_line2}
                  </Text>
                )}
                <Text style={styles.addressText}>
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  {order.shipping_address.postal_code}
                </Text>
                <Text style={styles.addressText}>{order.shipping_address.phone}</Text>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title="Payment Summary" />
            <CardContent>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {order.shipping_cost === 0 ? 'Free' : formatCurrency(order.shipping_cost)}
                </Text>
              </View>
              {order.discount_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -{formatCurrency(order.discount_amount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.tax_amount)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
              </View>

              <View style={styles.paymentMethod}>
                <CreditCard size={18} color={colors.gray[500]} />
                <Text style={styles.paymentMethodText}>
                  {order.payment_method === 'card'
                    ? 'Paid with Card'
                    : order.payment_method === 'mobile_payment'
                    ? 'Paid with Mobile Money'
                    : 'Cash on Delivery'}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Actions */}
          {order.status === 'delivered' && (
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
});
