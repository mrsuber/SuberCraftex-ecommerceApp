import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Phone,
  Check,
  X,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { fittingsApi } from '@/api/tailor';
import { formatDate, formatRelativeTime } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { FittingAppointment } from '@/types';

type TabType = 'today' | 'upcoming' | 'past';

const TABS: { key: TabType; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

export default function FittingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('today');

  const {
    data: allFittings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['tailor', 'fittings', 'all'],
    queryFn: () => fittingsApi.getAll(),
  });

  const markCalledMutation = useMutation({
    mutationFn: (id: string) => fittingsApi.markCalled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor', 'fittings'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update');
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      fittingsApi.markAttendance(id, attended),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor', 'fittings'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update');
    },
  });

  const filterFittings = () => {
    if (!allFittings) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (activeTab) {
      case 'today':
        return allFittings.filter((f) => {
          const fDate = new Date(f.scheduled_date);
          fDate.setHours(0, 0, 0, 0);
          return fDate.getTime() === today.getTime() && f.status !== 'cancelled';
        });
      case 'upcoming':
        return allFittings.filter((f) => {
          const fDate = new Date(f.scheduled_date);
          fDate.setHours(0, 0, 0, 0);
          return fDate >= tomorrow && f.status !== 'cancelled';
        });
      case 'past':
        return allFittings.filter((f) => {
          const fDate = new Date(f.scheduled_date);
          fDate.setHours(0, 0, 0, 0);
          return fDate < today || f.status === 'completed' || f.status === 'no_show';
        });
      default:
        return [];
    }
  };

  const fittings = filterFittings();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { variant: 'info' as const, label: 'Scheduled' };
      case 'customer_called':
        return { variant: 'warning' as const, label: 'Called' };
      case 'completed':
        return { variant: 'success' as const, label: 'Completed' };
      case 'no_show':
        return { variant: 'error' as const, label: 'No Show' };
      case 'rescheduled':
        return { variant: 'default' as const, label: 'Rescheduled' };
      case 'cancelled':
        return { variant: 'error' as const, label: 'Cancelled' };
      default:
        return { variant: 'default' as const, label: status };
    }
  };

  const handleMarkCalled = (fitting: FittingAppointment) => {
    Alert.alert(
      'Mark as Called',
      `Confirm that you've called ${fitting.booking?.customer_name || 'the customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => markCalledMutation.mutate(fitting.id),
        },
      ]
    );
  };

  const handleMarkAttendance = (fitting: FittingAppointment, attended: boolean) => {
    const message = attended
      ? `Mark ${fitting.booking?.customer_name || 'customer'} as attended?`
      : `Mark ${fitting.booking?.customer_name || 'customer'} as no show?`;

    Alert.alert(attended ? 'Confirm Attendance' : 'Mark No Show', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => markAttendanceMutation.mutate({ id: fitting.id, attended }),
        style: attended ? 'default' : 'destructive',
      },
    ]);
  };

  const renderFitting = ({ item }: { item: FittingAppointment }) => {
    const statusConfig = getStatusConfig(item.status);
    const isToday = activeTab === 'today';
    const canMarkCalled = isToday && !item.customer_called && item.status === 'scheduled';
    const canMarkAttendance =
      isToday &&
      item.customer_called &&
      item.attended === null &&
      item.status !== 'completed' &&
      item.status !== 'no_show';

    return (
      <Card
        style={styles.fittingCard}
        variant="outlined"
        onPress={() => router.push(`/(tailor)/booking/${item.booking_id}`)}
      >
        <CardContent style={styles.fittingContent}>
          <View style={styles.fittingMain}>
            <View style={styles.fittingHeader}>
              <View style={styles.fittingBadge}>
                <Text style={styles.fittingNumber}>#{item.fitting_number}</Text>
              </View>
              <Badge
                label={statusConfig.label}
                variant={statusConfig.variant}
                size="sm"
              />
            </View>

            <View style={styles.customerRow}>
              <User size={14} color={colors.gray[500]} />
              <Text style={styles.customerName}>
                {item.booking?.customer_name || 'Customer'}
              </Text>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTime}>
                <Calendar size={14} color={colors.primary.DEFAULT} />
                <Text style={styles.dateText}>{formatDate(item.scheduled_date)}</Text>
              </View>
              <View style={styles.dateTime}>
                <Clock size={14} color={colors.primary.DEFAULT} />
                <Text style={styles.timeText}>
                  {item.scheduled_time} ({item.duration_minutes} min)
                </Text>
              </View>
            </View>

            {item.customer_called && item.called_at && (
              <View style={styles.calledInfo}>
                <Phone size={12} color={colors.success} />
                <Text style={styles.calledText}>
                  Called {formatRelativeTime(item.called_at)}
                </Text>
              </View>
            )}

            {item.notes && (
              <Text style={styles.notes} numberOfLines={2}>
                {item.notes}
              </Text>
            )}

            {/* Action Buttons for Today's Fittings */}
            {(canMarkCalled || canMarkAttendance) && (
              <View style={styles.actionButtons}>
                {canMarkCalled && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkCalled(item)}
                    disabled={markCalledMutation.isPending}
                  >
                    <Phone size={14} color={colors.white} />
                    <Text style={styles.actionButtonText}>Mark Called</Text>
                  </TouchableOpacity>
                )}
                {canMarkAttendance && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.attendedButton]}
                      onPress={() => handleMarkAttendance(item, true)}
                      disabled={markAttendanceMutation.isPending}
                    >
                      <Check size={14} color={colors.white} />
                      <Text style={styles.actionButtonText}>Attended</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.noShowButton]}
                      onPress={() => handleMarkAttendance(item, false)}
                      disabled={markAttendanceMutation.isPending}
                    >
                      <X size={14} color={colors.white} />
                      <Text style={styles.actionButtonText}>No Show</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

          <ChevronRight size={20} color={colors.gray[400]} />
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Calendar size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'today'
          ? 'No Fittings Today'
          : activeTab === 'upcoming'
          ? 'No Upcoming Fittings'
          : 'No Past Fittings'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'today'
          ? "You don't have any fitting appointments scheduled for today"
          : activeTab === 'upcoming'
          ? 'No fitting appointments scheduled yet'
          : 'No past fitting records'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : (
        <FlatList
          data={fittings}
          keyExtractor={(item) => item.id}
          renderItem={renderFitting}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary.DEFAULT,
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
    padding: spacing.lg,
    flexGrow: 1,
  },
  fittingCard: {
    marginBottom: spacing.md,
  },
  fittingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  fittingMain: {
    flex: 1,
  },
  fittingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fittingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
  },
  fittingNumber: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  calledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  calledText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  notes: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.sm,
  },
  attendedButton: {
    backgroundColor: colors.success,
  },
  noShowButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
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
