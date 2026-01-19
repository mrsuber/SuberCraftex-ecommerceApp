import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  MapPin,
  Package,
  CheckCircle,
  Star,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { servicesApi } from '@/api/services';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Service, ServiceBooking, BookingStatus } from '@/types';

type TabType = 'services' | 'bookings' | 'completed';

const TABS: { key: TabType; label: string }[] = [
  { key: 'services', label: 'Services' },
  { key: 'bookings', label: 'My Bookings' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: '#B45309', bgColor: '#FFFBEB' },
  quote_pending: { label: 'Quote Pending', color: '#1D4ED8', bgColor: '#EFF6FF' },
  quote_sent: { label: 'Quote Sent', color: '#1D4ED8', bgColor: '#EFF6FF' },
  quote_approved: { label: 'Quote Approved', color: '#15803D', bgColor: '#F0FDF4' },
  quote_rejected: { label: 'Quote Rejected', color: '#EF4444', bgColor: '#FEF2F2' },
  awaiting_payment: { label: 'Awaiting Payment', color: '#B45309', bgColor: '#FFFBEB' },
  payment_partial: { label: 'Partial Payment', color: '#B45309', bgColor: '#FFFBEB' },
  confirmed: { label: 'Confirmed', color: '#15803D', bgColor: '#F0FDF4' },
  in_progress: { label: 'In Progress', color: '#E11D48', bgColor: '#FEF2F4' },
  awaiting_collection: { label: 'Ready for Collection', color: '#15803D', bgColor: '#F0FDF4' },
  completed: { label: 'Completed', color: '#15803D', bgColor: '#F0FDF4' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: '#F3F4F6' },
  no_show: { label: 'No Show', color: '#EF4444', bgColor: '#FEF2F2' },
  rescheduled: { label: 'Rescheduled', color: '#1D4ED8', bgColor: '#EFF6FF' },
};

export default function ServicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');

  // Fetch services
  const {
    data: services,
    isLoading: servicesLoading,
    refetch: refetchServices,
    isRefetching: servicesRefetching,
  } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  // Fetch user's bookings
  const {
    data: bookings,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
    isRefetching: bookingsRefetching,
  } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: servicesApi.getMyBookings,
    enabled: isAuthenticated,
    staleTime: 0, // Always consider data stale to refetch on focus
  });

  // Refetch bookings when screen is focused (to get updated status)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetchBookings();
      }
    }, [isAuthenticated, refetchBookings])
  );

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: string; data: { rating: number; title?: string; content?: string } }) =>
      servicesApi.createBookingReview(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setReviewModalVisible(false);
      setSelectedBooking(null);
      setRating(5);
      setReviewTitle('');
      setReviewContent('');
      Alert.alert('Success', 'Thank you for your review!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit review');
    },
  });

  // Filter bookings
  const activeBookings = bookings?.filter(
    (b) => !['completed', 'cancelled', 'no_show'].includes(b.status)
  ) || [];

  const completedBookings = bookings?.filter(
    (b) => b.status === 'completed'
  ) || [];

  const handleOpenReviewModal = (booking: ServiceBooking) => {
    setSelectedBooking(booking);
    setReviewModalVisible(true);
  };

  const handleSubmitReview = () => {
    if (!selectedBooking) return;
    createReviewMutation.mutate({
      bookingId: selectedBooking.id,
      data: {
        rating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
      },
    });
  };

  const renderServiceCard = ({ item }: { item: Service }) => (
    <Card
      style={styles.serviceCard}
      variant="elevated"
      onPress={() => router.push(`/service/${item.id}`)}
    >
      <View style={styles.serviceImageContainer}>
        {item.featured_image || item.images?.[0] ? (
          <Image
            source={{ uri: item.featured_image || item.images[0] }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.serviceImagePlaceholder}>
            <Package size={40} color={colors.gray[300]} />
          </View>
        )}
      </View>
      <CardContent style={styles.serviceContent}>
        <Text style={styles.serviceName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description || item.short_description}
        </Text>
        <View style={styles.serviceFooter}>
          <Text style={styles.requestQuoteText}>Request Quote</Text>
          <ChevronRight size={20} color={colors.primary.DEFAULT} />
        </View>
      </CardContent>
    </Card>
  );

  const renderBookingCard = ({ item }: { item: ServiceBooking }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const latestProgress = item.progress_updates?.[0];

    return (
      <Card
        style={styles.bookingCard}
        variant="elevated"
        onPress={() => router.push(`/bookings/${item.id}`)}
      >
        <CardContent>
          <View style={styles.bookingHeader}>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingNumber}>#{item.booking_number}</Text>
              <Text style={styles.bookingServiceName}>{item.service?.name}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {latestProgress && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Latest Update:</Text>
              <Text style={styles.progressText}>{latestProgress.status.replace(/_/g, ' ')}</Text>
            </View>
          )}

          {item.scheduled_date && (
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Clock size={14} color={colors.gray[500]} />
                <Text style={styles.detailText}>
                  {new Date(item.scheduled_date).toLocaleDateString()}
                  {item.scheduled_time && ` at ${item.scheduled_time}`}
                </Text>
              </View>
            </View>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCompletedCard = ({ item }: { item: ServiceBooking }) => {
    const hasReview = false; // TODO: Check from booking data

    return (
      <Card style={styles.bookingCard} variant="elevated">
        <CardContent>
          <View style={styles.bookingHeader}>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingNumber}>#{item.booking_number}</Text>
              <Text style={styles.bookingServiceName}>{item.service?.name}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle size={14} color="#16A34A" />
              <Text style={[styles.statusText, { color: '#15803D', marginLeft: 4 }]}>
                Completed
              </Text>
            </View>
          </View>

          {item.completed_at && (
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>
                  Completed on {new Date(item.completed_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {!hasReview && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => handleOpenReviewModal(item)}
            >
              <Star size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.reviewButtonText}>Leave a Review</Text>
            </TouchableOpacity>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderEmptyServices = () => (
    <View style={styles.emptyContainer}>
      <Package size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>No Services Available</Text>
      <Text style={styles.emptyText}>
        Check back later for our professional printing services.
      </Text>
    </View>
  );

  const renderEmptyBookings = () => (
    <View style={styles.emptyContainer}>
      <AlertCircle size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>No Active Bookings</Text>
      <Text style={styles.emptyText}>
        {isAuthenticated
          ? 'You have no active service bookings. Browse our services to get started!'
          : 'Please log in to view your bookings.'}
      </Text>
      {!isAuthenticated && (
        <Button
          title="Log In"
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: spacing.md }}
        />
      )}
    </View>
  );

  const renderEmptyCompleted = () => (
    <View style={styles.emptyContainer}>
      <CheckCircle size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>No Completed Services</Text>
      <Text style={styles.emptyText}>
        Your completed service bookings will appear here.
      </Text>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'services':
        return servicesLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderServiceCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyServices}
            refreshControl={
              <RefreshControl
                refreshing={servicesRefetching}
                onRefresh={refetchServices}
                colors={[colors.primary.DEFAULT]}
                tintColor={colors.primary.DEFAULT}
              />
            }
          />
        );

      case 'bookings':
        return bookingsLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={activeBookings}
            renderItem={renderBookingCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyBookings}
            refreshControl={
              <RefreshControl
                refreshing={bookingsRefetching}
                onRefresh={refetchBookings}
                colors={[colors.primary.DEFAULT]}
                tintColor={colors.primary.DEFAULT}
              />
            }
          />
        );

      case 'completed':
        return bookingsLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={completedBookings}
            renderItem={renderCompletedCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyCompleted}
            refreshControl={
              <RefreshControl
                refreshing={bookingsRefetching}
                onRefresh={refetchBookings}
                colors={[colors.primary.DEFAULT]}
                tintColor={colors.primary.DEFAULT}
              />
            }
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <Text style={styles.headerSubtitle}>
          Professional sublimation and printing services
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
            {tab.key === 'bookings' && activeBookings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activeBookings.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leave a Review</Text>
            <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
              <X size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalServiceName}>{selectedBooking?.service?.name}</Text>

            {/* Star Rating */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Star
                      size={36}
                      color={star <= rating ? '#FBBF24' : colors.gray[300]}
                      fill={star <= rating ? '#FBBF24' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Review Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Summarize your experience"
                placeholderTextColor={colors.gray[400]}
                value={reviewTitle}
                onChangeText={setReviewTitle}
              />
            </View>

            {/* Review Content */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Review (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your experience..."
                placeholderTextColor={colors.gray[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={reviewContent}
                onChangeText={setReviewContent}
              />
            </View>

            <Button
              title="Submit Review"
              onPress={handleSubmitReview}
              loading={createReviewMutation.isPending}
              style={styles.submitButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
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
  tabBadge: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  tabBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  serviceCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  serviceImageContainer: {
    height: 140,
    backgroundColor: colors.gray[100],
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[200],
  },
  serviceContent: {
    padding: spacing.md,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestQuoteText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingNumber: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  bookingServiceName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  progressSection: {
    backgroundColor: colors.gray[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.gray[800],
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  reviewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 3,
    paddingHorizontal: spacing.lg,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalServiceName: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  ratingContainer: {
    marginBottom: spacing.xl,
  },
  ratingLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
