import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Camera, FileText, Truck, Store, Info, Check } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import { DesignOptionsPicker } from './DesignOptionsPicker';
import { DesignSelection } from '@/api/services';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Service, CollectionMethod } from '@/types';

interface CollectRepairFormProps {
  service: Service;
  onSubmit: (data: CollectRepairData) => void;
  isSubmitting?: boolean;
}

export interface CollectRepairData {
  itemPhotos: string[];
  desiredOutcome: string;
  collectionMethod: CollectionMethod;
  additionalNotes: string;
  designSelections: DesignSelection[];
}

export function CollectRepairForm({
  service,
  onSubmit,
  isSubmitting = false,
}: CollectRepairFormProps) {
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [designSelections, setDesignSelections] = useState<DesignSelection[]>([]);

  const handleSubmit = () => {
    if (itemPhotos.length === 0) {
      return;
    }

    if (!desiredOutcome.trim()) {
      return;
    }

    if (!collectionMethod) {
      return;
    }

    onSubmit({
      itemPhotos,
      desiredOutcome,
      collectionMethod,
      additionalNotes,
      designSelections,
    });
  };

  const isFormValid = itemPhotos.length > 0 && desiredOutcome.trim() && collectionMethod;

  return (
    <View style={styles.container}>
      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <Info size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Upload photos of your item and tell us what you'd like done. We'll review it and provide a quote for the repair or renewal work.
        </Text>
      </View>

      {/* Design Options Picker */}
      <DesignOptionsPicker
        serviceId={service.id}
        value={designSelections}
        onChange={setDesignSelections}
      />

      {/* Item Photos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Camera size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Item Photos *</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Upload clear photos showing the item's current condition and any areas needing work
        </Text>
        <PhotoUpload
          photos={itemPhotos}
          onPhotosChange={setItemPhotos}
          maxPhotos={8}
        />
        <Text style={styles.tipText}>
          💡 Tip: Include photos from different angles and close-ups of damaged or worn areas
        </Text>
      </View>

      {/* Desired Outcome */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileText size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Desired Outcome *</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Describe what you want us to repair, renew, or improve
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="For example: 'Fix broken leg, restore original finish, repair torn upholstery...'"
          placeholderTextColor={colors.gray[400]}
          multiline
          numberOfLines={5}
          value={desiredOutcome}
          onChangeText={setDesiredOutcome}
          textAlignVertical="top"
        />
        <View style={styles.helpList}>
          <Text style={styles.helpTitle}>Consider including:</Text>
          <Text style={styles.helpItem}>• Specific repairs needed</Text>
          <Text style={styles.helpItem}>• Preferred materials or finishes</Text>
          <Text style={styles.helpItem}>• Any color or style preferences</Text>
          <Text style={styles.helpItem}>• Timeline requirements</Text>
        </View>
      </View>

      {/* Collection Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collection Method *</Text>
        <Text style={styles.sectionSubtitle}>
          Choose how you'd like to get the item to our workshop
        </Text>

        {/* Admin Collects Option */}
        <TouchableOpacity
          style={[
            styles.collectionOption,
            collectionMethod === 'admin_collects' && styles.collectionOptionSelected,
          ]}
          onPress={() => setCollectionMethod('admin_collects')}
        >
          <View style={styles.radioOuter}>
            {collectionMethod === 'admin_collects' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.collectionContent}>
            <View style={styles.collectionHeader}>
              <Truck size={20} color={colors.primary.DEFAULT} />
              <Text style={styles.collectionTitle}>We collect from you</Text>
            </View>
            <Text style={styles.collectionDescription}>
              Our team will schedule a pickup from your location. Collection fee may apply depending on distance.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Customer Brings Option */}
        <TouchableOpacity
          style={[
            styles.collectionOption,
            collectionMethod === 'customer_brings' && styles.collectionOptionSelected,
          ]}
          onPress={() => setCollectionMethod('customer_brings')}
        >
          <View style={styles.radioOuter}>
            {collectionMethod === 'customer_brings' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.collectionContent}>
            <View style={styles.collectionHeader}>
              <Store size={20} color={colors.primary.DEFAULT} />
              <Text style={styles.collectionTitle}>I'll bring it to the shop</Text>
            </View>
            <Text style={styles.collectionDescription}>
              Drop off your item at our workshop during business hours. No collection fee.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Additional Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
        <TextInput
          style={[styles.textArea, { minHeight: 80 }]}
          placeholder="Any other information that might help us (budget constraints, urgency, special instructions...)"
          placeholderTextColor={colors.gray[400]}
          multiline
          numberOfLines={3}
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
          textAlignVertical="top"
        />
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
  tipText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
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
  helpList: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  helpTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  helpItem: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
  collectionOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  collectionOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  collectionContent: {
    flex: 1,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  collectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  collectionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
});
