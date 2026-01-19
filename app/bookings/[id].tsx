import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Truck,
  Store,
  Image as ImageIcon,
  ExternalLink,
  CalendarCheck,
  PhoneCall,
  UserCheck,
  UserX,
} from 'lucide-react-native';
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { formatCurrency, formatDate, formatDateTime, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ServiceBooking, BookingStatus, FittingAppointment } from '@/types';

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'cancelled':
    case 'no_show':
      return colors.error;
    case 'confirmed':
    case 'in_progress':
      return colors.primary.DEFAULT;
    case 'quote_sent':
    case 'awaiting_payment':
      return colors.warning;
    default:
      return colors.gray[500];
  }
};

const getStatusLabel = (status: BookingStatus) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const serviceTypeLabels: Record<string, string> = {
  onsite: 'On-Site Service',
  custom_production: 'Custom Production',
  collect_repair: 'Collect & Repair',
};

const collectionMethodLabels: Record<string, string> = {
  admin_collects: 'We collect from you',
  customer_brings: 'You bring to shop',
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.bookings.detail(id!));
      return response.data as ServiceBooking;
    },
    enabled: !!id,
  });

  // Fetch fitting appointments for this booking
  const { data: fittings } = useQuery({
    queryKey: ['booking', id, 'fittings'],
    queryFn: async () => {
      const response = await apiClient.get('/api/fittings', {
        params: { bookingId: id },
      });
      return (response.data || []) as FittingAppointment[];
    },
    enabled: !!id,
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(API_ENDPOINTS.bookings.approveQuote(id!));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      Alert.alert('Success', 'Quote approved! You will be contacted for payment.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve quote.');
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(API_ENDPOINTS.bookings.rejectQuote(id!));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      Alert.alert('Quote Rejected', 'The quote has been rejected.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject quote.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(API_ENDPOINTS.bookings.detail(id!));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled.');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to cancel booking.');
    },
  });

  const handleApproveQuote = () => {
    Alert.alert(
      'Approve Quote',
      `Are you sure you want to approve this quote for ${formatCurrency(booking?.quote?.total_cost || 0)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveQuoteMutation.mutate() },
      ]
    );
  };

  const handleRejectQuote = () => {
    Alert.alert(
      'Reject Quote',
      'Are you sure you want to reject this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => rejectQuoteMutation.mutate(),
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ]
    );
  };

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

  const canApproveQuote = booking.status === 'quote_sent';
  const canCancel = ['pending', 'quote_pending', 'quote_sent', 'confirmed'].includes(booking.status);
  const isWaitingForQuote = !booking.quote && (booking.status === 'quote_pending');

  return (
    <>
      <Stack.Screen options={{ headerTitle: `Booking #${booking.booking_number}` }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status Header */}
          <View style={styles.statusHeader}>
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: getStatusColor(booking.status) + '20' },
              ]}
            >
              {booking.status === 'completed' ? (
                <CheckCircle size={32} color={getStatusColor(booking.status)} />
              ) : booking.status === 'cancelled' ? (
                <XCircle size={32} color={getStatusColor(booking.status)} />
              ) : (
                <AlertCircle size={32} color={getStatusColor(booking.status)} />
              )}
            </View>
            <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
            <Text style={styles.createdDate}>
              Created {formatDate(booking.created_at)}
            </Text>
          </View>

          {/* Waiting for Quote Notice */}
          {isWaitingForQuote && (
            <View style={styles.section}>
              <View style={styles.waitingQuoteCard}>
                <AlertCircle size={20} color={colors.info} />
                <View style={styles.waitingQuoteContent}>
                  <Text style={styles.waitingQuoteTitle}>Waiting for Quote</Text>
                  <Text style={styles.waitingQuoteText}>
                    We're reviewing your request and will send you a detailed quote soon.
                    You'll be notified via email when it's ready.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Service Info */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Service Details" />
              <CardContent style={styles.serviceContent}>
                {booking.service?.featured_image && (
                  <Image
                    source={{ uri: getImageUrl(booking.service.featured_image) }}
                    style={styles.serviceImage}
                  />
                )}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>
                    {booking.service?.name || 'Service'}
                  </Text>
                  {booking.service?.category?.name && (
                    <Text style={styles.serviceCategory}>
                      {booking.service.category.name}
                    </Text>
                  )}
                  <View style={styles.badgeRow}>
                    <Badge
                      label={serviceTypeLabels[booking.service_type] || booking.service_type}
                      variant="info"
                      size="sm"
                    />
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Booking Details */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Booking Details" />
              <CardContent>
                {booking.scheduled_date && (
                  <View style={styles.detailRow}>
                    <Calendar size={18} color={colors.gray[500]} />
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(booking.scheduled_date)}
                    </Text>
                  </View>
                )}
                {booking.scheduled_time && (
                  <View style={styles.detailRow}>
                    <Clock size={18} color={colors.gray[500]} />
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{booking.scheduled_time}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <FileText size={18} color={colors.gray[500]} />
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {serviceTypeLabels[booking.service_type] || booking.service_type}
                  </Text>
                </View>
                {booking.service_type === 'collect_repair' && booking.collection_method && (
                  <View style={styles.detailRow}>
                    {booking.collection_method === 'admin_collects' ? (
                      <Truck size={18} color={colors.gray[500]} />
                    ) : (
                      <Store size={18} color={colors.gray[500]} />
                    )}
                    <Text style={styles.detailLabel}>Collection</Text>
                    <Text style={styles.detailValue}>
                      {collectionMethodLabels[booking.collection_method] || booking.collection_method}
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Contact Information" />
              <CardContent>
                <View style={styles.detailRow}>
                  <User size={18} color={colors.gray[500]} />
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{booking.customer_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Mail size={18} color={colors.gray[500]} />
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {booking.customer_email}
                  </Text>
                </View>
                {booking.customer_phone && (
                  <View style={styles.detailRow}>
                    <Phone size={18} color={colors.gray[500]} />
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{booking.customer_phone}</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Desired Outcome */}
          {booking.desired_outcome && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Desired Outcome" />
                <CardContent>
                  <Text style={styles.notesText}>{booking.desired_outcome}</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Customer Notes */}
          {booking.customer_notes && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Additional Notes" />
                <CardContent>
                  <Text style={styles.notesText}>{booking.customer_notes}</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Requirement Photos */}
          {booking.requirement_photos && booking.requirement_photos.length > 0 && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Requirement Photos" />
                <CardContent>
                  <View style={styles.photoGrid}>
                    {booking.requirement_photos.map((photo: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.photoContainer}
                        onPress={() => {/* Could open full screen viewer */}}
                      >
                        <Image source={{ uri: getImageUrl(photo) }} style={styles.photo} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Selected Materials */}
          {booking.materials && booking.materials.length > 0 && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Selected Materials" />
                <CardContent>
                  {booking.materials.map((bm: any) => (
                    <View key={bm.id} style={styles.materialItem}>
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialName}>
                          {bm.material?.name || 'Material'}
                        </Text>
                        <Text style={styles.materialDetails}>
                          {bm.quantity} {bm.material?.unit || 'units'}
                        </Text>
                        {bm.is_acquired && (
                          <Badge label="Acquired" variant="success" size="sm" />
                        )}
                      </View>
                      <Text style={styles.materialPrice}>
                        {formatCurrency((bm.price_at_booking || 0) * bm.quantity)}
                      </Text>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </View>
          )}

          {/* Material Requests */}
          {booking.material_requests && booking.material_requests.length > 0 && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Requested Materials" />
                <CardContent>
                  <Text style={styles.materialRequestSubtitle}>
                    Materials you requested that we'll source for you
                  </Text>
                  {booking.material_requests.map((mr: any) => (
                    <View key={mr.id} style={styles.materialRequestItem}>
                      <View style={styles.materialRequestHeader}>
                        <Text style={styles.materialRequestDesc}>{mr.description}</Text>
                        <Badge
                          label={mr.status}
                          variant={mr.status === 'acquired' ? 'success' : 'default'}
                          size="sm"
                        />
                      </View>
                      {mr.reference_url && (
                        <TouchableOpacity
                          style={styles.referenceLink}
                          onPress={() => Linking.openURL(mr.reference_url)}
                        >
                          <ExternalLink size={14} color={colors.primary.DEFAULT} />
                          <Text style={styles.referenceLinkText}>Reference Link</Text>
                        </TouchableOpacity>
                      )}
                      {mr.reference_photos && mr.reference_photos.length > 0 && (
                        <View style={styles.referencePhotosNote}>
                          <ImageIcon size={14} color={colors.gray[500]} />
                          <Text style={styles.referencePhotosText}>
                            {mr.reference_photos.length} reference photo(s) attached
                          </Text>
                        </View>
                      )}
                      {mr.admin_notes && (
                        <Text style={styles.adminNotes}>Admin: {mr.admin_notes}</Text>
                      )}
                    </View>
                  ))}
                </CardContent>
              </Card>
            </View>
          )}

          {/* Quote Section */}
          {booking.quote && (
            <View style={styles.section}>
              <Card variant="elevated" style={styles.quoteCard}>
                <CardHeader title="Quote Details" />
                <CardContent>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Material Cost</Text>
                    <Text style={styles.quoteValue}>
                      {formatCurrency(booking.quote.material_cost)}
                    </Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>
                      Labor ({booking.quote.labor_hours} hrs)
                    </Text>
                    <Text style={styles.quoteValue}>
                      {formatCurrency(booking.quote.labor_cost)}
                    </Text>
                  </View>
                  <View style={[styles.quoteRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(booking.quote.total_cost)}
                    </Text>
                  </View>
                  {booking.quote.down_payment_amount > 0 && (
                    <View style={styles.downPaymentRow}>
                      <Text style={styles.downPaymentLabel}>
                        Down Payment Required
                      </Text>
                      <Text style={styles.downPaymentValue}>
                        {formatCurrency(booking.quote.down_payment_amount)}
                      </Text>
                    </View>
                  )}
                  {booking.quote.notes && (
                    <View style={styles.quoteNotes}>
                      <Text style={styles.quoteNotesLabel}>Notes:</Text>
                      <Text style={styles.quoteNotesText}>{booking.quote.notes}</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>
          )}

          {/* Fitting Appointments */}
          {fittings && fittings.length > 0 && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Fitting Appointments" />
                <CardContent>
                  {fittings.map((fitting: any, index: number) => {
                    // Handle both camelCase and snake_case field names
                    const scheduledDate = fitting.scheduledDate || fitting.scheduled_date;
                    const scheduledTime = fitting.scheduledTime || fitting.scheduled_time;
                    const durationMinutes = fitting.durationMinutes || fitting.duration_minutes || 30;
                    const fittingNumber = fitting.fittingNumber || fitting.fitting_number || index + 1;
                    const customerCalled = fitting.customerCalled || fitting.customer_called;
                    const calledAt = fitting.calledAt || fitting.called_at;
                    const status = fitting.status || 'scheduled';

                    const getFittingStatusConfig = (statusVal: string) => {
                      switch (statusVal) {
                        case 'scheduled':
                          return { label: 'Scheduled', variant: 'info' as const, icon: CalendarCheck };
                        case 'customer_called':
                          return { label: 'We Called You', variant: 'warning' as const, icon: PhoneCall };
                        case 'completed':
                          return { label: 'Completed', variant: 'success' as const, icon: UserCheck };
                        case 'no_show':
                          return { label: 'Missed', variant: 'error' as const, icon: UserX };
                        case 'rescheduled':
                          return { label: 'Rescheduled', variant: 'default' as const, icon: Calendar };
                        case 'cancelled':
                          return { label: 'Cancelled', variant: 'error' as const, icon: XCircle };
                        default:
                          return { label: statusVal || 'Scheduled', variant: 'default' as const, icon: Calendar };
                      }
                    };
                    const statusConfig = getFittingStatusConfig(status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <View
                        key={fitting.id}
                        style={[
                          styles.fittingItem,
                          index < fittings.length - 1 && styles.fittingItemBorder,
                        ]}
                      >
                        <View style={styles.fittingIconContainer}>
                          <View
                            style={[
                              styles.fittingIcon,
                              { backgroundColor: colors[statusConfig.variant === 'default' ? 'gray' : statusConfig.variant] + '20' },
                            ]}
                          >
                            <StatusIcon
                              size={18}
                              color={colors[statusConfig.variant === 'default' ? 'gray' : statusConfig.variant]}
                            />
                          </View>
                          <Text style={styles.fittingNumber}>#{fittingNumber}</Text>
                        </View>
                        <View style={styles.fittingDetails}>
                          <View style={styles.fittingDateRow}>
                            <Text style={styles.fittingDate}>
                              {scheduledDate ? formatDate(scheduledDate) : 'Not scheduled'}
                            </Text>
                            <Text style={styles.fittingTime}>
                              {scheduledTime || '--:--'}
                            </Text>
                          </View>
                          <Text style={styles.fittingDuration}>
                            Duration: {durationMinutes} minutes
                          </Text>
                          {customerCalled && calledAt && (
                            <View style={styles.fittingCalledInfo}>
                              <PhoneCall size={12} color={colors.success} />
                              <Text style={styles.fittingCalledText}>
                                We called you on {formatDate(calledAt)}
                              </Text>
                            </View>
                          )}
                          {fitting.attended !== null && fitting.attended !== undefined && (
                            <View style={styles.fittingAttendanceInfo}>
                              {fitting.attended ? (
                                <>
                                  <UserCheck size={12} color={colors.success} />
                                  <Text style={[styles.fittingAttendanceText, { color: colors.success }]}>
                                    You attended this fitting
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <UserX size={12} color={colors.error} />
                                  <Text style={[styles.fittingAttendanceText, { color: colors.error }]}>
                                    Missed this appointment
                                  </Text>
                                </>
                              )}
                            </View>
                          )}
                          {fitting.notes && (
                            <Text style={styles.fittingNotes}>{fitting.notes}</Text>
                          )}
                        </View>
                        <Badge
                          label={statusConfig.label}
                          variant={statusConfig.variant}
                          size="sm"
                        />
                      </View>
                    );
                  })}
                </CardContent>
              </Card>
            </View>
          )}

          {/* Progress Updates */}
          {((booking.progress_updates && booking.progress_updates.length > 0) ||
            (booking.progressUpdates && booking.progressUpdates.length > 0)) && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Progress Updates" />
                <CardContent>
                  {(booking.progress_updates || booking.progressUpdates || []).map((update: any, index: number) => {
                    // Handle both camelCase and snake_case field names
                    const status = update.status || 'pending';
                    const createdAt = update.createdAt || update.created_at;
                    const photos = update.photos || [];

                    return (
                      <View key={update.id || index} style={styles.progressItem}>
                        <View style={styles.progressDot} />
                        <View style={styles.progressContent}>
                          <Text style={styles.progressStatus}>
                            {status.replace(/_/g, ' ')}
                          </Text>
                          {update.description && (
                            <Text style={styles.progressDescription}>
                              {update.description}
                            </Text>
                          )}
                          {createdAt && (
                            <Text style={styles.progressDate}>
                              {formatDateTime(createdAt)}
                            </Text>
                          )}
                          {photos.length > 0 && (
                            <View style={styles.progressPhotos}>
                              {photos.slice(0, 3).map((photo: string, i: number) => (
                                <Image
                                  key={i}
                                  source={{ uri: getImageUrl(photo) }}
                                  style={styles.progressPhoto}
                                />
                              ))}
                              {photos.length > 3 && (
                                <View style={styles.morePhotos}>
                                  <Text style={styles.morePhotosText}>
                                    +{photos.length - 3}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </CardContent>
              </Card>
            </View>
          )}

          {/* Payments */}
          {booking.payments && booking.payments.length > 0 && (
            <View style={styles.section}>
              <Card variant="outlined">
                <CardHeader title="Payments" />
                <CardContent>
                  {booking.payments.map((payment: any) => (
                    <View key={payment.id} style={styles.paymentItem}>
                      <View>
                        <Text style={styles.paymentType}>
                          {payment.payment_type.replace(/_/g, ' ')}
                        </Text>
                        <Text style={styles.paymentDate}>
                          {formatDate(payment.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </View>
          )}

          {/* Pricing */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Pricing" />
              <CardContent>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {booking.final_price ? 'Base Price' : 'Estimated Price'}
                  </Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(booking.price)}
                  </Text>
                </View>
                {booking.final_price && (
                  <View style={[styles.priceRow, styles.finalPriceRow]}>
                    <Text style={styles.finalPriceLabel}>Final Price</Text>
                    <Text style={styles.finalPriceValue}>
                      {formatCurrency(booking.final_price)}
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Action Buttons */}
        {(canApproveQuote || canCancel) && (
          <View style={styles.bottomActions}>
            {canApproveQuote && (
              <>
                <Button
                  title="Reject Quote"
                  variant="outline"
                  onPress={handleRejectQuote}
                  loading={rejectQuoteMutation.isPending}
                  style={styles.rejectButton}
                />
                <Button
                  title="Approve Quote"
                  onPress={handleApproveQuote}
                  loading={approveQuoteMutation.isPending}
                  style={styles.approveButton}
                />
              </>
            )}
            {!canApproveQuote && canCancel && (
              <Button
                title="Cancel Booking"
                variant="outline"
                onPress={handleCancel}
                loading={cancelMutation.isPending}
                fullWidth
              />
            )}
          </View>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  statusHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  createdDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  waitingQuoteCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  waitingQuoteContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  waitingQuoteTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.info,
    marginBottom: spacing.xs,
  },
  waitingQuoteText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  serviceImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  serviceCategory: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.md,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    maxWidth: '50%',
    textAlign: 'right',
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  materialDetails: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  materialPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  materialRequestSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  materialRequestItem: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  materialRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  materialRequestDesc: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginRight: spacing.sm,
  },
  referenceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  referenceLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    marginLeft: spacing.xs,
  },
  referencePhotosNote: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referencePhotosText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  adminNotes: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  quoteCard: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary.DEFAULT,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  quoteLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  quoteValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.primary.DEFAULT,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
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
  downPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
  },
  downPaymentLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  downPaymentValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  quoteNotes: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  quoteNotesLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  quoteNotesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  fittingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  fittingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  fittingIconContainer: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  fittingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  fittingNumber: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  fittingDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fittingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  fittingDate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  fittingTime: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  fittingDuration: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  fittingCalledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  fittingCalledText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  fittingAttendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  fittingAttendanceText: {
    fontSize: fontSize.xs,
  },
  fittingNotes: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  progressItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
    marginTop: 4,
    marginRight: spacing.md,
  },
  progressContent: {
    flex: 1,
  },
  progressStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    textTransform: 'capitalize',
  },
  progressDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
  progressDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 4,
  },
  progressPhotos: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  progressPhoto: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
  },
  morePhotos: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  paymentType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    textTransform: 'capitalize',
  },
  paymentDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  priceValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  finalPriceRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  finalPriceLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  finalPriceValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  rejectButton: {
    flex: 1,
  },
  approveButton: {
    flex: 2,
  },
});
