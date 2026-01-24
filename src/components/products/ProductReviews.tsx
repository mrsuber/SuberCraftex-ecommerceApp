import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Star, ThumbsUp, Edit3, User } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import { useAuthStore } from '@/stores/auth-store';
import { reviewsApi } from '@/api/reviews';
import { formatDistanceToNow } from 'date-fns';

interface ReviewUser {
  fullName: string;
  avatarUrl: string | null;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  verifiedPurchase: boolean;
  helpfulCount: number;
  adminResponse: string | null;
  adminRespondedAt: string | null;
  createdAt: string;
  user: ReviewUser;
}

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
  onWriteReview: () => void;
}

export function ProductReviews({
  productId,
  reviews,
  avgRating,
  reviewCount,
  onWriteReview,
}: ProductReviewsProps) {
  const { isAuthenticated } = useAuthStore();
  const [votedReviews, setVotedReviews] = useState<Set<string>>(new Set());
  const [localReviews, setLocalReviews] = useState(reviews);

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    stars: rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: reviewCount > 0
      ? (reviews.filter((r) => r.rating === rating).length / reviewCount) * 100
      : 0,
  }));

  const handleHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to vote on reviews.');
      return;
    }

    if (votedReviews.has(reviewId)) {
      Alert.alert('Already Voted', "You've already marked this as helpful.");
      return;
    }

    try {
      await reviewsApi.markHelpful(reviewId);
      setVotedReviews(new Set([...votedReviews, reviewId]));
      // Update local state
      setLocalReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
        )
      );
      Alert.alert('Thank You', 'Thank you for your feedback!');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <View style={styles.container}>
      {/* Rating Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          {/* Overall Rating */}
          <View style={styles.overallRating}>
            <Text style={styles.ratingNumber}>{avgRating.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  color={colors.warning}
                  fill={star <= Math.round(avgRating) ? colors.warning : 'transparent'}
                />
              ))}
            </View>
            <Text style={styles.totalReviews}>
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </Text>
          </View>

          {/* Rating Distribution */}
          <View style={styles.distribution}>
            {ratingDistribution.map(({ stars, count, percentage }) => (
              <View key={stars} style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>{stars}</Text>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${percentage}%` }]}
                  />
                </View>
                <Text style={styles.distributionCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Write Review Button */}
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={onWriteReview}
        >
          <Edit3 size={18} color={colors.white} />
          <Text style={styles.writeReviewText}>
            {isAuthenticated ? 'Write a Review' : 'Log in to Review'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reviews List */}
      {localReviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to review this product!
          </Text>
        </View>
      ) : (
        <View style={styles.reviewsList}>
          {localReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* Review Header */}
              <View style={styles.reviewHeader}>
                <View style={styles.userInfo}>
                  {review.user.avatarUrl ? (
                    <Image
                      source={{ uri: review.user.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={20} color={colors.gray[400]} />
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>
                        {review.user.fullName || 'Customer'}
                      </Text>
                      {review.verifiedPurchase && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewDate}>
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Rating Stars */}
              <View style={styles.reviewRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color={colors.warning}
                    fill={star <= review.rating ? colors.warning : 'transparent'}
                  />
                ))}
              </View>

              {/* Review Content */}
              {review.title && (
                <Text style={styles.reviewTitle}>{review.title}</Text>
              )}
              {review.content && (
                <Text style={styles.reviewContent}>{review.content}</Text>
              )}

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reviewImages}
                >
                  {review.images.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={styles.reviewImage}
                    />
                  ))}
                </ScrollView>
              )}

              {/* Admin Response */}
              {review.adminResponse && (
                <View style={styles.adminResponse}>
                  <Text style={styles.adminResponseLabel}>
                    Response from SuberCraftex:
                  </Text>
                  <Text style={styles.adminResponseText}>
                    {review.adminResponse}
                  </Text>
                </View>
              )}

              {/* Helpful Button */}
              <TouchableOpacity
                style={[
                  styles.helpfulButton,
                  votedReviews.has(review.id) && styles.helpfulButtonVoted,
                ]}
                onPress={() => handleHelpful(review.id)}
                disabled={votedReviews.has(review.id)}
              >
                <ThumbsUp
                  size={16}
                  color={
                    votedReviews.has(review.id)
                      ? colors.primary.DEFAULT
                      : colors.gray[500]
                  }
                  fill={votedReviews.has(review.id) ? colors.primary.DEFAULT : 'transparent'}
                />
                <Text
                  style={[
                    styles.helpfulText,
                    votedReviews.has(review.id) && styles.helpfulTextVoted,
                  ]}
                >
                  Helpful ({review.helpfulCount})
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  overallRating: {
    alignItems: 'center',
    paddingRight: spacing.lg,
    borderRightWidth: 1,
    borderRightColor: colors.gray[200],
  },
  ratingNumber: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: spacing.xs,
  },
  totalReviews: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  distribution: {
    flex: 1,
    paddingLeft: spacing.lg,
    justifyContent: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  distributionLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    width: 12,
    marginRight: 4,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 3,
  },
  distributionCount: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    width: 20,
    textAlign: 'right',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  writeReviewText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
  },
  reviewsList: {
    gap: spacing.md,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  reviewHeader: {
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  verifiedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: spacing.sm,
  },
  reviewTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  reviewContent: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  reviewImages: {
    marginTop: spacing.sm,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  adminResponse: {
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  adminResponseLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
  },
  adminResponseText: {
    fontSize: fontSize.sm,
    color: colors.primary[700],
    lineHeight: 18,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  helpfulButtonVoted: {
    opacity: 0.8,
  },
  helpfulText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  helpfulTextVoted: {
    color: colors.primary.DEFAULT,
  },
});
