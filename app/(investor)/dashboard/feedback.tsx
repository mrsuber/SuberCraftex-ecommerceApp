import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Bug,
  Lightbulb,
  TrendingUp,
  MessageCircle,
  AlertTriangle,
  Plus,
  Eye,
} from 'lucide-react-native';
import { Button, Card, CardContent, CardHeader, Badge } from '@/components/ui';
import { apiClient } from '@/api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

type FeedbackType = 'bug_report' | 'feature_request' | 'improvement' | 'general' | 'complaint';
type FeedbackStatus = 'pending' | 'under_review' | 'in_progress' | 'resolved' | 'closed';

interface FeedbackResponse {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface Feedback {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  screenshots: string[];
  status: FeedbackStatus;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
  adminResponses: FeedbackResponse[];
}

const FEEDBACK_TYPES: { type: FeedbackType; label: string; description: string; icon: any }[] = [
  {
    type: 'bug_report',
    label: 'Bug Report',
    description: 'Something is not working correctly',
    icon: Bug,
  },
  {
    type: 'feature_request',
    label: 'Feature Request',
    description: 'Suggest a new feature',
    icon: Lightbulb,
  },
  {
    type: 'improvement',
    label: 'Improvement',
    description: 'Suggest how to improve existing features',
    icon: TrendingUp,
  },
  {
    type: 'complaint',
    label: 'Complaint',
    description: 'Report an issue or concern',
    icon: AlertTriangle,
  },
  {
    type: 'general',
    label: 'General Feedback',
    description: 'Any other feedback',
    icon: MessageCircle,
  },
];

const getStatusBadge = (status: FeedbackStatus) => {
  const configs: Record<FeedbackStatus, { variant: 'warning' | 'info' | 'success' | 'error' | 'default'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    under_review: { variant: 'info', label: 'Under Review' },
    in_progress: { variant: 'info', label: 'In Progress' },
    resolved: { variant: 'success', label: 'Resolved' },
    closed: { variant: 'default', label: 'Closed' },
  };

  const config = configs[status] || configs.pending;
  return <Badge label={config.label} variant={config.variant} />;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function FeedbackScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  // Fetch feedback history
  const {
    data: feedbackList,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['investor', 'feedback'],
    queryFn: async () => {
      const response = await apiClient.get('/api/investors/feedback');
      return response.data as Feedback[];
    },
  });

  // Submit feedback mutation
  const submitMutation = useMutation({
    mutationFn: async (data: { type: FeedbackType; subject: string; message: string; appVersion?: string; deviceInfo?: string }) => {
      const response = await apiClient.post('/api/investors/feedback', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor', 'feedback'] });
      setShowForm(false);
      setSubject('');
      setMessage('');
      setSelectedType('general');
      Alert.alert(
        'Feedback Submitted',
        'Thank you for your feedback! We will review it and get back to you if needed.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Submission Failed',
        error.response?.data?.error || 'Failed to submit feedback. Please try again.'
      );
    },
  });

  const handleSubmit = () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Required', 'Please enter your feedback message');
      return;
    }

    // Get device info
    const deviceInfo = `${Platform.OS} ${Platform.Version}`;
    const appVersion = Constants.expoConfig?.version || '1.0.0';

    submitMutation.mutate({
      type: selectedType,
      subject: subject.trim(),
      message: message.trim(),
      appVersion,
      deviceInfo,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  // Show feedback detail
  if (selectedFeedback) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Feedback Detail',
            headerLeft: () => (
              <TouchableOpacity onPress={() => setSelectedFeedback(null)} style={{ marginLeft: 8 }}>
                <ChevronLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              {/* Status Badge */}
              <View style={styles.detailHeader}>
                {getStatusBadge(selectedFeedback.status)}
                <Text style={styles.detailDate}>
                  Submitted {formatDate(selectedFeedback.createdAt)}
                </Text>
              </View>

              {/* Subject & Type */}
              <Card variant="outlined">
                <CardContent>
                  <View style={styles.typeRow}>
                    {(() => {
                      const TypeIcon = FEEDBACK_TYPES.find(t => t.type === selectedFeedback.type)?.icon || MessageCircle;
                      return <TypeIcon size={20} color={colors.primary.DEFAULT} />;
                    })()}
                    <Badge
                      label={FEEDBACK_TYPES.find(t => t.type === selectedFeedback.type)?.label || 'General'}
                      variant="default"
                    />
                  </View>
                  <Text style={styles.detailSubject}>{selectedFeedback.subject}</Text>
                  <Text style={styles.detailMessage}>{selectedFeedback.message}</Text>
                </CardContent>
              </Card>
            </View>

            {/* Admin Responses */}
            {selectedFeedback.adminResponses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Responses</Text>
                {selectedFeedback.adminResponses.map((response) => (
                  <Card key={response.id} variant="elevated" style={styles.responseCard}>
                    <CardContent>
                      <View style={styles.responseHeader}>
                        <Badge label="Admin" variant="info" />
                        <Text style={styles.responseDate}>
                          {formatDate(response.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.responseMessage}>{response.message}</Text>
                    </CardContent>
                  </Card>
                ))}
              </View>
            )}

            {/* Back Button */}
            <View style={styles.section}>
              <Button
                title="Back to Feedback List"
                variant="outline"
                onPress={() => setSelectedFeedback(null)}
                fullWidth
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  // Show feedback form
  if (showForm) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Send Feedback',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  setSubject('');
                  setMessage('');
                }}
                style={{ marginLeft: 8 }}
              >
                <ChevronLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feedback Type</Text>
              {FEEDBACK_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeCard,
                      selectedType === item.type && styles.typeCardSelected,
                    ]}
                    onPress={() => setSelectedType(item.type)}
                  >
                    <View style={styles.typeIcon}>
                      <Icon size={20} color={selectedType === item.type ? colors.primary.DEFAULT : colors.gray[500]} />
                    </View>
                    <View style={styles.typeContent}>
                      <Text style={[
                        styles.typeLabel,
                        selectedType === item.type && styles.typeLabelSelected,
                      ]}>
                        {item.label}
                      </Text>
                      <Text style={styles.typeDescription}>{item.description}</Text>
                    </View>
                    <View style={[
                      styles.radioButton,
                      selectedType === item.type && styles.radioButtonSelected,
                    ]}>
                      {selectedType === item.type && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief title for your feedback"
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
            </View>

            {/* Message */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Feedback</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Please describe your feedback in detail..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <Button
                title="Submit Feedback"
                onPress={handleSubmit}
                loading={submitMutation.isPending}
                fullWidth
                size="lg"
              />
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => {
                  setShowForm(false);
                  setSubject('');
                  setMessage('');
                }}
              >
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  // Main list view
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Feedback',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <ChevronLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.DEFAULT]}
              tintColor={colors.primary.DEFAULT}
            />
          }
        >
          {/* New Feedback Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.newFeedbackButton}
              onPress={() => setShowForm(true)}
            >
              <View style={styles.newFeedbackIcon}>
                <Plus size={24} color={colors.white} />
              </View>
              <View style={styles.newFeedbackContent}>
                <Text style={styles.newFeedbackTitle}>Send Feedback</Text>
                <Text style={styles.newFeedbackSubtitle}>
                  Share your thoughts, suggestions, or report issues
                </Text>
              </View>
              <ChevronRight size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Feedback History */}
          {feedbackList && feedbackList.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Feedback History</Text>
              {feedbackList.map((item) => {
                const TypeIcon = FEEDBACK_TYPES.find(t => t.type === item.type)?.icon || MessageCircle;
                const hasResponses = item.adminResponses.length > 0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedFeedback(item)}
                  >
                    <Card style={styles.feedbackCard} variant="outlined">
                      <CardContent style={styles.feedbackContent}>
                        <View style={styles.feedbackInfo}>
                          <View style={styles.feedbackHeader}>
                            <TypeIcon size={16} color={colors.gray[500]} />
                            <Text style={styles.feedbackSubject} numberOfLines={1}>
                              {item.subject}
                            </Text>
                          </View>
                          <Text style={styles.feedbackMessage} numberOfLines={2}>
                            {item.message}
                          </Text>
                          <View style={styles.feedbackMeta}>
                            <Text style={styles.feedbackDate}>
                              {formatDate(item.createdAt)}
                            </Text>
                            {hasResponses && (
                              <View style={styles.responseIndicator}>
                                <MessageCircle size={12} color={colors.primary.DEFAULT} />
                                <Text style={styles.responseCount}>
                                  {item.adminResponses.length} {item.adminResponses.length === 1 ? 'reply' : 'replies'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.feedbackStatus}>
                          {getStatusBadge(item.status)}
                          <ChevronRight size={18} color={colors.gray[400]} style={styles.chevron} />
                        </View>
                      </CardContent>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color={colors.gray[300]} />
              <Text style={styles.emptyTitle}>No Feedback Yet</Text>
              <Text style={styles.emptyText}>
                Your feedback helps us improve the app for everyone
              </Text>
            </View>
          )}
        </ScrollView>
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
  },
  section: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.md,
  },
  // New Feedback Button
  newFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
  },
  newFeedbackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  newFeedbackContent: {
    flex: 1,
  },
  newFeedbackTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  newFeedbackSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  // Feedback Cards
  feedbackCard: {
    marginBottom: spacing.sm,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  feedbackInfo: {
    flex: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  feedbackSubject: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    flex: 1,
  },
  feedbackMessage: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  feedbackDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseCount: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  feedbackStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  // Type Selection
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  typeCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  typeLabelSelected: {
    color: colors.primary.DEFAULT,
  },
  typeDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  // Input Fields
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  cancelLinkText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  // Detail View
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailSubject: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  detailMessage: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    lineHeight: 22,
  },
  // Response Cards
  responseCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.primary[50],
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  responseDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  responseMessage: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
