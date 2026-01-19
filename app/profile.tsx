import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from 'lucide-react-native';
import { Button, Input, Card, CardContent, CardHeader } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiClient.put('/api/auth/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Alert.alert('Success', 'Profile updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile.');
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Profile' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              {user?.avatar_url ? (
                <View style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          {/* Profile Form */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Personal Information" />
              <CardContent>
                <Controller
                  control={control}
                  name="full_name"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={value}
                      onChangeText={onChange}
                      error={errors.full_name?.message}
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
                      placeholder="+234 800 000 0000"
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={onChange}
                      error={errors.phone?.message}
                    />
                  )}
                />
              </CardContent>
            </Card>
          </View>

          {/* Account Info */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Account Details" />
              <CardContent>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Account Type</Text>
                  <Text style={styles.infoValue}>{user?.role || 'Customer'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.bottomAction}>
          <Button
            title="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={updateMutation.isPending}
            disabled={!isDirty}
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  section: {
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    textTransform: 'capitalize',
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
