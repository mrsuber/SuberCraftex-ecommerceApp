import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, RefreshCw, CheckCircle, PartyPopper, AlertCircle } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { authApi } from '@/api/auth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email, fromRegistration } = useLocalSearchParams<{ email: string; fromRegistration?: string }>();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  const isNewRegistration = fromRegistration === 'true';

  const handleResendEmail = async () => {
    if (!email) {
      setResendStatus('error');
      setResendMessage('Email address is missing. Please try again.');
      return;
    }

    setIsResending(true);
    setResendStatus('idle');
    try {
      await authApi.resendVerification(email);
      setResendStatus('success');
      setResendMessage('A new verification link has been sent to your email.');
    } catch (error: any) {
      setResendStatus('error');
      setResendMessage(error.response?.data?.error || 'Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success banner for new registrations */}
        {isNewRegistration && (
          <View style={styles.successBanner}>
            <PartyPopper size={24} color={colors.success.DEFAULT} />
            <View style={styles.successBannerText}>
              <Text style={styles.successBannerTitle}>Account Created Successfully!</Text>
              <Text style={styles.successBannerSubtitle}>
                One more step: verify your email to start using your account.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.iconContainer}>
          <Mail size={64} color={colors.primary.DEFAULT} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            {isNewRegistration ? 'Verify Your Email' : 'Check Your Email'}
          </Text>
          <Text style={styles.subtitle}>
            {isNewRegistration
              ? 'We sent a verification link to'
              : "We've sent a verification link to"}
          </Text>
          <Text style={styles.email}>{email || 'your email'}</Text>
        </View>

        <View style={styles.instructionsContainer}>
          <View style={styles.instructionItem}>
            <CheckCircle size={20} color={colors.success.DEFAULT} />
            <Text style={styles.instructionText}>
              Open the email we sent you
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <CheckCircle size={20} color={colors.success.DEFAULT} />
            <Text style={styles.instructionText}>
              Click the verification link
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <CheckCircle size={20} color={colors.success.DEFAULT} />
            <Text style={styles.instructionText}>
              Come back here and sign in
            </Text>
          </View>
        </View>

        {/* Resend status message */}
        {resendStatus !== 'idle' && (
          <View style={[
            styles.resendStatusBanner,
            resendStatus === 'success' ? styles.resendStatusSuccess : styles.resendStatusError,
          ]}>
            {resendStatus === 'success' ? (
              <CheckCircle size={18} color={colors.success.DEFAULT} />
            ) : (
              <AlertCircle size={18} color={colors.error.DEFAULT} />
            )}
            <Text style={[
              styles.resendStatusText,
              resendStatus === 'success' ? styles.resendStatusTextSuccess : styles.resendStatusTextError,
            ]}>
              {resendMessage}
            </Text>
          </View>
        )}

        <Button
          title="Go to Sign In"
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
          size="lg"
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the email? </Text>
          <Button
            title="Resend Email"
            variant="ghost"
            size="sm"
            loading={isResending}
            leftIcon={<RefreshCw size={16} color={colors.primary.DEFAULT} />}
            onPress={handleResendEmail}
          />
        </View>

        <Text style={styles.spamNote}>
          Check your spam folder if you don't see the email in your inbox.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  successBannerText: {
    flex: 1,
  },
  successBannerTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.success.DEFAULT,
    marginBottom: 2,
  },
  successBannerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
  },
  email: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  instructionsContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    marginLeft: spacing.md,
  },
  resendStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  resendStatusSuccess: {
    backgroundColor: colors.success[50],
  },
  resendStatusError: {
    backgroundColor: colors.error[50],
  },
  resendStatusText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  resendStatusTextSuccess: {
    color: colors.success.DEFAULT,
  },
  resendStatusTextError: {
    color: colors.error.DEFAULT,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  resendText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  spamNote: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
