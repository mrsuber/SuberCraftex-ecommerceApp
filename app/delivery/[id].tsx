import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import {
  ChevronLeft,
  MapPin,
  Phone,
  Camera,
  PenTool,
  CheckCircle,
  Package,
  User,
  Truck,
  X,
} from 'lucide-react-native';
import { Badge, getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/Badge';
import SignatureCapture from '@/components/delivery/SignatureCapture';
import { apiClient } from '@/api/client';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/config/theme';

interface DeliveryDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippingAddress: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
  };
  customerName: string | null;
  customerPhone: string | null;
  items: Array<{
    id: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    price: number;
  }>;
  photoUrl: string | null;
  signatureUrl: string | null;
}

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch delivery details
  const { data: delivery, isLoading } = useQuery({
    queryKey: ['delivery-detail', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/drivers/orders/${id}`);
      return response.data.delivery as DeliveryDetail;
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({
      status,
      photoUrl,
      signatureUrl,
    }: {
      status: string;
      photoUrl?: string;
      signatureUrl?: string;
    }) => {
      const response = await apiClient.patch(`/api/drivers/orders/${id}/status`, {
        status,
        photoUrl,
        signatureUrl,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update delivery');
    },
  });

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProofPhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Media library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProofPhoto(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert('Add Photo', 'Choose how to add delivery proof photo', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignatureSave = (signatureBase64: string) => {
    setSignature(signatureBase64);
  };

  const uploadImage = async (uri: string, type: 'photo' | 'signature'): Promise<string> => {
    const formData = new FormData();
    let fileUri = uri;

    // Handle base64 signature - save to temp file first
    if (type === 'signature' && uri.startsWith('data:')) {
      // Extract base64 data (remove the data:image/png;base64, prefix)
      const base64Data = uri.split(',')[1];
      const tempFilename = `signature-${Date.now()}.png`;

      // Create a File in cache directory and write base64 data
      const tempFile = new File(Paths.cache, tempFilename);

      // Convert base64 to Uint8Array and write
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await tempFile.write(bytes);

      fileUri = tempFile.uri;
    }

    // Use file URI approach for both photos and signatures
    const filename = fileUri.split('/').pop() || `${type}-${Date.now()}.${type === 'signature' ? 'png' : 'jpg'}`;
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1]}` : (type === 'signature' ? 'image/png' : 'image/jpeg');

    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: fileType,
    } as any);

    formData.append('type', type);
    formData.append('deliveryId', id!);

    const response = await apiClient.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  };

  const handleCompleteDelivery = async () => {
    if (!proofPhoto || !signature) {
      Alert.alert(
        'Missing Information',
        'Please take a photo and get customer signature before completing delivery'
      );
      return;
    }

    Alert.alert(
      'Complete Delivery',
      'Are you sure you want to mark this delivery as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setIsUploading(true);

              // Upload photo and signature
              const [photoUrl, signatureUrl] = await Promise.all([
                uploadImage(proofPhoto, 'photo'),
                uploadImage(signature, 'signature'),
              ]);

              // Update delivery status
              await updateStatus.mutateAsync({
                status: 'delivered',
                photoUrl,
                signatureUrl,
              });

              Alert.alert('Success', 'Delivery completed successfully!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete delivery');
            } finally {
              setIsUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (newStatus: string) => {
    updateStatus.mutate({ status: newStatus });
  };

  const getNextStatus = (): { status: string; label: string } | null => {
    if (!delivery) return null;
    const flow: Record<string, { status: string; label: string }> = {
      assigned: { status: 'picked_up', label: 'Mark as Picked Up' },
      picked_up: { status: 'in_transit', label: 'Start Transit' },
      in_transit: { status: 'out_for_delivery', label: 'Out for Delivery' },
    };
    return flow[delivery.status] || null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Delivery not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const address = delivery.shippingAddress;
  const shortNum = delivery.orderNumber.split('-').pop();
  const nextAction = getNextStatus();
  const isOutForDelivery = delivery.status === 'out_for_delivery';
  const isDelivered = delivery.status === 'delivered';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery #{shortNum}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <Badge
            label={formatStatusLabel(delivery.status)}
            variant={getStatusBadgeVariant(delivery.status)}
            size="lg"
          />
          <Text style={styles.amountText}>{formatCurrency(delivery.totalAmount)}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>Customer Details</Text>
          </View>
          <Text style={styles.customerName}>
            {address?.fullName || delivery.customerName || 'Customer'}
          </Text>
          {(address?.phone || delivery.customerPhone) && (
            <TouchableOpacity style={styles.phoneRow}>
              <Phone size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.phoneText}>{address?.phone || delivery.customerPhone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          {address && (
            <Text style={styles.addressText}>
              {address.addressLine1}
              {address.addressLine2 ? `\n${address.addressLine2}` : ''}
              {`\n${address.city}, ${address.state}`}
            </Text>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>Items ({delivery.items.length})</Text>
          </View>
          {delivery.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              {item.productImage && (
                <Image
                  source={{ uri: item.productImage }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            </View>
          ))}
        </View>

        {/* Proof of Delivery Section - Only show when out for delivery */}
        {isOutForDelivery && (
          <View style={styles.proofSection}>
            <Text style={styles.sectionTitle}>Proof of Delivery</Text>
            <Text style={styles.sectionSubtitle}>
              Take a photo and get customer signature to complete delivery
            </Text>

            {/* Photo Capture */}
            <View style={styles.proofCard}>
              <View style={styles.proofHeader}>
                <Camera size={20} color={colors.gray[600]} />
                <Text style={styles.proofLabel}>Delivery Photo</Text>
                {proofPhoto && <CheckCircle size={20} color={colors.success} />}
              </View>
              {proofPhoto ? (
                <View style={styles.photoPreview}>
                  <Image
                    source={{ uri: proofPhoto }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setProofPhoto(null)}
                  >
                    <X size={16} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.captureButton} onPress={handlePhotoPress}>
                  <Camera size={32} color={colors.gray[400]} />
                  <Text style={styles.captureText}>Tap to add photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Signature Capture */}
            <View style={styles.proofCard}>
              <View style={styles.proofHeader}>
                <PenTool size={20} color={colors.gray[600]} />
                <Text style={styles.proofLabel}>Customer Signature</Text>
                {signature && <CheckCircle size={20} color={colors.success} />}
              </View>
              {signature ? (
                <View style={styles.signaturePreview}>
                  <Image
                    source={{ uri: signature }}
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setSignature(null)}
                  >
                    <X size={16} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => setShowSignature(true)}
                >
                  <PenTool size={32} color={colors.gray[400]} />
                  <Text style={styles.captureText}>Tap to capture signature</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Delivered Proof Display */}
        {isDelivered && (delivery.photoUrl || delivery.signatureUrl) && (
          <View style={styles.proofSection}>
            <Text style={styles.sectionTitle}>Delivery Proof</Text>
            {delivery.photoUrl && (
              <View style={styles.proofCard}>
                <View style={styles.proofHeader}>
                  <Camera size={20} color={colors.success} />
                  <Text style={styles.proofLabel}>Delivery Photo</Text>
                </View>
                <Image
                  source={{ uri: delivery.photoUrl }}
                  style={styles.deliveredImage}
                  resizeMode="cover"
                />
              </View>
            )}
            {delivery.signatureUrl && (
              <View style={styles.proofCard}>
                <View style={styles.proofHeader}>
                  <PenTool size={20} color={colors.success} />
                  <Text style={styles.proofLabel}>Customer Signature</Text>
                </View>
                <Image
                  source={{ uri: delivery.signatureUrl }}
                  style={styles.deliveredSignature}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      {!isDelivered && (
        <View style={styles.bottomActions}>
          {isOutForDelivery ? (
            <TouchableOpacity
              style={[
                styles.completeButton,
                (!proofPhoto || !signature) && styles.disabledButton,
              ]}
              onPress={handleCompleteDelivery}
              disabled={!proofPhoto || !signature || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <CheckCircle size={22} color={colors.white} />
                  <Text style={styles.completeButtonText}>Complete Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          ) : nextAction ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpdateStatus(nextAction.status)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Truck size={22} color={colors.white} />
                  <Text style={styles.actionButtonText}>{nextAction.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Signature Modal */}
      <SignatureCapture
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onSave={handleSignatureSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  errorLink: {
    fontSize: fontSize.base,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  amountText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phoneText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: 2,
  },
  itemQty: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  proofSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  proofCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  proofLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  captureButton: {
    height: 150,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  captureText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  signaturePreview: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  signatureImage: {
    width: '100%',
    height: 150,
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: spacing.xs,
  },
  deliveredImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  deliveredSignature: {
    width: '100%',
    height: 120,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  bottomActions: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.info,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  completeButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  disabledButton: {
    backgroundColor: colors.gray[300],
  },
});
