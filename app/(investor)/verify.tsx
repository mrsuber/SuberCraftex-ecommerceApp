import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, User, CreditCard, Check, Clock, XCircle, CheckCircle } from 'lucide-react-native';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { apiClient, uploadFile } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

type DocumentType = 'id_front' | 'id_back' | 'selfie';

type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

interface KycStatusData {
  kycStatus: KycStatus;
  kycSubmittedAt: string | null;
  kycRejectionReason: string | null;
  isVerified: boolean;
  agreementAccepted?: boolean;
}

export default function KycVerifyScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [kycStatusData, setKycStatusData] = useState<KycStatusData | null>(null);
  const [idType, setIdType] = useState<string>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [documents, setDocuments] = useState<Record<DocumentType, string | null>>({
    id_front: null,
    id_back: null,
    selfie: null,
  });

  const ID_TYPES = [
    { value: 'national_id', label: 'National ID Card' },
    { value: 'passport', label: 'International Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'voters_card', label: "Voter's Card" },
  ];

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.investor.kyc);
      setKycStatusData(response.data);
    } catch (error: any) {
      // If 404 or error, assume not started
      setKycStatusData({
        kycStatus: 'not_started',
        kycSubmittedAt: null,
        kycRejectionReason: null,
        isVerified: false,
      });
    } finally {
      setIsFetchingStatus(false);
    }
  };

  const pickImage = async (type: DocumentType, useCamera: boolean = false) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          `Please grant ${useCamera ? 'camera' : 'gallery'} access to upload documents.`
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: type === 'selfie' ? [1, 1] : [4, 3],
            quality: 0.8,
            cameraType: type === 'selfie'
              ? ImagePicker.CameraType.front
              : ImagePicker.CameraType.back,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'selfie' ? [1, 1] : [4, 3],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setDocuments((prev) => ({
          ...prev,
          [type]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!idNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your ID number.');
      return;
    }

    if (!documents.id_front) {
      Alert.alert('Missing Document', 'Please upload the front of your ID.');
      return;
    }

    if (!documents.selfie) {
      Alert.alert('Missing Document', 'Please take a selfie for verification.');
      return;
    }

    setIsLoading(true);
    try {
      // Upload documents - must be sequential to maintain order
      const uploadResults: { url: string }[] = [];

      for (const [key, uri] of Object.entries(documents)) {
        if (uri) {
          const formData = new FormData();
          formData.append('file', {
            uri,
            type: 'image/jpeg',
            name: `${key}.jpg`,
          } as any);
          // Include the document type so the API knows which field to update
          formData.append('type', key);

          const result = await uploadFile(API_ENDPOINTS.investor.kycUpload, formData);
          uploadResults.push(result);
        }
      }

      // Submit KYC data
      await apiClient.post(API_ENDPOINTS.investor.kyc, {
        idType,
        idNumber,
        idDocumentUrl: uploadResults[0]?.url,
        idDocumentBackUrl: documents.id_back ? uploadResults[1]?.url : null,
        selfieUrl: documents.selfie
          ? uploadResults[documents.id_back ? 2 : 1]?.url
          : null,
      });

      Alert.alert(
        'KYC Submitted',
        'Your verification documents have been submitted. Please proceed to accept the investment agreement.',
        [{ text: 'Continue', onPress: () => router.push('/(investor)/agreement') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error.response?.data?.error || error.message || 'Failed to submit KYC documents. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderDocumentUpload = (
    type: DocumentType,
    title: string,
    icon: React.ReactNode,
    required: boolean = true
  ) => (
    <View style={styles.uploadSection}>
      <View style={styles.uploadHeader}>
        <Text style={styles.uploadTitle}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      {documents[type] ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: documents[type]! }} style={styles.preview} />
          <View style={styles.previewOverlay}>
            <Check size={24} color={colors.white} />
          </View>
          <View style={styles.changeActions}>
            <TouchableOpacity
              style={styles.changeActionButton}
              onPress={() => pickImage(type, true)}
            >
              <Camera size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.changeButtonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.changeActionButton}
              onPress={() => pickImage(type, false)}
            >
              <Upload size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.changeButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.uploadActions}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage(type, true)}
          >
            <Camera size={24} color={colors.primary.DEFAULT} />
            <Text style={styles.uploadButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage(type, false)}
          >
            <Upload size={24} color={colors.primary.DEFAULT} />
            <Text style={styles.uploadButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Show loading while fetching status
  if (isFetchingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show status screen if KYC is already submitted (pending or approved)
  if (kycStatusData?.kycStatus === 'pending' || kycStatusData?.kycStatus === 'approved') {
    const isPending = kycStatusData.kycStatus === 'pending';

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIconContainer, isPending ? styles.statusPending : styles.statusApproved]}>
            {isPending ? (
              <Clock size={48} color={colors.warning.DEFAULT} />
            ) : (
              <CheckCircle size={48} color={colors.success.DEFAULT} />
            )}
          </View>

          <Text style={styles.statusTitle}>
            {isPending ? 'KYC Under Review' : 'KYC Approved'}
          </Text>

          <Text style={styles.statusDescription}>
            {isPending
              ? 'Your identity verification documents have been submitted and are currently under review. This usually takes 24-48 hours.'
              : 'Your identity has been verified successfully. You can now proceed to accept the investment agreement.'}
          </Text>

          {kycStatusData.kycSubmittedAt && (
            <Text style={styles.statusDate}>
              Submitted: {new Date(kycStatusData.kycSubmittedAt).toLocaleDateString()}
            </Text>
          )}

          <View style={styles.statusActions}>
            <Button
              title="Continue to Agreement"
              onPress={() => router.push('/(investor)/agreement')}
              fullWidth
              size="lg"
            />

            <Button
              title="Go to Dashboard"
              variant="outline"
              onPress={() => router.replace('/(investor)/dashboard')}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show rejection status with option to resubmit
  if (kycStatusData?.kycStatus === 'rejected') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.rejectionContainer}>
            <View style={[styles.statusIconContainer, styles.statusRejected]}>
              <XCircle size={48} color={colors.error.DEFAULT} />
            </View>

            <Text style={styles.statusTitle}>KYC Verification Rejected</Text>

            <Text style={styles.statusDescription}>
              Unfortunately, your identity verification was not approved. Please review the reason below and submit again.
            </Text>

            {kycStatusData.kycRejectionReason && (
              <View style={styles.rejectionReasonBox}>
                <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                <Text style={styles.rejectionReasonText}>
                  {kycStatusData.kycRejectionReason}
                </Text>
              </View>
            )}
          </View>

          {/* Show the form again for resubmission */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resubmit Documents</Text>
            <View style={styles.idTypeGrid}>
              {ID_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.idTypeButton,
                    idType === type.value && styles.idTypeButtonSelected,
                  ]}
                  onPress={() => setIdType(type.value)}
                >
                  <CreditCard
                    size={20}
                    color={
                      idType === type.value
                        ? colors.primary.DEFAULT
                        : colors.gray[500]
                    }
                  />
                  <Text
                    style={[
                      styles.idTypeLabel,
                      idType === type.value && styles.idTypeLabelSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Input
              label="ID Number"
              placeholder="Enter your ID number"
              value={idNumber}
              onChangeText={setIdNumber}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Documents</Text>
            {renderDocumentUpload('id_front', 'Front of ID', <CreditCard size={20} color={colors.gray[500]} />)}
            {renderDocumentUpload('id_back', 'Back of ID', <CreditCard size={20} color={colors.gray[500]} />, false)}
            {renderDocumentUpload('selfie', 'Selfie with ID', <User size={20} color={colors.gray[500]} />)}
            <Text style={styles.selfieHint}>
              Hold your ID next to your face and take a clear selfie. Make sure both your face and the ID are visible.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

        <View style={styles.bottomAction}>
          <Button
            title="Resubmit for Verification"
            onPress={handleSubmit}
            loading={isLoading}
            fullWidth
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Default: Show KYC form for first-time submission
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Identity Verification</Text>
          <Text style={styles.instructionsText}>
            To comply with regulations and protect your investments, we need to
            verify your identity. Please provide clear photos of your ID and a
            selfie.
          </Text>
        </View>

        {/* ID Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ID Document Type</Text>
          <View style={styles.idTypeGrid}>
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.idTypeButton,
                  idType === type.value && styles.idTypeButtonSelected,
                ]}
                onPress={() => setIdType(type.value)}
              >
                <CreditCard
                  size={20}
                  color={
                    idType === type.value
                      ? colors.primary.DEFAULT
                      : colors.gray[500]
                  }
                />
                <Text
                  style={[
                    styles.idTypeLabel,
                    idType === type.value && styles.idTypeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ID Number */}
        <View style={styles.section}>
          <Input
            label="ID Number"
            placeholder="Enter your ID number"
            value={idNumber}
            onChangeText={setIdNumber}
          />
        </View>

        {/* Document Uploads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Documents</Text>

          {renderDocumentUpload(
            'id_front',
            'Front of ID',
            <CreditCard size={20} color={colors.gray[500]} />
          )}

          {renderDocumentUpload(
            'id_back',
            'Back of ID',
            <CreditCard size={20} color={colors.gray[500]} />,
            false
          )}

          {renderDocumentUpload(
            'selfie',
            'Selfie with ID',
            <User size={20} color={colors.gray[500]} />
          )}

          <Text style={styles.selfieHint}>
            Hold your ID next to your face and take a clear selfie. Make sure
            both your face and the ID are visible.
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={styles.bottomAction}>
        <Button
          title="Submit for Verification"
          onPress={handleSubmit}
          loading={isLoading}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusPending: {
    backgroundColor: colors.warning[50],
  },
  statusApproved: {
    backgroundColor: colors.success[50],
  },
  statusRejected: {
    backgroundColor: colors.error[50],
  },
  statusTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  statusDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xl,
  },
  statusActions: {
    width: '100%',
    marginTop: spacing.lg,
  },
  rejectionContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  rejectionReasonBox: {
    width: '100%',
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  rejectionReasonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error.DEFAULT,
    marginBottom: spacing.xs,
  },
  rejectionReasonText: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  instructionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  idTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  idTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  idTypeButtonSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  idTypeLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  idTypeLabelSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  uploadSection: {
    marginBottom: spacing.lg,
  },
  uploadHeader: {
    marginBottom: spacing.sm,
  },
  uploadTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  required: {
    color: colors.error.DEFAULT,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  uploadButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  previewContainer: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 200,
    backgroundColor: colors.gray[100],
  },
  previewOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeActions: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  changeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  changeButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  selfieHint: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
