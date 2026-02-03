import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  TextInput,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebView } from 'react-native-webview';
import {
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Trash2,
} from 'lucide-react-native';
import {
  getBlogPostBySlug,
  getBlogEngagement,
  likePost,
  unlikePost,
  getComments,
  addComment,
  deleteComment,
  recordShare,
  BlogComment,
} from '@/api/blog';
import { getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import { useAuthStore } from '@/stores/auth-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
  );
  return match ? match[1] : null;
}

export default function BlogDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated, user } = useAuthStore();

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'like' | 'comment'>('like');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<BlogComment[]>([]);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => getBlogPostBySlug(slug!),
    enabled: !!slug,
  });

  // Engagement data
  const { data: engagement, refetch: refetchEngagement } = useQuery({
    queryKey: ['blog-engagement', post?.id],
    queryFn: () => getBlogEngagement(post!.id),
    enabled: !!post?.id,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: () => (engagement?.likes.hasLiked ? unlikePost(post!.id) : likePost(post!.id)),
    onSuccess: () => refetchEngagement(),
  });

  // Comment mutations
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => addComment(post!.id, content),
    onSuccess: (data) => {
      setComments([data.comment, ...comments]);
      setNewComment('');
      refetchEngagement();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(post!.id, commentId),
    onSuccess: (_, commentId) => {
      setComments(comments.filter((c) => c.id !== commentId));
      refetchEngagement();
    },
  });

  // Load comments when expanded
  useEffect(() => {
    if (showComments && post?.id && comments.length === 0) {
      getComments(post.id).then((data) => setComments(data.comments));
    }
  }, [showComments, post?.id]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      setAuthAction('like');
      setShowAuthModal(true);
      return;
    }
    likeMutation.mutate();
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      setAuthAction('comment');
      setShowAuthModal(true);
      return;
    }
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `Check out this article: ${post.title}\nhttps://subercraftex.com/blog/${post.slug}`,
        title: post.title,
      });
      recordShare(post.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGoToSignup = () => {
    setShowAuthModal(false);
    router.push('/signup');
  };

  const handleGoToLogin = () => {
    setShowAuthModal(false);
    router.push('/login');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
  };

  const goToPrevious = () => {
    if (!post?.images) return;
    setSelectedImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
  };

  const goToNext = () => {
    if (!post?.images) return;
    setSelectedImageIndex((prev) => (prev + 1) % post.images.length);
  };

  const youtubeId = post?.youtube_url ? extractYouTubeId(post.youtube_url) : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Post Not Found</Text>
          <Text style={styles.errorText}>
            The blog post you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const featuredImageUrl = getImageUrl(post.featured_image);
  const galleryImages = (post.images || []).map((img) => getImageUrl(img)).filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Image */}
        {featuredImageUrl && (
          <View style={styles.featuredImageContainer}>
            <Image
              source={{ uri: featuredImageUrl }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{post.title}</Text>

          {/* Meta */}
          <View style={styles.metaContainer}>
            {post.author && (
              <View style={styles.metaItem}>
                <User size={14} color={colors.gray[500]} />
                <Text style={styles.metaText}>
                  {post.author.full_name || post.author.email}
                </Text>
              </View>
            )}
            {post.published_at && (
              <View style={styles.metaItem}>
                <Calendar size={14} color={colors.gray[500]} />
                <Text style={styles.metaText}>
                  {formatDate(post.published_at)}
                </Text>
              </View>
            )}
          </View>

          {/* YouTube Video */}
          {youtubeId && (
            <View style={styles.videoContainer}>
              <WebView
                source={{ uri: `https://www.youtube.com/embed/${youtubeId}` }}
                style={styles.video}
                allowsFullscreenVideo
                javaScriptEnabled
              />
            </View>
          )}

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <View style={styles.gallerySection}>
              <View style={styles.galleryHeader}>
                <ImageIcon size={18} color={colors.gray[700]} />
                <Text style={styles.galleryTitle}>Gallery</Text>
                <Text style={styles.galleryCount}>
                  {galleryImages.length} {galleryImages.length === 1 ? 'image' : 'images'}
                </Text>
              </View>
              <View style={styles.galleryGrid}>
                {galleryImages.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.galleryItem}
                    onPress={() => openLightbox(index)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                    <View style={styles.galleryOverlay}>
                      <Text style={styles.galleryOverlayText}>View</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Body Content */}
          <View style={styles.bodyContainer}>
            <WebView
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 16px;
                        line-height: 1.7;
                        color: #1f2937;
                        padding: 0;
                      }
                      p { margin-bottom: 16px; }
                      h1, h2, h3, h4 { margin-top: 24px; margin-bottom: 12px; font-weight: 600; }
                      h1 { font-size: 24px; }
                      h2 { font-size: 20px; }
                      h3 { font-size: 18px; }
                      img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
                      a { color: #6366f1; }
                      ul, ol { margin-left: 20px; margin-bottom: 16px; }
                      li { margin-bottom: 8px; }
                      blockquote {
                        border-left: 4px solid #e5e7eb;
                        padding-left: 16px;
                        margin: 16px 0;
                        color: #6b7280;
                        font-style: italic;
                      }
                      pre {
                        background: #f3f4f6;
                        padding: 16px;
                        border-radius: 8px;
                        overflow-x: auto;
                        font-size: 14px;
                      }
                      code {
                        background: #f3f4f6;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 14px;
                      }
                    </style>
                  </head>
                  <body>${post.content}</body>
                  </html>
                `,
              }}
              style={styles.bodyWebView}
              scrollEnabled={false}
              onMessage={() => {}}
              injectedJavaScript={`
                setTimeout(() => {
                  window.ReactNativeWebView.postMessage(document.body.scrollHeight.toString());
                }, 100);
              `}
            />
          </View>

          {/* Engagement Section */}
          <View style={styles.engagementSection}>
            <View style={styles.engagementDivider} />

            {/* Engagement Buttons */}
            <View style={styles.engagementButtons}>
              <TouchableOpacity
                style={styles.engagementButton}
                onPress={handleLike}
                disabled={likeMutation.isPending}
              >
                <Heart
                  size={22}
                  color={engagement?.likes.hasLiked ? colors.red[500] : colors.gray[600]}
                  fill={engagement?.likes.hasLiked ? colors.red[500] : 'transparent'}
                />
                <Text style={[
                  styles.engagementCount,
                  engagement?.likes.hasLiked && styles.engagementCountActive
                ]}>
                  {engagement?.likes.count || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.engagementButton}
                onPress={() => setShowComments(!showComments)}
              >
                <MessageCircle size={22} color={colors.gray[600]} />
                <Text style={styles.engagementCount}>
                  {engagement?.comments.count || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.engagementButton} onPress={handleShare}>
                <Share2 size={22} color={colors.gray[600]} />
                <Text style={styles.engagementCount}>
                  {engagement?.shares.count || 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comments Section */}
            {showComments && (
              <View style={styles.commentsSection}>
                {/* Comment Input */}
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={isAuthenticated ? "Write a comment..." : "Log in to comment"}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={2000}
                    onFocus={() => {
                      if (!isAuthenticated) {
                        setAuthAction('comment');
                        setShowAuthModal(true);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.commentSendButton,
                      (!newComment.trim() || addCommentMutation.isPending) && styles.commentSendButtonDisabled
                    ]}
                    onPress={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>

                {/* Comments List */}
                {comments.length === 0 ? (
                  <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
                ) : (
                  comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {(comment.user.full_name || comment.user.email)[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>
                            {comment.user.full_name || comment.user.email}
                          </Text>
                          <Text style={styles.commentDate}>
                            {formatCommentDate(comment.created_at)}
                          </Text>
                        </View>
                        {user?.id === comment.user.id && (
                          <TouchableOpacity
                            style={styles.deleteCommentButton}
                            onPress={() => deleteCommentMutation.mutate(comment.id)}
                          >
                            <Trash2 size={16} color={colors.gray[400]} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View style={styles.lightboxContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={closeLightbox}
          >
            <X size={28} color={colors.white} />
          </TouchableOpacity>

          {/* Navigation arrows */}
          {galleryImages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxNavLeft]}
                onPress={goToPrevious}
              >
                <ChevronLeft size={32} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxNavRight]}
                onPress={goToNext}
              >
                <ChevronRight size={32} color={colors.white} />
              </TouchableOpacity>
            </>
          )}

          {/* Image */}
          <Pressable
            style={styles.lightboxImageContainer}
            onPress={closeLightbox}
          >
            <Image
              source={{ uri: galleryImages[selectedImageIndex] }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          </Pressable>

          {/* Counter */}
          <View style={styles.lightboxCounter}>
            <Text style={styles.lightboxCounterText}>
              {selectedImageIndex + 1} / {galleryImages.length}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Auth Required Modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.authModalOverlay}>
          <View style={styles.authModalContent}>
            <TouchableOpacity
              style={styles.authModalClose}
              onPress={() => setShowAuthModal(false)}
            >
              <X size={24} color={colors.gray[500]} />
            </TouchableOpacity>

            <Text style={styles.authModalTitle}>Account Required</Text>
            <Text style={styles.authModalText}>
              You need to be registered to {authAction} this post. Create an account to engage with our content.
            </Text>

            <View style={styles.authModalButtons}>
              <TouchableOpacity
                style={styles.authModalButtonSecondary}
                onPress={handleGoToLogin}
              >
                <Text style={styles.authModalButtonSecondaryText}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.authModalButtonPrimary}
                onPress={handleGoToSignup}
              >
                <Text style={styles.authModalButtonPrimaryText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatCommentDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  backBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  featuredImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.gray[100],
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.gray[900],
  },
  video: {
    flex: 1,
  },
  gallerySection: {
    marginBottom: spacing.lg,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  galleryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
    flex: 1,
  },
  galleryCount: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  galleryItem: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryOverlayText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    opacity: 0,
  },
  bodyContainer: {
    minHeight: 200,
  },
  bodyWebView: {
    flex: 1,
    minHeight: 300,
    backgroundColor: 'transparent',
  },
  // Lightbox styles
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: spacing.sm,
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    zIndex: 10,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.full,
  },
  lightboxNavLeft: {
    left: 16,
  },
  lightboxNavRight: {
    right: 16,
  },
  lightboxImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  lightboxImage: {
    width: SCREEN_WIDTH - spacing.md * 2,
    height: SCREEN_HEIGHT * 0.7,
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  lightboxCounterText: {
    color: colors.white,
    fontSize: fontSize.sm,
  },
  // Engagement styles
  engagementSection: {
    marginTop: spacing.lg,
  },
  engagementDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginBottom: spacing.md,
  },
  engagementButtons: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  engagementCount: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  engagementCountActive: {
    color: colors.red[500],
  },
  // Comments styles
  commentsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  commentSendButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  noComments: {
    textAlign: 'center',
    color: colors.gray[500],
    fontSize: fontSize.sm,
    paddingVertical: spacing.lg,
  },
  commentItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  commentAvatarText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  deleteCommentButton: {
    padding: spacing.xs,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
    marginLeft: 40,
  },
  // Auth Modal styles
  authModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  authModalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  authModalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  authModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  authModalText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  authModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  authModalButtonSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  authModalButtonSecondaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  authModalButtonPrimary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
  },
  authModalButtonPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
