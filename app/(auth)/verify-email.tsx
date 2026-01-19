import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, RefreshCw } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api/auth';
import { colors, spacing, fontSize, fontWeight } from '@/config/theme';

const verifySchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (data: VerifyFormData) => {
    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verifyEmail(email, data.code);
      Alert.alert(
        'Email Verified',
        'Your email has been verified successfully. You can now log in.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      const message = error.response?.data?.error || 'Verification failed. Please try again.';
      Alert.alert('Verification Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please try again.');
      return;
    }

    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to resend code. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={48} color={colors.primary.DEFAULT} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to
          </Text>
          <Text style={styles.email}>{email || 'your email'}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Verification Code"
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.code?.message}
              />
            )}
          />

          <Button
            title="Verify Email"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth
            size="lg"
          />
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <Button
            title="Resend Code"
            variant="ghost"
            size="sm"
            loading={isResending}
            leftIcon={<RefreshCw size={16} color={colors.primary.DEFAULT} />}
            onPress={handleResendCode}
          />
        </View>

        <Button
          title="Back to Login"
          variant="outline"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
        />
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
    marginBottom: spacing.xl * 1.5,
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
  form: {
    marginBottom: spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  resendText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  backButton: {
    marginTop: spacing.md,
  },
});
