import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Camera,
  CalendarPlus,
  Package,
  ChevronRight,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, Badge, Button } from '@/components/ui';
import { tailorApi } from '@/api/tailor';
import { apiClient } from '@/api/client';
import { formatDate, formatCurrency, formatRelativeTime } from '@/utils/format';
import { getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ServiceBooking, BookingProgress, FittingAppointment } from '@/types';

const PROGRESS_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: colors.gray[500], icon: Clock },
  material_ordered: { label: 'Material Ordered', color: colors.info, icon: Package },
  material_received: { label: 'Material Received', color: colors.info, icon: Package },
  in_production: { label: 'In Production', color: colors.warning, icon: AlertCircle },
  quality_check: { label: 'Quality Check', color: colors.primary.DEFAULT, icon: CheckCircle2 },
  ready_for_collection: { label: 'Ready for Collection', color: colors.success, icon: Truck },
  completed: { label: 'Completed', color: colors.success, icon: CheckCircle2 },
};

export default function TailorBookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: booking,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['tailor', 'booking', id],
    queryFn: () => tailorApi.getBookingById(id!),
    enabled: !!id,
    staleTime: 0,
  });

  const {
    data: fittings,
    isLoading: isLoadingFittings,
    refetch: refetchFittings,
  } = useQuery({
    queryKey: ['booking', id, 'fittings'],
    queryFn: async () => {
      // Fetch fittings for this specific booking using query parameter
      const response = await apiClient.get('/api/fittings', {
        params: { bookingId: id },
      });
      return (response.data || []) as FittingAppointment[];
    },
    enabled: !!id,
    staleTime: 0,
  });

  // Refetch when screen is focused (after adding fitting/progress)
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchFittings();
    }, [refetch, refetchFittings])
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const progressUpdates = booking.progress_updates || [];
  const bookingFittings = fittings || [];

  const handleRefresh = () => {
    refetch();
    refetchFittings();
  };

  const handleCall = () => {
    if (booking.customer_phone) {
      Linking.openURL(`tel:${booking.customer_phone}`);
    }
  };

  const handleEmail = () => {
    if (booking.customer_email) {
      Linking.openURL(`mailto:${booking.customer_email}`);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: `#${booking.booking_number || booking.bookingNumber || ''}`,
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
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <Badge
              label={booking.status.replace(/_/g, ' ')}
              variant={
                booking.status === 'in_progress'
                  ? 'info'
                  : booking.status === 'ready_for_collection'
                  ? 'success'
                  : booking.status === 'completed'
                  ? 'success'
                  : 'default'
              }
            />
            <Text style={styles.dateText}>
              Created {formatDate(booking.created_at)}
            </Text>
          </View>

          {/* Customer Info */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title="Customer Information" />
            <CardContent>
              <View style={styles.customerInfo}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.avatarText}>
                    {booking.customer_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{booking.customer_name}</Text>
                  <Text style={styles.customerEmail}>{booking.customer_email}</Text>
                </View>
              </View>
              <View style={styles.contactButtons}>
                {booking.customer_phone && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleCall}
                  >
                    <Phone size={18} color={colors.primary.DEFAULT} />
                    <Text style={styles.contactButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={handleEmail}
                >
                  <Mail size={18} color={colors.primary.DEFAULT} />
                  <Text style={styles.contactButtonText}>Email</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card style={styles.section} variant="outlined">
            <CardHeader title="Service Details" />
            <CardContent>
              {booking.service?.featured_image && (
                <Image
                  source={{ uri: getImageUrl(booking.service.featured_image) }}
                  style={styles.serviceImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.serviceName}>
                {booking.service?.name || 'Service'}
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Badge
                  label={booking.service_type.replace(/_/g, ' ')}
                  variant="info"
                  size="sm"
                />
              </View>
              {booking.scheduled_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Scheduled:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(booking.scheduled_date)}
                    {booking.scheduled_time && ` at ${booking.scheduled_time}`}
                  </Text>
                </View>
              )}
              {booking.collection_method && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Collection:</Text>
                  <Text style={styles.detailValue}>
                    {booking.collection_method === 'admin_collects'
                      ? 'We collect'
                      : 'Customer brings'}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Customer Requirements */}
          {(booking.desired_outcome || booking.customer_notes) && (
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Customer Requirements" />
              <CardContent>
                {booking.desired_outcome && (
                  <View style={styles.requirement}>
                    <Text style={styles.requirementLabel}>Desired Outcome</Text>
                    <Text style={styles.requirementText}>
                      {booking.desired_outcome}
                    </Text>
                  </View>
                )}
                {booking.customer_notes && (
                  <View style={styles.requirement}>
                    <Text style={styles.requirementLabel}>Notes</Text>
                    <Text style={styles.requirementText}>
                      {booking.customer_notes}
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requirement Photos */}
          {booking.requirement_photos && booking.requirement_photos.length > 0 && (
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Requirement Photos" />
              <CardContent>
                <View style={styles.photoGrid}>
                  {booking.requirement_photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: getImageUrl(photo) }}
                      style={styles.photoThumbnail}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Fitting Appointments */}
          <Card style={styles.section} variant="outlined">
            <CardHeader
              title="Fitting Appointments"
              action={
                <TouchableOpacity
                  onPress={() => router.push(`/(tailor)/fitting/${booking.id}`)}
                >
                  <CalendarPlus size={20} color={colors.primary.DEFAULT} />
                </TouchableOpacity>
              }
            />
            <CardContent>
              {bookingFittings.length > 0 ? (
                bookingFittings.map((fitting: any) => {
                  // Handle both camelCase (API) and snake_case field names
                  const scheduledDate = fitting.scheduledDate || fitting.scheduled_date;
                  const scheduledTime = fitting.scheduledTime || fitting.scheduled_time;
                  const durationMinutes = fitting.durationMinutes || fitting.duration_minutes;
                  const fittingNumber = fitting.fittingNumber || fitting.fitting_number;
                  const status = fitting.status || 'scheduled';

                  return (
                    <View key={fitting.id} style={styles.fittingItem}>
                      <View style={styles.fittingBadge}>
                        <Text style={styles.fittingNumber}>
                          #{fittingNumber}
                        </Text>
                      </View>
                      <View style={styles.fittingDetails}>
                        <Text style={styles.fittingDate}>
                          {scheduledDate ? formatDate(scheduledDate) : 'Not scheduled'}
                        </Text>
                        <Text style={styles.fittingTime}>
                          {scheduledTime || '--:--'} ({durationMinutes || 30} min)
                        </Text>
                      </View>
                      <Badge
                        label={status.replace(/_/g, ' ')}
                        variant={
                          status === 'completed'
                            ? 'success'
                            : status === 'scheduled'
                            ? 'info'
                            : status === 'customer_called'
                            ? 'warning'
                            : 'error'
                        }
                        size="sm"
                      />
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No fitting appointments yet</Text>
              )}
            </CardContent>
          </Card>

          {/* Progress Timeline */}
          <Card style={styles.section} variant="outlined">
            <CardHeader
              title="Progress Updates"
              action={
                <TouchableOpacity
                  onPress={() => router.push(`/(tailor)/progress/${booking.id}`)}
                >
                  <Camera size={20} color={colors.primary.DEFAULT} />
                </TouchableOpacity>
              }
            />
            <CardContent>
              {progressUpdates.length > 0 ? (
                progressUpdates.map((progress: BookingProgress, index: number) => {
                  const config = PROGRESS_STATUS_CONFIG[progress.status] || {
                    label: progress.status,
                    color: colors.gray[500],
                    icon: Clock,
                  };
                  const IconComponent = config.icon;
                  const isLatest = index === 0;

                  return (
                    <View
                      key={progress.id}
                      style={[
                        styles.progressItem,
                        index < progressUpdates.length - 1 && styles.progressItemBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.progressIcon,
                          { backgroundColor: config.color + '20' },
                        ]}
                      >
                        <IconComponent size={16} color={config.color} />
                      </View>
                      <View style={styles.progressContent}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressStatus}>{config.label}</Text>
                          {isLatest && (
                            <Badge label="Latest" variant="info" size="sm" />
                          )}
                        </View>
                        <Text style={styles.progressDescription}>
                          {progress.description}
                        </Text>
                        <Text style={styles.progressDate}>
                          {formatRelativeTime(progress.created_at)}
                        </Text>
                        {progress.photos && progress.photos.length > 0 && (
                          <View style={styles.progressPhotos}>
                            {progress.photos.slice(0, 3).map((photo, idx) => (
                              <Image
                                key={idx}
                                source={{ uri: getImageUrl(photo) }}
                                style={styles.progressPhoto}
                                resizeMode="cover"
                              />
                            ))}
                            {progress.photos.length > 3 && (
                              <View style={styles.morePhotos}>
                                <Text style={styles.morePhotosText}>
                                  +{progress.photos.length - 3}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No progress updates yet</Text>
              )}
            </CardContent>
          </Card>

          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title="Add Progress"
            leftIcon={<Camera size={18} color={colors.white} />}
            onPress={() => router.push(`/(tailor)/progress/${booking.id}`)}
            style={styles.actionButton}
          />
          <Button
            title="Schedule Fitting"
            variant="outline"
            leftIcon={<CalendarPlus size={18} color={colors.primary.DEFAULT} />}
            onPress={() => router.push(`/(tailor)/fitting/${booking.id}`)}
            style={styles.actionButton}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  customerEmail: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  serviceImage: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    width: 100,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    flex: 1,
  },
  requirement: {
    marginBottom: spacing.md,
  },
  requirementLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  requirementText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  fittingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  fittingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  fittingNumber: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  fittingDetails: {
    flex: 1,
  },
  fittingDate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  fittingTime: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  progressItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  progressItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  progressContent: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  progressDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  progressDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  progressPhotos: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  progressPhoto: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[600],
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  actionButton: {
    flex: 1,
  },
});
