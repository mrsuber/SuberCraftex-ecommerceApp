import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, AlertTriangle, WifiOff, XCircle } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function getReadableError(error: any): { title: string; message: string; type: 'network' | 'auth' | 'verify' | 'generic' } {
  // Network / timeout errors
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
  const emailNotVerified = error.response?.data?.emailNotVerified;

  // Email not verified
  if (status === 403 && emailNotVerified) {
    return {
      title: 'Email Not Verified',
      message: 'You need to verify your email before logging in. Check your inbox for the verification link.',
      type: 'verify',
    };
  }

  // Wrong credentials
  if (status === 401) {
    return {
      title: 'Incorrect Email or Password',
      message: 'Double-check your email and password and try again. Passwords are case-sensitive.',
      type: 'auth',
    };
  }

  // Validation error
  if (status === 400) {
    return {
      title: 'Invalid Input',
      message: serverError || 'Please check the information you entered.',
      type: 'generic',
    };
  }

  // Server error
  if (status && status >= 500) {
    return {
      title: 'Server Problem',
      message: 'Something went wrong on our end. Please try again in a few minutes.',
      type: 'generic',
    };
  }

  return {
    title: 'Login Failed',
    message: serverError || 'Something unexpected happened. Please try again.',
    type: 'generic',
  };
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; type: string } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorInfo(null);
    try {
      await login(data.email, data.password);
      router.replace('/(tabs)');
    } catch (error: any) {
      setErrorInfo(getReadableError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = () => {
    router.push({
      pathname: '/(auth)/verify-email',
      params: { email: getValues('email') },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue shopping</Text>
          </View>

          {/* Error Banner */}
          {errorInfo && (
            <View style={[
              styles.errorBanner,
              errorInfo.type === 'network' && styles.errorBannerNetwork,
              errorInfo.type === 'verify' && styles.errorBannerVerify,
            ]}>
              <View style={styles.errorBannerHeader}>
                {errorInfo.type === 'network' ? (
                  <WifiOff size={18} color={errorInfo.type === 'network' ? colors.warning.DEFAULT : colors.error.DEFAULT} />
                ) : (
                  <AlertTriangle size={18} color={errorInfo.type === 'verify' ? colors.warning.DEFAULT : colors.error.DEFAULT} />
                )}
                <Text style={[
                  styles.errorBannerTitle,
                  errorInfo.type === 'network' && styles.errorBannerTitleWarning,
                  errorInfo.type === 'verify' && styles.errorBannerTitleWarning,
                ]}>
                  {errorInfo.title}
                </Text>
                <TouchableOpacity onPress={() => setErrorInfo(null)} style={styles.errorDismiss}>
                  <XCircle size={18} color={colors.gray[400]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.errorBannerMessage}>{errorInfo.message}</Text>
              {errorInfo.type === 'verify' && (
                <TouchableOpacity onPress={handleResendVerification} style={styles.errorAction}>
                  <Text style={styles.errorActionText}>Go to Verification</Text>
                </TouchableOpacity>
              )}
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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  leftIcon={<Lock size={20} color={colors.gray[400]} />}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <TouchableOpacity style={styles.forgotPassword}>
              <Link href="/(auth)/forgot-password" asChild>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </Link>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
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
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  logoImage: {
    width: 200,
    height: 60,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  form: {
    marginBottom: spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  footerLink: {
    fontSize: fontSize.base,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
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
  errorBannerVerify: {
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
  errorAction: {
    marginTop: spacing.sm,
    marginLeft: 26,
  },
  errorActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
});
