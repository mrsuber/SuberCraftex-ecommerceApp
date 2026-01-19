import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  ShoppingBag,
  Package,
  Cog,
  AlertCircle,
  CheckCircle2,
  Truck,
  Camera,
  Info,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, Button, Badge } from '@/components/ui';
import { PhotoUpload } from '@/components/services/PhotoUpload';
import { tailorApi } from '@/api/tailor';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { ProgressStatus } from '@/types';

interface StatusOption {
  value: ProgressStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'material_ordered',
    label: 'Material Ordered',
    description: 'Materials have been ordered for this project',
    icon: ShoppingBag,
    color: colors.info,
  },
  {
    value: 'material_received',
    label: 'Material Received',
    description: 'All materials have been received and ready',
    icon: Package,
    color: colors.info,
  },
  {
    value: 'in_production',
    label: 'In Production',
    description: 'Work has started on the garment',
    icon: Cog,
    color: colors.warning,
  },
  {
    value: 'quality_check',
    label: 'Quality Check',
    description: 'Garment is being inspected for quality',
    icon: AlertCircle,
    color: colors.primary.DEFAULT,
  },
  {
    value: 'ready_for_collection',
    label: 'Ready for Collection',
    description: 'Garment is complete and ready to be collected',
    icon: Truck,
    color: colors.success,
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Work is fully completed and delivered',
    icon: CheckCircle2,
    color: colors.success,
  },
];

export default function AddProgressScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState<ProgressStatus | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Fetch booking to show context
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['tailor', 'booking', bookingId],
    queryFn: () => tailorApi.getBookingById(bookingId!),
    enabled: !!bookingId,
  });

  // Add progress mutation
  const addProgressMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStatus || !description.trim()) {
        throw new Error('Please fill in all required fields');
      }
      return tailorApi.addProgressUpdate(bookingId!, {
        status: selectedStatus,
        description: description.trim(),
        photos,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['tailor', 'booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['tailor', 'bookings'] });

      Alert.alert('Success', 'Progress update added successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to add progress update');
    },
  });

  const handleSubmit = () => {
    if (!selectedStatus) {
      Alert.alert('Required', 'Please select a status');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description');
      return;
    }

    addProgressMutation.mutate();
  };

  if (isLoadingBooking) {
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
          headerTitle: booking ? `Progress - #${booking.booking_number}` : 'Add Progress',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Booking Info */}
            {booking && (
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingNumber}>#{booking.booking_number}</Text>
                <Text style={styles.customerName}>{booking.customer_name}</Text>
                <Text style={styles.serviceName}>{booking.service?.name}</Text>
              </View>
            )}

            {/* Info Alert */}
            <View style={styles.infoAlert}>
              <Info size={18} color={colors.info} />
              <Text style={styles.infoText}>
                Add progress updates to keep the customer informed about their order. Photos help
                show the quality of your work.
              </Text>
            </View>

            {/* Status Selection */}
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Select Status *" />
              <CardContent>
                <View style={styles.statusGrid}>
                  {STATUS_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = selectedStatus === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.statusOption,
                          isSelected && styles.statusOptionSelected,
                          isSelected && { borderColor: option.color },
                        ]}
                        onPress={() => setSelectedStatus(option.value)}
                      >
                        <View
                          style={[
                            styles.statusIcon,
                            { backgroundColor: option.color + '20' },
                            isSelected && { backgroundColor: option.color + '30' },
                          ]}
                        >
                          <IconComponent size={20} color={option.color} />
                        </View>
                        <View style={styles.statusText}>
                          <Text
                            style={[
                              styles.statusLabel,
                              isSelected && { color: option.color },
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text style={styles.statusDescription} numberOfLines={2}>
                            {option.description}
                          </Text>
                        </View>
                        {isSelected && (
                          <CheckCircle2 size={20} color={option.color} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </CardContent>
            </Card>

            {/* Description */}
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Description *" />
              <CardContent>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe the progress made on this booking..."
                  placeholderTextColor={colors.gray[400]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length} / 500</Text>
              </CardContent>
            </Card>

            {/* Photos */}
            <Card style={styles.section} variant="outlined">
              <CardHeader
                title="Progress Photos"
                subtitle="Add photos to show the work progress"
              />
              <CardContent>
                <PhotoUpload
                  photos={photos}
                  onPhotosChange={setPhotos}
                  maxPhotos={8}
                />
              </CardContent>
            </Card>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Tips for Good Progress Updates</Text>
              <View style={styles.tipItem}>
                <Camera size={14} color={colors.gray[500]} />
                <Text style={styles.tipText}>
                  Take clear, well-lit photos of the garment
                </Text>
              </View>
              <View style={styles.tipItem}>
                <CheckCircle2 size={14} color={colors.gray[500]} />
                <Text style={styles.tipText}>
                  Show specific details and craftsmanship
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Info size={14} color={colors.gray[500]} />
                <Text style={styles.tipText}>
                  Be specific about what work has been done
                </Text>
              </View>
            </View>

            <View style={{ height: spacing.xl * 2 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.bottomActions}>
            <Button
              title={addProgressMutation.isPending ? 'Submitting...' : 'Submit Progress Update'}
              onPress={handleSubmit}
              loading={addProgressMutation.isPending}
              disabled={!selectedStatus || !description.trim() || addProgressMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
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
  scrollContent: {
    padding: spacing.lg,
  },
  bookingInfo: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  bookingNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  statusGrid: {
    gap: spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  statusOptionSelected: {
    backgroundColor: colors.gray[50],
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  statusDescription: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  textInput: {
    minHeight: 120,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  tipsSection: {
    padding: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  bottomActions: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
