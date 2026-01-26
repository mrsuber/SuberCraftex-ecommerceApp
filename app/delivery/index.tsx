import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Truck,
  CheckCircle,
  MapPin,
  Clock,
  ChevronLeft,
  Phone,
} from 'lucide-react-native';
import { Badge, getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import { apiClient } from '@/api/client';
import { formatCurrency, formatDate } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/config/theme';

type TabType = 'available' | 'my-deliveries';

interface AvailableOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  shippingAddress: any;
  shippingMethod: string;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
  }>;
}

interface Delivery {
  id: string;
  orderId: string;
  status: string;
  orderNumber: string;
  totalAmount: number;
  shippingAddress: any;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
  }>;
}

interface DriverStats {
  totalDeliveries: number;
  completedToday: number;
  activeDeliveries: number;
}

interface DriverProfile {
  isAvailable: boolean;
}

export default function DeliveryManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('available');

  // Fetch driver profile
  const { data: profileData } = useQuery({
    queryKey: ['driver-profile'],
    queryFn: async () => {
      const response = await apiClient.get('/api/drivers/me');
      return response.data as { driver: DriverProfile; stats: DriverStats };
    },
  });

  // Fetch available orders
  const {
    data: availableOrders = [],
    isLoading: loadingAvailable,
    refetch: refetchAvailable,
    isRefetching: refetchingAvailable,
  } = useQuery({
    queryKey: ['available-orders'],
    queryFn: async () => {
      const response = await apiClient.get('/api/drivers/orders/available');
      return response.data.orders as AvailableOrder[];
    },
    enabled: activeTab === 'available',
  });

  // Fetch my deliveries
  const {
    data: myDeliveries = [],
    isLoading: loadingDeliveries,
    refetch: refetchDeliveries,
    isRefetching: refetchingDeliveries,
  } = useQuery({
    queryKey: ['my-deliveries'],
    queryFn: async () => {
      const response = await apiClient.get('/api/drivers/orders/my-deliveries?status=active');
      return response.data.deliveries as Delivery[];
    },
    enabled: activeTab === 'my-deliveries',
  });

  // Toggle availability
  const toggleAvailability = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      await apiClient.patch('/api/drivers/me', { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });

  // Claim order
  const claimOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post('/api/drivers/orders/claim', { orderId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      Alert.alert('Success', 'Order claimed! Check My Deliveries tab.');
      setActiveTab('my-deliveries');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to claim order');
    },
  });

  // Update delivery status
  const updateStatus = useMutation({
    mutationFn: async ({ trackingId, status }: { trackingId: string; status: string }) => {
      const response = await apiClient.patch(`/api/drivers/orders/${trackingId}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      if (variables.status === 'delivered') {
        Alert.alert('Success', 'Delivery completed!');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    },
  });

  const handleClaimOrder = (order: AvailableOrder) => {
    const shortNum = order.orderNumber.split('-').pop();
    Alert.alert(
      'Claim Order',
      `Claim order #${shortNum} for delivery?\n\nTotal: ${formatCurrency(order.totalAmount)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Claim', onPress: () => claimOrder.mutate(order.id) },
      ]
    );
  };

  const handleUpdateStatus = (delivery: Delivery, newStatus: string) => {
    if (newStatus === 'delivered') {
      Alert.alert('Confirm Delivery', 'Mark this order as delivered?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateStatus.mutate({ trackingId: delivery.id, status: newStatus }) },
      ]);
    } else {
      updateStatus.mutate({ trackingId: delivery.id, status: newStatus });
    }
  };

  const getNextStatus = (currentStatus: string): { status: string; label: string } | null => {
    const flow: Record<string, { status: string; label: string }> = {
      assigned: { status: 'picked_up', label: 'Mark Picked Up' },
      picked_up: { status: 'in_transit', label: 'Start Transit' },
      in_transit: { status: 'out_for_delivery', label: 'Out for Delivery' },
      out_for_delivery: { status: 'delivered', label: 'Mark Delivered' },
    };
    return flow[currentStatus] || null;
  };

  const stats = profileData?.stats;
  const driver = profileData?.driver;

  const renderAvailableOrder = ({ item }: { item: AvailableOrder }) => {
    const shortNum = item.orderNumber.split('-').pop();
    const address = item.shippingAddress;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>#{shortNum}</Text>
          <Text style={styles.orderAmount}>{formatCurrency(item.totalAmount)}</Text>
        </View>

        <View style={styles.orderMeta}>
          <Clock size={14} color={colors.gray[400]} />
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderItems}>• {item.itemCount} items</Text>
        </View>

        {address && (
          <View style={styles.addressRow}>
            <MapPin size={14} color={colors.gray[500]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {address.city}, {address.state}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => handleClaimOrder(item)}
          disabled={claimOrder.isPending}
        >
          {claimOrder.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.claimButtonText}>Claim Order</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderDelivery = ({ item }: { item: Delivery }) => {
    const shortNum = item.orderNumber.split('-').pop();
    const address = item.shippingAddress;
    const nextAction = getNextStatus(item.status);
    const isOutForDelivery = item.status === 'out_for_delivery';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/delivery/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleRow}>
            <Text style={styles.orderNumber}>#{shortNum}</Text>
            <Badge
              label={formatStatusLabel(item.status)}
              variant={getStatusBadgeVariant(item.status)}
              size="sm"
            />
          </View>
          <Text style={styles.orderAmount}>{formatCurrency(item.totalAmount)}</Text>
        </View>

        {address && (
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{address.fullName || item.customerName || 'Customer'}</Text>
            <View style={styles.addressRow}>
              <MapPin size={14} color={colors.gray[500]} />
              <Text style={styles.addressText} numberOfLines={2}>
                {address.addressLine1}, {address.city}
              </Text>
            </View>
            {(address.phone || item.customerPhone) && (
              <View style={styles.phoneRow}>
                <Phone size={14} color={colors.primary.DEFAULT} />
                <Text style={styles.phoneText}>{address.phone || item.customerPhone}</Text>
              </View>
            )}
          </View>
        )}

        {nextAction && !isOutForDelivery && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              nextAction.status === 'delivered' && styles.deliveredButton,
            ]}
            onPress={() => handleUpdateStatus(item, nextAction.status)}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.actionButtonText}>{nextAction.label}</Text>
            )}
          </TouchableOpacity>
        )}

        {isOutForDelivery && (
          <View style={styles.completeHint}>
            <Text style={styles.completeHintText}>Tap to complete with photo & signature</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Package size={50} color={colors.gray[300]} />
      <Text style={styles.emptyText}>
        {activeTab === 'available'
          ? 'No orders available for delivery'
          : 'No active deliveries'}
      </Text>
    </View>
  );

  const isLoading = activeTab === 'available' ? loadingAvailable : loadingDeliveries;
  const isRefetching = activeTab === 'available' ? refetchingAvailable : refetchingDeliveries;
  const data = activeTab === 'available' ? availableOrders : myDeliveries;
  const refetch = activeTab === 'available' ? refetchAvailable : refetchDeliveries;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Management</Text>
        <View style={styles.headerRight} />
      </View>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.activeDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.completedToday || 0}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.availabilityItem}>
            <Text style={styles.availabilityLabel}>Available</Text>
            <Switch
              value={driver?.isAvailable || false}
              onValueChange={(val) => toggleAvailability.mutate(val)}
              trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
              thumbColor={driver?.isAvailable ? colors.primary.DEFAULT : colors.gray[400]}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
            onPress={() => setActiveTab('available')}
          >
            <Package size={18} color={activeTab === 'available' ? colors.primary.DEFAULT : colors.gray[500]} />
            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
              Available ({availableOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my-deliveries' && styles.tabActive]}
            onPress={() => setActiveTab('my-deliveries')}
          >
            <Truck size={18} color={activeTab === 'my-deliveries' ? colors.primary.DEFAULT : colors.gray[500]} />
            <Text style={[styles.tabText, activeTab === 'my-deliveries' && styles.tabTextActive]}>
              My Deliveries ({myDeliveries.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={activeTab === 'available' ? renderAvailableOrder : renderDelivery}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary.DEFAULT]}
                tintColor={colors.primary.DEFAULT}
              />
            }
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Balance the back button
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  availabilityItem: {
    alignItems: 'center',
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[200],
  },
  availabilityLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  tabActive: {
    backgroundColor: colors.primary[50],
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  tabTextActive: {
    color: colors.primary.DEFAULT,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  orderAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  orderDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  orderItems: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  customerInfo: {
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phoneText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
  },
  claimButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  claimButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  actionButton: {
    backgroundColor: colors.info,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deliveredButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  completeHint: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  completeHintText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
});
