import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Star } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import { reviewsApi } from '@/api/reviews';
import { Button } from '@/components/ui';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onReviewSubmitted?: () => void;
}

export function ReviewModal({
  visible,
  onClose,
  productId,
  productName,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      await reviewsApi.submit({
        productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });

      Alert.alert(
        'Review Submitted',
        'Thank you for your review! It will be visible after admin approval.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setRating(0);
              setTitle('');
              setContent('');
              onClose();
              onReviewSubmitted?.();
            },
          },
        ]
      );
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Failed to submit review. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (rating > 0 || title || content) {
      Alert.alert(
        'Discard Review?',
        'Are you sure you want to discard your review?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setRating(0);
              setTitle('');
              setContent('');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Write a Review</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Product Name */}
            <Text style={styles.productName}>{productName}</Text>

            {/* Rating Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Rating *</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Star
                      size={36}
                      color={colors.warning}
                      fill={star <= rating ? colors.warning : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
              )}
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Review Title (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Sum up your experience in a few words"
                placeholderTextColor={colors.gray[400]}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            {/* Content Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Review (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell others about your experience with this product..."
                placeholderTextColor={colors.gray[400]}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{content.length}/1000</Text>
            </View>

            {/* Submit Button */}
            <Button
              title={isSubmitting ? 'Submitting...' : 'Submit Review'}
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              style={styles.submitButton}
            />

            {isSubmitting && (
              <ActivityIndicator
                color={colors.primary.DEFAULT}
                style={styles.loader}
              />
            )}

            <Text style={styles.disclaimer}>
              Your review will be published after it has been approved by our team.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  productName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  starButton: {
    padding: spacing.xs,
  },
  ratingLabel: {
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  loader: {
    marginTop: spacing.md,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
