import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, User, CreditCard, Check } from 'lucide-react-native';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { apiClient, uploadFile } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

type DocumentType = 'id_front' | 'id_back' | 'selfie';

export default function KycVerifyScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
        'Your verification documents have been submitted. We will review them and notify you once approved.',
        [{ text: 'OK', onPress: () => router.push('/(investor)/agreement') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit KYC documents. Please try again.'
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
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => pickImage(type)}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
    color: colors.error,
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
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
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
