import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Package,
  Clock,
  ChevronRight,
  Camera,
  Phone,
  Ruler,
  FileText,
  TrendingUp,
  Scissors,
  AlertCircle,
  CalendarPlus,
} from 'lucide-react-native';
import { Button, Badge, Card, CardContent } from '@/components/ui';
import { tailorApi, fittingsApi } from '@/api/tailor';
import { formatDate } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ServiceBooking, FittingAppointment } from '@/types';

type TabType = 'today' | 'upcoming' | 'bookings';

const TABS: { key: TabType; label: string }[] = [
  { key: 'today', label: "Today's Schedule" },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'bookings', label: 'Active Bookings' },
];

export default function TailorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('bookings');

  // Fetch ALL bookings (not filtered by status) so tailor can see everything needing attention
  const {
    data: bookings,
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
    isRefetching: isRefetchingBookings,
  } = useQuery({
    queryKey: ['tailor', 'bookings', 'all'],
    queryFn: () => tailorApi.getBookings(), // No status filter - get all
    staleTime: 0,
  });

  // Fetch all fittings
  const {
    data: allFittings,
    isLoading: isLoadingFittings,
    refetch: refetchFittings,
    isRefetching: isRefetchingFittings,
  } = useQuery({
    queryKey: ['tailor', 'fittings', 'all'],
    queryFn: () => fittingsApi.getAll({ upcoming: true }),
    staleTime: 0,
  });

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetchBookings();
      refetchFittings();
    }, [refetchBookings, refetchFittings])
  );

  const isLoading = isLoadingBookings || isLoadingFittings;
  const isRefetching = isRefetchingBookings || isRefetchingFittings;

  const handleRefresh = () => {
    refetchBookings();
    refetchFittings();
  };

  // Filter fittings
  const today = new Date().toISOString().split('T')[0];
  const todaysFittings = (allFittings || []).filter(f =>
    f.scheduled_date?.startsWith(today)
  );
  const upcomingFittings = (allFittings || []).filter(f =>
    f.scheduled_date > today
  );

  // Filter active bookings (not completed/cancelled)
  const activeBookings = (bookings || []).filter(b =>
    !['completed', 'cancelled', 'no_show'].includes(b.status)
  );

  // Calculate stats
  const totalMeasurements = (bookings || []).filter(b => b.measurement).length;
  const completedFittings = (allFittings || []).filter(f =>
    f.status === 'completed'
  ).length;
  const totalFittings = (allFittings || []).length;
  const completionRate = totalFittings > 0
    ? Math.round((completedFittings / totalFittings) * 100)
    : 0;

  // Get booking priority for display (handles both camelCase and snake_case)
  const getBookingPriority = (booking: any) => {
    const status = booking.status || '';
    const quoteStatus = booking.quote?.status || '';

    if (!booking.measurement) {
      return { level: 'high', label: 'Needs Measurement', color: colors.error };
    }
    if (!booking.quote) {
      return { level: 'high', label: 'Needs Quote', color: '#EA580C' }; // orange-600
    }
    if (quoteStatus === 'draft') {
      return { level: 'medium', label: 'Quote Draft', color: '#CA8A04' }; // yellow-600
    }
    if (status === 'in_progress' || status === 'inProgress') {
      return { level: 'medium', label: 'In Progress', color: colors.info };
    }
    return { level: 'low', label: 'On Track', color: colors.success };
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Tailor Dashboard',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/account')}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary.DEFAULT]}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        {/* Stats Grid - 4 cards like web */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} variant="elevated">
              <CardContent style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.primary[50] }]}>
                  <Scissors size={18} color={colors.primary.DEFAULT} />
                </View>
                <Text style={styles.statValue}>{todaysFittings.length}</Text>
                <Text style={styles.statLabel}>Today's Fittings</Text>
                <Text style={styles.statSubtext}>
                  {todaysFittings.filter(f => f.customer_called).length} called
                </Text>
              </CardContent>
            </Card>
            <Card style={styles.statCard} variant="elevated">
              <CardContent style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                  <FileText size={18} color={colors.info} />
                </View>
                <Text style={styles.statValue}>{activeBookings.length}</Text>
                <Text style={styles.statLabel}>Active Bookings</Text>
                <Text style={styles.statSubtext}>Need attention</Text>
              </CardContent>
            </Card>
          </View>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} variant="elevated">
              <CardContent style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ruler size={18} color="#D97706" />
                </View>
                <Text style={styles.statValue}>{totalMeasurements}</Text>
                <Text style={styles.statLabel}>Measurements</Text>
                <Text style={styles.statSubtext}>Recorded</Text>
              </CardContent>
            </Card>
            <Card style={styles.statCard} variant="elevated">
              <CardContent style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                  <TrendingUp size={18} color={colors.success} />
                </View>
                <Text style={styles.statValue}>{completionRate}%</Text>
                <Text style={styles.statLabel}>Completion Rate</Text>
                <Text style={styles.statSubtext}>{completedFittings}/{totalFittings} fittings</Text>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tailor)/bookings')}
            >
              <View style={styles.actionIcon}>
                <Ruler size={22} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.actionLabel}>Measurements</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tailor)/fittings')}
            >
              <View style={styles.actionIcon}>
                <Scissors size={22} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.actionLabel}>Fittings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tailor)/bookings')}
            >
              <View style={styles.actionIcon}>
                <FileText size={22} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.actionLabel}>All Bookings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {TABS.map((tab) => {
            const count = tab.key === 'today'
              ? todaysFittings.length
              : tab.key === 'upcoming'
                ? upcomingFittings.length
                : activeBookings.length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Today's Fittings */}
          {activeTab === 'today' && (
            <>
              {todaysFittings.length === 0 ? (
                <Card variant="outlined" style={styles.emptyCard}>
                  <CardContent style={styles.emptyContent}>
                    <Calendar size={48} color={colors.gray[300]} />
                    <Text style={styles.emptyText}>No fittings scheduled for today</Text>
                    <Button
                      title="Schedule a Fitting"
                      variant="outline"
                      onPress={() => router.push('/(tailor)/fittings')}
                      style={{ marginTop: spacing.md }}
                    />
                  </CardContent>
                </Card>
              ) : (
                todaysFittings.map((fitting: FittingAppointment) => (
                  <Card
                    key={fitting.id}
                    style={styles.fittingCard}
                    variant="outlined"
                    onPress={() => router.push(`/(tailor)/booking/${fitting.booking_id}`)}
                  >
                    <CardContent style={styles.fittingContent}>
                      <View style={styles.fittingTimeBox}>
                        <Clock size={18} color={colors.primary.DEFAULT} />
                        <Text style={styles.fittingTime}>{fitting.scheduled_time}</Text>
                      </View>
                      <View style={styles.fittingInfo}>
                        <View style={styles.fittingHeader}>
                          <Text style={styles.fittingCustomer}>
                            {fitting.booking?.customer_name || 'Customer'}
                          </Text>
                          {fitting.customer_called && (
                            <Badge label="Called" variant="success" size="sm" />
                          )}
                        </View>
                        <Text style={styles.fittingService}>
                          {fitting.booking?.service?.name} • Fitting #{fitting.fitting_number}
                        </Text>
                        <Text style={styles.fittingBookingNum}>
                          {fitting.booking?.booking_number}
                        </Text>
                        {!fitting.customer_called && (
                          <TouchableOpacity
                            style={styles.callButton}
                            onPress={async (e) => {
                              e.stopPropagation();
                              await fittingsApi.markCalled(fitting.id);
                              refetchFittings();
                            }}
                          >
                            <Phone size={14} color={colors.white} />
                            <Text style={styles.callButtonText}>Mark Called</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <ChevronRight size={20} color={colors.gray[400]} />
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}

          {/* Upcoming Fittings */}
          {activeTab === 'upcoming' && (
            <>
              {upcomingFittings.length === 0 ? (
                <Card variant="outlined" style={styles.emptyCard}>
                  <CardContent style={styles.emptyContent}>
                    <Calendar size={48} color={colors.gray[300]} />
                    <Text style={styles.emptyText}>No upcoming fittings scheduled</Text>
                  </CardContent>
                </Card>
              ) : (
                upcomingFittings.slice(0, 10).map((fitting: FittingAppointment) => (
                  <Card
                    key={fitting.id}
                    style={styles.fittingCard}
                    variant="outlined"
                    onPress={() => router.push(`/(tailor)/booking/${fitting.booking_id}`)}
                  >
                    <CardContent style={styles.fittingContent}>
                      <View style={styles.fittingDateBox}>
                        <Calendar size={18} color={colors.gray[600]} />
                        <Text style={styles.fittingDate}>
                          {formatDate(fitting.scheduled_date)}
                        </Text>
                      </View>
                      <View style={styles.fittingInfo}>
                        <Text style={styles.fittingCustomer}>
                          {fitting.booking?.customer_name || 'Customer'}
                        </Text>
                        <Text style={styles.fittingService}>
                          {fitting.booking?.service?.name} • {fitting.scheduled_time}
                        </Text>
                        <Text style={styles.fittingBookingNum}>
                          {fitting.booking?.booking_number}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.gray[400]} />
                    </CardContent>
                  </Card>
                ))
              )}
              {upcomingFittings.length > 0 && (
                <Button
                  title="View All Fittings"
                  variant="outline"
                  onPress={() => router.push('/(tailor)/fittings')}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </>
          )}

          {/* Active Bookings */}
          {activeTab === 'bookings' && (
            <>
              {activeBookings.length === 0 ? (
                <Card variant="outlined" style={styles.emptyCard}>
                  <CardContent style={styles.emptyContent}>
                    <Package size={48} color={colors.gray[300]} />
                    <Text style={styles.emptyText}>No active bookings at the moment</Text>
                  </CardContent>
                </Card>
              ) : (
                activeBookings.map((booking: any) => {
                  // Handle both camelCase and snake_case field names from API
                  const status = booking.status || 'pending';
                  const customerName = booking.customerName || booking.customer_name || 'Customer';
                  const bookingNumber = booking.bookingNumber || booking.booking_number || '';
                  const serviceName = booking.service?.name || 'Service';

                  // Format status for display (handle both quote_pending and quotePending)
                  const displayStatus = status
                    .replace(/([A-Z])/g, '_$1') // Convert camelCase to snake_case
                    .toLowerCase()
                    .replace(/^_/, '') // Remove leading underscore
                    .replace(/_/g, ' '); // Replace underscores with spaces

                  const priority = getBookingPriority(booking);
                  return (
                    <Card
                      key={booking.id}
                      style={styles.bookingCard}
                      variant="outlined"
                      onPress={() => router.push(`/(tailor)/booking/${booking.id}`)}
                    >
                      <CardContent style={styles.bookingContent}>
                        <View style={styles.bookingMain}>
                          <View style={styles.bookingHeader}>
                            <Text style={styles.bookingCustomer}>
                              {customerName}
                            </Text>
                            <Badge
                              label={displayStatus}
                              variant={
                                status === 'in_progress' || status === 'inProgress' ? 'info' :
                                status === 'quote_approved' || status === 'quoteApproved' ? 'success' :
                                status === 'quote_sent' || status === 'quoteSent' ? 'info' :
                                'default'
                              }
                              size="sm"
                            />
                          </View>
                          <Text style={styles.bookingService}>
                            {serviceName} • #{bookingNumber}
                          </Text>
                          <View style={styles.priorityRow}>
                            <AlertCircle size={14} color={priority.color} />
                            <Text style={[styles.priorityText, { color: priority.color }]}>
                              {priority.label}
                            </Text>
                          </View>

                          {/* Contextual Action Buttons */}
                          <View style={styles.bookingActions}>
                            {!booking.measurement && (
                              <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  router.push(`/(tailor)/booking/${booking.id}`);
                                }}
                              >
                                <Ruler size={14} color={colors.primary.DEFAULT} />
                                <Text style={styles.actionBtnText}>Measure</Text>
                              </TouchableOpacity>
                            )}
                            {(status === 'in_progress' || status === 'inProgress') && (
                              <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  router.push(`/(tailor)/progress/${booking.id}`);
                                }}
                              >
                                <Camera size={14} color={colors.primary.DEFAULT} />
                                <Text style={styles.actionBtnText}>Progress</Text>
                              </TouchableOpacity>
                            )}
                            {(status === 'in_progress' || status === 'inProgress' || booking.quote?.status === 'approved') && (
                              <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  router.push(`/(tailor)/fitting/${booking.id}`);
                                }}
                              >
                                <CalendarPlus size={14} color={colors.primary.DEFAULT} />
                                <Text style={styles.actionBtnText}>Fitting</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={20} color={colors.gray[400]} />
                      </CardContent>
                    </Card>
                  );
                })
              )}
              {activeBookings.length > 0 && (
                <Button
                  title="View All Bookings"
                  variant="outline"
                  onPress={() => router.push('/(tailor)/bookings')}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </>
          )}
        </View>

        <View style={{ height: spacing.xl * 2 }} />
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
  statsSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: colors.gray[400],
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary[50],
  },
  tabText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.primary.DEFAULT,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  fittingCard: {
    marginBottom: spacing.sm,
  },
  fittingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  fittingTimeBox: {
    width: 60,
    height: 60,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  fittingDateBox: {
    width: 60,
    height: 60,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  fittingTime: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    marginTop: 2,
  },
  fittingDate: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginTop: 2,
    textAlign: 'center',
  },
  fittingInfo: {
    flex: 1,
  },
  fittingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  fittingCustomer: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  fittingService: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  fittingBookingNum: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  callButtonText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  bookingCard: {
    marginBottom: spacing.sm,
  },
  bookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  bookingMain: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  bookingCustomer: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  bookingService: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.sm,
  },
  actionBtnText: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
});
