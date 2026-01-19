import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, Wrench } from 'lucide-react-native';
import { Badge, Card, CardContent } from '@/components/ui';
import { servicesApi } from '@/api/services';
import { formatCurrency, formatDate } from '@/utils/format';
import { getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ServiceBooking } from '@/types';

export default function BookingsScreen() {
  const router = useRouter();

  const {
    data: bookings = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['bookings'],
    queryFn: servicesApi.getMyBookings,
  });

  const renderBooking = ({ item }: { item: ServiceBooking }) => (
    <Card
      style={styles.bookingCard}
      variant="outlined"
      onPress={() => router.push(`/bookings/${item.id}`)}
    >
      <CardContent style={styles.bookingContent}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.bookingNumber}>#{item.booking_number}</Text>
            <Text style={styles.bookingDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <Badge
            label={formatStatusLabel(item.status)}
            variant={getStatusBadgeVariant(item.status)}
          />
        </View>

        <View style={styles.serviceInfo}>
          <View style={styles.serviceIcon}>
            <Wrench size={24} color={colors.primary.DEFAULT} />
          </View>
          <View style={styles.serviceDetails}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.service?.name || 'Service'}
            </Text>
            <Text style={styles.serviceType}>
              {item.service_type.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {item.scheduled_date && (
          <View style={styles.scheduleInfo}>
            <Calendar size={16} color={colors.gray[500]} />
            <Text style={styles.scheduleText}>
              {formatDate(item.scheduled_date)}
              {item.scheduled_time ? ` at ${item.scheduled_time}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.bookingFooter}>
          <View>
            <Text style={styles.priceLabel}>
              {item.final_price ? 'Final Price' : 'Estimated'}
            </Text>
            <Text style={styles.priceValue}>
              {formatCurrency(item.final_price || item.price)}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </View>
      </CardContent>
    </Card>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Wrench size={60} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No Bookings Yet</Text>
        <Text style={styles.emptyText}>
          Your service bookings will appear here.
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'My Bookings' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={bookings}
            renderItem={renderBooking}
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
  listContent: {
    padding: spacing.lg,
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  bookingContent: {
    padding: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  bookingDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  serviceType: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textTransform: 'capitalize',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  priceValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
