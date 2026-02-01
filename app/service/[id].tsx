import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui';
import { servicesApi } from '@/api/services';
import { useAuthStore } from '@/stores/auth-store';
import {
  ServiceTypeSelector,
  OnsiteBookingForm,
  CustomProductionForm,
  CollectRepairForm,
} from '@/components/services';
import type { OnsiteBookingData } from '@/components/services/OnsiteBookingForm';
import type { CustomProductionData } from '@/components/services/CustomProductionForm';
import type { CollectRepairData } from '@/components/services/CollectRepairForm';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ServiceType } from '@/types';

const { width } = Dimensions.get('window');

const DURATION_LABELS: Record<string, string> = {
  half_hour: '30 minutes',
  one_hour: '1 hour',
  two_hours: '2 hours',
  half_day: '4 hours',
  full_day: '8 hours',
  custom: 'Custom duration',
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingCreated, setBookingCreated] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service', id],
    queryFn: () => servicesApi.getById(id!),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: servicesApi.createBooking,
    onSuccess: (booking) => {
      setBookingCreated(true);
      setCreatedBookingId(booking.id);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/(tabs)/services');
      }, 2000);
    },
    onError: (error: any) => {
      Alert.alert(
        'Booking Failed',
        error.response?.data?.error || 'Failed to create booking. Please try again.'
      );
    },
  });

  const checkAuth = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to book a service.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return false;
    }
    return true;
  };

  const handleOnsiteSubmit = (data: OnsiteBookingData) => {
    if (!checkAuth()) return;

    bookMutation.mutate({
      serviceId: id!,
      serviceType: 'onsite',
      customerName: user?.full_name || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || undefined,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      customerNotes: data.notes,
      requirementPhotos: data.requirementPhotos,
      designSelections: data.designSelections,
    });
  };

  const handleCustomProductionSubmit = async (data: CustomProductionData) => {
    if (!checkAuth()) return;

    setIsSubmittingCustom(true);

    try {
      console.log('Creating custom production booking...', {
        serviceId: id,
        customerName: user?.full_name,
        customerEmail: user?.email,
        materialsCount: data.selectedMaterials?.length || 0,
        requestsCount: data.materialRequests?.length || 0,
        photosCount: data.desiredProductPhotos?.length || 0,
      });

      // Create the booking first
      const booking = await servicesApi.createBooking({
        serviceId: id!,
        serviceType: 'custom_production',
        customerName: user?.full_name || '',
        customerEmail: user?.email || '',
        customerPhone: user?.phone || undefined,
        desiredOutcome: data.customizationNotes,
        requirementPhotos: data.desiredProductPhotos,
        materials: data.selectedMaterials,
        designSelections: data.designSelections,
      });

      console.log('Booking created:', booking.id);

      // Create material requests if any
      if (data.materialRequests && data.materialRequests.length > 0) {
        console.log('Creating material requests...');
        for (const request of data.materialRequests) {
          await servicesApi.createMaterialRequest(booking.id, request);
        }
        console.log('Material requests created');
      }

      setBookingCreated(true);
      setCreatedBookingId(booking.id);

      setTimeout(() => {
        router.push('/(tabs)/services');
      }, 2000);
    } catch (error: any) {
      console.error('Booking failed:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert(
        'Booking Failed',
        error.response?.data?.error || error.message || 'Failed to create booking. Please try again.'
      );
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleCollectRepairSubmit = (data: CollectRepairData) => {
    if (!checkAuth()) return;

    bookMutation.mutate({
      serviceId: id!,
      serviceType: 'collect_repair',
      customerName: user?.full_name || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || undefined,
      desiredOutcome: data.desiredOutcome,
      requirementPhotos: data.itemPhotos,
      collectionMethod: data.collectionMethod,
      customerNotes: data.additionalNotes,
      designSelections: data.designSelections,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Service not found</Text>
      </View>
    );
  }

  // Success State
  if (bookingCreated) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: '',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.replace('/(tabs)/services')}
                style={{ padding: 8, marginLeft: -8 }}
              >
                <ArrowLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <SafeAreaView style={styles.successContainer}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color="#16A34A" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successText}>
              Your booking request has been submitted. We'll review your requirements and send you a quote shortly.
            </Text>
            <ActivityIndicator
              size="small"
              color={colors.primary.DEFAULT}
              style={{ marginTop: spacing.lg }}
            />
            <Text style={styles.redirectText}>Redirecting to your bookings...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const images = service.images?.length ? service.images : [service.featured_image].filter(Boolean);
  const durationLabel = service.duration === 'custom' && service.custom_duration
    ? `${service.custom_duration} minutes`
    : DURATION_LABELS[service.duration] || 'Custom';

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image Gallery */}
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
            >
              {images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image || undefined }}
                  style={styles.serviceImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.imagePagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Service Info */}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>

            {/* Duration */}
            <View style={styles.infoRow}>
              <Clock size={18} color={colors.gray[500]} />
              <Text style={styles.infoText}>Estimated duration: {durationLabel}</Text>
            </View>

            {/* Pricing Note */}
            <View style={styles.pricingBadge}>
              <Text style={styles.pricingBadgeText}>Request Quote</Text>
              <Text style={styles.pricingSubtext}>Pricing discussed per request</Text>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About this Service</Text>
              <Text style={styles.description}>
                {service.description || 'No description available.'}
              </Text>
            </View>

            {/* Service Type Selection */}
            <ServiceTypeSelector
              service={service}
              selectedType={selectedType}
              onSelectType={setSelectedType}
            />

            {/* Booking Forms */}
            {selectedType === 'onsite' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Book On-Site Service</Text>
                <OnsiteBookingForm
                  service={service}
                  onSubmit={handleOnsiteSubmit}
                  isSubmitting={bookMutation.isPending}
                />
              </View>
            )}

            {selectedType === 'custom_production' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Custom Production Request</Text>
                <CustomProductionForm
                  service={service}
                  onSubmit={handleCustomProductionSubmit}
                  isSubmitting={isSubmittingCustom}
                />
              </View>
            )}

            {selectedType === 'collect_repair' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Collect & Repair Request</Text>
                <CollectRepairForm
                  service={service}
                  onSubmit={handleCollectRepairSubmit}
                  isSubmitting={bookMutation.isPending}
                />
              </View>
            )}

            {/* How Pricing Works - Only show if no type selected */}
            {!selectedType && (
              <Card style={styles.pricingNote} variant="outlined">
                <CardContent>
                  <Text style={styles.pricingNoteTitle}>How Pricing Works</Text>
                  <Text style={styles.pricingNoteText}>
                    After you submit your request, we'll review your requirements and send you a
                    detailed quote. You can approve or request changes before any work begins.
                  </Text>
                </CardContent>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  successContainer: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#166534',
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: fontSize.base,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 24,
  },
  redirectText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  imageContainer: {
    position: 'relative',
  },
  serviceImage: {
    width,
    height: width * 0.6,
    backgroundColor: colors.gray[100],
  },
  imagePagination: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    opacity: 0.5,
  },
  paginationDotActive: {
    opacity: 1,
    backgroundColor: colors.primary.DEFAULT,
  },
  serviceInfo: {
    padding: spacing.lg,
  },
  serviceName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  pricingBadge: {
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  pricingBadgeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  pricingSubtext: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    lineHeight: 24,
  },
  formSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  pricingNote: {
    backgroundColor: colors.gray[50],
    marginTop: spacing.lg,
  },
  pricingNoteTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  pricingNoteText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
});
