import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Shield, Eye, EyeOff } from 'lucide-react-native';
import { Button, Input, Card, CardContent, CardHeader } from '@/components/ui';
import { apiClient } from '@/api/client';
import { colors, spacing, fontSize, fontWeight } from '@/config/theme';

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SecurityScreen() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await apiClient.post('/api/auth/change-password', {
        currentPassword: data.current_password,
        newPassword: data.new_password,
      });
      return response.data;
    },
    onSuccess: () => {
      reset();
      Alert.alert('Success', 'Your password has been updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update password.');
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Security' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Security Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield size={32} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.headerTitle}>Account Security</Text>
            <Text style={styles.headerSubtitle}>
              Keep your account secure by using a strong password
            </Text>
          </View>

          {/* Change Password Form */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Change Password" />
              <CardContent>
                <Controller
                  control={control}
                  name="current_password"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.passwordField}>
                      <Input
                        label="Current Password"
                        placeholder="Enter current password"
                        secureTextEntry={!showCurrentPassword}
                        value={value}
                        onChangeText={onChange}
                        error={errors.current_password?.message}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="new_password"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.passwordField}>
                      <Input
                        label="New Password"
                        placeholder="Enter new password"
                        secureTextEntry={!showNewPassword}
                        value={value}
                        onChangeText={onChange}
                        error={errors.new_password?.message}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="confirm_password"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.passwordField}>
                      <Input
                        label="Confirm New Password"
                        placeholder="Confirm new password"
                        secureTextEntry={!showConfirmPassword}
                        value={value}
                        onChangeText={onChange}
                        error={errors.confirm_password?.message}
                      />
                    </View>
                  )}
                />

                <View style={styles.passwordTips}>
                  <Text style={styles.tipsTitle}>Password requirements:</Text>
                  <Text style={styles.tipText}>• At least 8 characters long</Text>
                  <Text style={styles.tipText}>• Include uppercase and lowercase letters</Text>
                  <Text style={styles.tipText}>• Include at least one number</Text>
                  <Text style={styles.tipText}>• Include at least one special character</Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Security Info */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Security Tips" />
              <CardContent>
                <View style={styles.tipRow}>
                  <Lock size={20} color={colors.gray[500]} />
                  <Text style={styles.tipDescription}>
                    Never share your password with anyone. SuberCraftex will never ask for your password.
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Shield size={20} color={colors.gray[500]} />
                  <Text style={styles.tipDescription}>
                    Use a unique password that you don't use for other accounts.
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.bottomAction}>
          <Button
            title="Update Password"
            onPress={handleSubmit(onSubmit)}
            loading={updatePasswordMutation.isPending}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  section: {
    padding: spacing.lg,
  },
  passwordField: {
    marginBottom: spacing.md,
  },
  passwordTips: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tipDescription: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
