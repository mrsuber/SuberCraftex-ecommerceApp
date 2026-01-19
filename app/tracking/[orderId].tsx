import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Truck,
  MapPin,
  Phone,
  Check,
  Clock,
} from 'lucide-react-native';
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatDateTime } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ShippingTracking } from '@/types';

const { width } = Dimensions.get('window');

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const { data: tracking, isLoading, error } = useQuery({
    queryKey: ['tracking', orderId],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.orders.tracking(orderId!));
      return response.data as ShippingTracking;
    },
    enabled: !!orderId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (error || !tracking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tracking information not available</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Package size={20} color={colors.info} />;
      case 'picked_up':
        return <Package size={20} color={colors.primary.DEFAULT} />;
      case 'in_transit':
        return <Truck size={20} color={colors.primary.DEFAULT} />;
      case 'out_for_delivery':
        return <Truck size={20} color={colors.warning} />;
      case 'delivered':
        return <Check size={20} color={colors.success} />;
      default:
        return <Clock size={20} color={colors.gray[400]} />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: 'Driver Assigned',
      picked_up: 'Package Picked Up',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      failed: 'Delivery Failed',
    };
    return labels[status] || status;
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Track Order' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Map Placeholder */}
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <MapPin size={48} color={colors.gray[300]} />
              <Text style={styles.mapPlaceholderText}>
                Live tracking map
              </Text>
            </View>
          </View>

          {/* Current Status */}
          <Card style={styles.section} variant="elevated">
            <CardContent>
              <View style={styles.currentStatus}>
                <View style={styles.statusIconLarge}>
                  {getStatusIcon(tracking.status)}
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>
                    {getStatusLabel(tracking.status)}
                  </Text>
                  {tracking.estimated_delivery_time && (
                    <Text style={styles.estimatedTime}>
                      Estimated delivery: {formatDateTime(tracking.estimated_delivery_time)}
                    </Text>
                  )}
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Driver Info */}
          {tracking.driver && (
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Your Driver" />
              <CardContent>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>
                      {tracking.driver.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>{tracking.driver.full_name}</Text>
                    {tracking.driver.vehicle_number && (
                      <Text style={styles.vehicleInfo}>
                        {tracking.driver.vehicle_type} • {tracking.driver.vehicle_number}
                      </Text>
                    )}
                    <View style={styles.driverRating}>
                      <Text style={styles.ratingText}>
                        ⭐ {tracking.driver.rating.toFixed(1)}
                      </Text>
                      <Text style={styles.deliveryCount}>
                        {tracking.driver.total_deliveries} deliveries
                      </Text>
                    </View>
                  </View>
                  <Button
                    title=""
                    variant="outline"
                    size="sm"
                    leftIcon={<Phone size={18} color={colors.primary.DEFAULT} />}
                    onPress={() => {
                      // Call driver
                    }}
                    style={styles.callButton}
                  />
                </View>
              </CardContent>
            </Card>
          )}

          {/* Tracking History */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title="Tracking History" />
            <CardContent>
              {tracking.history && tracking.history.length > 0 ? (
                <View style={styles.timeline}>
                  {tracking.history.map((event, index) => (
                    <View key={event.id} style={styles.timelineItem}>
                      <View style={styles.timelineDot}>
                        {index === 0 ? (
                          <View style={styles.timelineDotActive} />
                        ) : (
                          <View style={styles.timelineDotInactive} />
                        )}
                        {index < tracking.history!.length - 1 && (
                          <View style={styles.timelineConnector} />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStatus}>
                          {getStatusLabel(event.status)}
                        </Text>
                        {event.location && (
                          <Text style={styles.timelineLocation}>{event.location}</Text>
                        )}
                        {event.notes && (
                          <Text style={styles.timelineNotes}>{event.notes}</Text>
                        )}
                        <Text style={styles.timelineTime}>
                          {formatDateTime(event.recorded_at)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noHistory}>
                  Tracking updates will appear here
                </Text>
              )}
            </CardContent>
          </Card>

          {/* Delivery Location */}
          <Card style={styles.section} variant="outlined">
            <CardHeader
              title="Delivery Location"
              action={<MapPin size={18} color={colors.gray[400]} />}
            />
            <CardContent>
              <Text style={styles.deliveryAddress}>
                {tracking.notes || 'Delivery address on file'}
              </Text>
            </CardContent>
          </Card>
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
  mapContainer: {
    height: 200,
    backgroundColor: colors.gray[100],
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.sm,
  },
  section: {
    margin: spacing.md,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  estimatedTime: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  driverInitial: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  vehicleInfo: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  deliveryCount: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  callButton: {
    width: 44,
    paddingHorizontal: 0,
  },
  timeline: {
    paddingLeft: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineDot: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  timelineDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  timelineDotInactive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gray[300],
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray[200],
    marginTop: 4,
    minHeight: 30,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  timelineLocation: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  timelineNotes: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  timelineTime: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 2,
  },
  noHistory: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  deliveryAddress: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
});
