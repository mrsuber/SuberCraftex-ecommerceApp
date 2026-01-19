import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  ChevronRight,
  Camera,
  Calendar,
  Filter,
} from 'lucide-react-native';
import { Card, CardContent, Badge } from '@/components/ui';
import { tailorApi } from '@/api/tailor';
import { formatDate, formatRelativeTime } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ServiceBooking, BookingStatus } from '@/types';

const STATUS_FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Pending', value: 'pending' },
  { label: 'Quote Sent', value: 'quote_sent' },
  { label: 'Quote Approved', value: 'quote_approved' },
  { label: 'Ready', value: 'ready_for_collection' },
];

export default function TailorBookingsScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<string | undefined>(undefined);

  const {
    data: bookings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['tailor', 'bookings', selectedFilter],
    queryFn: () => tailorApi.getBookings(selectedFilter),
    staleTime: 0,
  });

  // Refetch when screen is focused
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'info';
      case 'ready_for_collection':
        return 'success';
      case 'quote_sent':
      case 'quote_approved':
        return 'warning';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const renderBooking = ({ item }: { item: ServiceBooking }) => (
    <Card
      style={styles.bookingCard}
      variant="outlined"
      onPress={() => router.push(`/(tailor)/booking/${item.id}`)}
    >
      <CardContent style={styles.bookingContent}>
        <View style={styles.bookingInfo}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingNumber}>#{item.booking_number}</Text>
            <Badge
              label={item.status.replace(/_/g, ' ')}
              variant={getStatusVariant(item.status)}
              size="sm"
            />
          </View>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.serviceName}>{item.service?.name || 'Service'}</Text>

          <View style={styles.bookingMeta}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.gray[400]} />
              <Text style={styles.metaText}>
                {item.scheduled_date
                  ? formatDate(item.scheduled_date)
                  : 'Not scheduled'}
              </Text>
            </View>
          </View>

          {item.progress_updates && item.progress_updates.length > 0 && (
            <Text style={styles.lastUpdate}>
              Last update: {formatRelativeTime(item.progress_updates[0].created_at)}
            </Text>
          )}
        </View>

        <View style={styles.bookingActions}>
          {(item.status === 'in_progress' || item.status === 'quote_approved') && (
            <TouchableOpacity
              style={styles.progressButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/(tailor)/progress/${item.id}`);
              }}
            >
              <Camera size={18} color={colors.white} />
            </TouchableOpacity>
          )}
          <ChevronRight size={20} color={colors.gray[400]} />
        </View>
      </CardContent>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Package size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>No Bookings Found</Text>
      <Text style={styles.emptyText}>
        {selectedFilter
          ? 'No bookings match the selected filter'
          : 'You have no assigned bookings yet'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Bookings List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : (
        <FlatList
          data={bookings || []}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
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
    backgroundColor: colors.gray[50],
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  bookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bookingNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  customerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  serviceName: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  lastUpdate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
});
