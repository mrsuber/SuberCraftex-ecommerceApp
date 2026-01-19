import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight } from '@/config/theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      // TODO: Implement forgot password API
      // await authApi.forgotPassword(data.email);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setEmailSent(true);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send reset email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Mail size={48} color={colors.primary.DEFAULT} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to
            </Text>
            <Text style={styles.email}>{getValues('email')}</Text>
          </View>

          <Text style={styles.info}>
            If you don't see the email, check your spam folder. The link will expire in 1 hour.
          </Text>

          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Button
            title="Back"
            variant="ghost"
            leftIcon={<ArrowLeft size={20} color={colors.gray[700]} />}
            onPress={() => router.back()}
            style={styles.backButton}
          />

          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={<Mail size={20} color={colors.gray[400]} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Button
              title="Send Reset Instructions"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.xl,
  },
  info: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
});
