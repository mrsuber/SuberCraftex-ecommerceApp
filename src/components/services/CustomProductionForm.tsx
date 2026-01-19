import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Package, Image as ImageIcon, FileText, Info, Link, Plus, X, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import { MaterialGrid, MaterialQuantitySelector } from './MaterialGrid';
import { servicesApi } from '@/api/services';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Service, Material } from '@/types';

interface CustomProductionFormProps {
  service: Service;
  onSubmit: (data: CustomProductionData) => void;
  isSubmitting?: boolean;
}

interface MaterialRequest {
  description: string;
  referenceUrl?: string;
  referencePhotos: string[];
}

export interface CustomProductionData {
  desiredProductPhotos: string[];
  customizationNotes: string;
  selectedMaterials: Array<{ materialId: string; quantity: number }>;
  materialRequests: MaterialRequest[];
}

interface SelectedMaterial {
  material: Material;
  quantity: number;
}

export function CustomProductionForm({
  service,
  onSubmit,
  isSubmitting = false,
}: CustomProductionFormProps) {
  // Materials from catalog
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);

  // Custom material request form
  const [materialRequestDescription, setMaterialRequestDescription] = useState('');
  const [materialRequestUrl, setMaterialRequestUrl] = useState('');
  const [materialRequestPhotos, setMaterialRequestPhotos] = useState<string[]>([]);

  // List of added material requests
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);

  // Product details
  const [desiredProductPhotos, setDesiredProductPhotos] = useState<string[]>([]);
  const [customizationNotes, setCustomizationNotes] = useState('');

  // Fetch materials for this service
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const serviceMaterials = await servicesApi.getMaterials(service.id);
        setMaterials(serviceMaterials);
      } catch (error) {
        console.error('Error fetching materials:', error);
        setMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [service.id]);

  const handleSelectMaterial = (material: Material) => {
    const existingIndex = selectedMaterials.findIndex(
      (sm) => sm.material.id === material.id
    );

    if (existingIndex >= 0) {
      setSelectedMaterials((prev) =>
        prev.filter((sm) => sm.material.id !== material.id)
      );
    } else {
      setSelectedMaterials((prev) => [...prev, { material, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (materialId: string, quantity: number) => {
    setSelectedMaterials((prev) =>
      prev.map((sm) =>
        sm.material.id === materialId ? { ...sm, quantity } : sm
      )
    );
  };

  const handleRemoveMaterial = (materialId: string) => {
    setSelectedMaterials((prev) =>
      prev.filter((sm) => sm.material.id !== materialId)
    );
  };

  const handleAddMaterialRequest = () => {
    if (!materialRequestDescription.trim()) {
      Alert.alert('Required', 'Please provide a description for the material');
      return;
    }

    setMaterialRequests((prev) => [
      ...prev,
      {
        description: materialRequestDescription.trim(),
        referenceUrl: materialRequestUrl.trim() || undefined,
        referencePhotos: materialRequestPhotos,
      },
    ]);

    // Clear the form
    setMaterialRequestDescription('');
    setMaterialRequestUrl('');
    setMaterialRequestPhotos([]);
  };

  const handleRemoveMaterialRequest = (index: number) => {
    setMaterialRequests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Validate: must have at least one material (selected or requested)
    if (selectedMaterials.length === 0 && materialRequests.length === 0) {
      Alert.alert('Materials Required', 'Please select at least one material or add a material request');
      return;
    }

    if (desiredProductPhotos.length === 0) {
      Alert.alert('Photos Required', 'Please upload at least one reference photo');
      return;
    }

    if (!customizationNotes.trim()) {
      Alert.alert('Details Required', 'Please provide customization details');
      return;
    }

    onSubmit({
      desiredProductPhotos,
      customizationNotes,
      selectedMaterials: selectedMaterials.map((sm) => ({
        materialId: sm.material.id,
        quantity: sm.quantity,
      })),
      materialRequests,
    });
  };

  const isFormValid =
    (selectedMaterials.length > 0 || materialRequests.length > 0) &&
    desiredProductPhotos.length > 0 &&
    customizationNotes.trim().length > 0;

  const hasMaterialRequestInput = materialRequestDescription.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <Info size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Select materials from our catalog or request custom materials. Upload reference photos and we'll provide a custom quote.
        </Text>
      </View>

      {/* Material Selection from Catalog */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Package size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Select Materials</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Choose from our available materials or request custom materials below
        </Text>

        {loadingMaterials ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Loading materials...</Text>
          </View>
        ) : (
          <MaterialGrid
            materials={materials}
            selectedMaterialIds={selectedMaterials.map((sm) => sm.material.id)}
            onSelectMaterial={handleSelectMaterial}
          />
        )}
      </View>

      {/* Selected Materials Quantities */}
      {selectedMaterials.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Quantities</Text>
          {selectedMaterials.map((sm) => (
            <MaterialQuantitySelector
              key={sm.material.id}
              material={sm.material}
              quantity={sm.quantity}
              onQuantityChange={(qty) => handleQuantityChange(sm.material.id, qty)}
              onRemove={() => handleRemoveMaterial(sm.material.id)}
            />
          ))}
        </View>
      )}

      {/* Request Custom Material */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Plus size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Request Custom Material</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Can't find what you need? Tell us about it and we'll source it for you
        </Text>

        <View style={styles.requestForm}>
          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Material Description *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe the material you need (e.g., 'Oak wood planks, 2 inches thick')"
              placeholderTextColor={colors.gray[400]}
              multiline
              numberOfLines={3}
              value={materialRequestDescription}
              onChangeText={setMaterialRequestDescription}
              textAlignVertical="top"
            />
          </View>

          {/* Reference URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reference Link (Optional)</Text>
            <View style={styles.urlInputContainer}>
              <Link size={18} color={colors.gray[400]} />
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/product"
                placeholderTextColor={colors.gray[400]}
                value={materialRequestUrl}
                onChangeText={setMaterialRequestUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Reference Photos */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reference Photos (Optional)</Text>
            <PhotoUpload
              photos={materialRequestPhotos}
              onPhotosChange={setMaterialRequestPhotos}
              maxPhotos={3}
            />
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              !hasMaterialRequestInput && styles.addButtonDisabled,
            ]}
            onPress={handleAddMaterialRequest}
            disabled={!hasMaterialRequestInput}
          >
            <Plus size={18} color={hasMaterialRequestInput ? colors.primary[500] : colors.gray[400]} />
            <Text
              style={[
                styles.addButtonText,
                !hasMaterialRequestInput && styles.addButtonTextDisabled,
              ]}
            >
              Add Material Request
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of Added Material Requests */}
        {materialRequests.length > 0 && (
          <View style={styles.requestsList}>
            <Text style={styles.requestsListTitle}>
              Requested Materials ({materialRequests.length})
            </Text>
            {materialRequests.map((req, index) => (
              <View key={index} style={styles.requestItem}>
                <View style={styles.requestItemContent}>
                  <Text style={styles.requestItemDescription}>{req.description}</Text>
                  {req.referenceUrl && (
                    <Text style={styles.requestItemUrl} numberOfLines={1}>
                      {req.referenceUrl}
                    </Text>
                  )}
                  {req.referencePhotos.length > 0 && (
                    <Text style={styles.requestItemPhotos}>
                      {req.referencePhotos.length} photo(s) attached
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMaterialRequest(index)}
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Desired Product Photos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ImageIcon size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Reference Photos *</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Upload photos or sketches of what you want us to create
        </Text>
        <PhotoUpload
          photos={desiredProductPhotos}
          onPhotosChange={setDesiredProductPhotos}
          maxPhotos={5}
        />
      </View>

      {/* Customization Notes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileText size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Customization Details *</Text>
        </View>
        <TextInput
          style={styles.textArea}
          placeholder="Provide detailed specifications: dimensions, colors, finishes, special features, etc..."
          placeholderTextColor={colors.gray[400]}
          multiline
          numberOfLines={6}
          value={customizationNotes}
          onChangeText={setCustomizationNotes}
          textAlignVertical="top"
        />
      </View>

      {/* Pricing Note */}
      <View style={styles.pricingNote}>
        <Text style={styles.pricingTitle}>How it works</Text>
        <Text style={styles.pricingText}>
          1. Select or request materials{'\n'}
          2. Upload reference photos and describe your requirements{'\n'}
          3. We'll review and create a detailed quote{'\n'}
          4. Approve the quote to begin production
        </Text>
      </View>

      {/* Submit Button */}
      <Button
        title={isSubmitting ? 'Submitting...' : 'Submit for Quote'}
        onPress={handleSubmit}
        disabled={!isFormValid || isSubmitting}
        loading={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  // Request form styles
  requestForm: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray[900],
    backgroundColor: colors.white,
    minHeight: 80,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
  },
  urlInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray[900],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    borderColor: colors.gray[300],
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary[500],
  },
  addButtonTextDisabled: {
    color: colors.gray[400],
  },
  // Requests list styles
  requestsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  requestsListTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  requestItemContent: {
    flex: 1,
  },
  requestItemDescription: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  requestItemUrl: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  requestItemPhotos: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
  // Other styles
  textArea: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    minHeight: 120,
    backgroundColor: colors.white,
  },
  pricingNote: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pricingTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  pricingText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 22,
  },
});
