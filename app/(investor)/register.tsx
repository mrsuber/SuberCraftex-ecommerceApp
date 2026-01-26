import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, Shield, DollarSign, Users } from 'lucide-react-native';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone is required'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Passive Income',
    description: 'Earn returns from product sales and equipment usage',
  },
  {
    icon: Shield,
    title: 'Secured Investment',
    description: 'Your funds are allocated to tangible assets',
  },
  {
    icon: DollarSign,
    title: 'Flexible Withdrawals',
    description: 'Multiple withdrawal options including cash and products',
  },
  {
    icon: Users,
    title: 'Transparent Tracking',
    description: 'Real-time dashboard to monitor your investments',
  },
];

export default function InvestorRegisterScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  useEffect(() => {
    checkInvestorStatus();
  }, []);

  const checkInvestorStatus = async () => {
    try {
      // Try to get investor profile
      const response = await apiClient.get(API_ENDPOINTS.investor.me);
      const investor = response.data;

      // User is already an investor, redirect based on their status
      if (investor.agreementAccepted) {
        // Agreement accepted, go to dashboard
        router.replace('/(investor)/dashboard');
      } else if (investor.kycStatus === 'pending' || investor.kycStatus === 'approved') {
        // KYC submitted, go to agreement
        router.replace('/(investor)/agreement');
      } else {
        // KYC not started or rejected, go to verify
        router.replace('/(investor)/verify');
      }
    } catch (error: any) {
      // 401 or 404 means user is not an investor yet, show registration form
      setIsCheckingStatus(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.investor.register, data);
      router.push('/(investor)/verify');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.error || 'Failed to register as investor. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking if user is already an investor
  if (isCheckingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <TrendingUp size={40} color={colors.primary.DEFAULT} />
          </View>
          <Text style={styles.title}>Invest with SuberCraftex</Text>
          <Text style={styles.subtitle}>
            Join our investor program and earn returns from our growing business
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Invest?</Text>
          <View style={styles.benefitsGrid}>
            {BENEFITS.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} style={styles.benefitCard} variant="outlined">
                  <CardContent style={styles.benefitContent}>
                    <View style={styles.benefitIcon}>
                      <Icon size={24} color={colors.primary.DEFAULT} />
                    </View>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>
                      {benefit.description}
                    </Text>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        </View>

        {/* Registration Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Get Started</Text>
          <Card variant="outlined">
            <CardContent>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Full Legal Name"
                    placeholder="Enter your full name"
                    value={value}
                    onChangeText={onChange}
                    error={errors.fullName?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Phone Number"
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    error={errors.phone?.message}
                  />
                )}
              />

              <Text style={styles.disclaimer}>
                By continuing, you agree to our investor terms and conditions.
                You will need to complete KYC verification before you can start
                investing.
              </Text>

              <Button
                title="Continue to Verification"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                fullWidth
                size="lg"
              />
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitCard: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
    marginBottom: spacing.md,
  },
  benefitContent: {
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 140,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  benefitTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
  formSection: {
    padding: spacing.lg,
  },
  disclaimer: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
});
