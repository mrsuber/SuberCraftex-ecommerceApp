import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, AlertTriangle, WifiOff, XCircle, CheckCircle } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api/auth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function getReadableError(error: any): { title: string; message: string; type: 'network' | 'generic' } {
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return {
      title: 'No Internet Connection',
      message: 'Please check your Wi-Fi or mobile data and try again.',
      type: 'network',
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      title: 'Connection Timed Out',
      message: 'The server is taking too long to respond. Please try again in a moment.',
      type: 'network',
    };
  }

  const status = error.response?.status;
  const serverError = error.response?.data?.error;

  if (status === 400) {
    return {
      title: 'Invalid Email',
      message: serverError || 'Please enter a valid email address.',
      type: 'generic',
    };
  }

  if (status && status >= 500) {
    return {
      title: 'Server Problem',
      message: 'Something went wrong on our end. Please try again in a few minutes.',
      type: 'generic',
    };
  }

  return {
    title: 'Request Failed',
    message: serverError || 'Something unexpected happened. Please try again.',
    type: 'generic',
  };
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; type: string } | null>(null);

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
    setErrorInfo(null);
    try {
      await authApi.forgotPassword(data.email);
      setEmailSent(true);
    } catch (error: any) {
      setErrorInfo(getReadableError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(getValues('email'));
    } catch (error: any) {
      // Silently ignore - the success screen stays
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={48} color={colors.success.DEFAULT} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to
            </Text>
            <Text style={styles.email}>{getValues('email')}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What to do next:</Text>
            <Text style={styles.infoStep}>1. Open the email from SuberCraftex</Text>
            <Text style={styles.infoStep}>2. Tap the reset link in the email</Text>
            <Text style={styles.infoStep}>3. Create a new password</Text>
            <Text style={styles.infoStep}>4. Come back here and log in</Text>
          </View>

          <Text style={styles.spamHint}>
            Don't see the email? Check your spam or junk folder. The link expires in 1 hour.
          </Text>

          <Button
            title="Resend Email"
            variant="outline"
            onPress={handleResend}
            loading={isLoading}
            fullWidth
            size="lg"
            style={{ marginBottom: spacing.md }}
          />

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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Button
            title="Back"
            variant="ghost"
            leftIcon={<ArrowLeft size={20} color={colors.gray[700]} />}
            onPress={() => router.back()}
            style={styles.backButton}
          />

          <View style={styles.iconContainer}>
            <Mail size={48} color={colors.primary.DEFAULT} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter the email you used to create your account. We'll send you a link to reset your password.
            </Text>
          </View>

          {/* Error Banner */}
          {errorInfo && (
            <View style={[
              styles.errorBanner,
              errorInfo.type === 'network' && styles.errorBannerNetwork,
            ]}>
              <View style={styles.errorBannerHeader}>
                {errorInfo.type === 'network' ? (
                  <WifiOff size={18} color={colors.warning.DEFAULT} />
                ) : (
                  <AlertTriangle size={18} color={colors.error.DEFAULT} />
                )}
                <Text style={[
                  styles.errorBannerTitle,
                  errorInfo.type === 'network' && styles.errorBannerTitleWarning,
                ]}>
                  {errorInfo.title}
                </Text>
                <TouchableOpacity onPress={() => setErrorInfo(null)} style={styles.errorDismiss}>
                  <XCircle size={18} color={colors.gray[400]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.errorBannerMessage}>{errorInfo.message}</Text>
            </View>
          )}

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
                  onChangeText={(text) => {
                    onChange(text);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Button
              title="Send Reset Link"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
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
    marginBottom: spacing.lg,
  },
  successIconContainer: {
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
  infoBox: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
    marginBottom: spacing.sm,
  },
  infoStep: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 22,
    marginLeft: spacing.xs,
  },
  spamHint: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  // Error banner styles
  errorBanner: {
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerNetwork: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
  },
  errorBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  errorBannerTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error.DEFAULT,
  },
  errorBannerTitleWarning: {
    color: colors.warning.DEFAULT,
  },
  errorBannerMessage: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
    marginLeft: 26,
  },
  errorDismiss: {
    padding: 2,
  },
});
