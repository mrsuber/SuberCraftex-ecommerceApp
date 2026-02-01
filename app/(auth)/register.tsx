import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, Phone, AlertTriangle, WifiOff, XCircle } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api/auth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

function getReadableError(error: any): { title: string; message: string; type: 'network' | 'duplicate' | 'generic' } {
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

  if (status === 400 && serverError?.toLowerCase().includes('already registered')) {
    return {
      title: 'Email Already In Use',
      message: 'An account with this email already exists. Try logging in instead, or use a different email.',
      type: 'duplicate',
    };
  }

  if (status === 400) {
    return {
      title: 'Invalid Information',
      message: serverError || 'Please check the information you entered and try again.',
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
    title: 'Registration Failed',
    message: serverError || 'Something unexpected happened. Please try again.',
    type: 'generic',
  };
}

export default function RegisterScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; type: string } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorInfo(null);
    try {
      await authApi.register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      Alert.alert(
        'Account Created!',
        'We sent a verification link to your email. Please verify your email to log in.',
        [
          {
            text: 'OK',
            onPress: () => router.push({
              pathname: '/(auth)/verify-email',
              params: { email: data.email },
            }),
          },
        ]
      );
    } catch (error: any) {
      setErrorInfo(getReadableError(error));
    } finally {
      setIsLoading(false);
    }
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
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
              {errorInfo.type === 'duplicate' && (
                <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.errorAction}>
                  <Text style={styles.errorActionText}>Go to Login</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                  leftIcon={<User size={20} color={colors.gray[400]} />}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  onBlur={onBlur}
                  error={errors.name?.message}
                />
              )}
            />

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
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={colors.gray[400]} />}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Create a password"
                  secureTextEntry
                  leftIcon={<Lock size={20} color={colors.gray[400]} />}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  helper="Must be at least 8 characters"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  secureTextEntry
                  leftIcon={<Lock size={20} color={colors.gray[400]} />}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign In</Text>
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
    marginBottom: spacing.xl * 1.5,
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
