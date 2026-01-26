import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { authApi } from '@/api/auth';
import { colors, spacing, fontSize, fontWeight } from '@/config/theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please try again.');
      return;
    }

    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to resend email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color={colors.primary.DEFAULT} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification link to
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
