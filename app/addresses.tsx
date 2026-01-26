import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { Button, Input, Card, CardContent, Badge } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { SavedAddress } from '@/types';

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone is required'),
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressesScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.addresses.list);
      return response.data as SavedAddress[];
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Nigeria',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiClient.post(API_ENDPOINTS.addresses.create, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
      reset();
      Alert.alert('Success', 'Address saved successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save address.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const response = await apiClient.put(API_ENDPOINTS.addresses.update(id), data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
      setEditingAddress(null);
      reset();
      Alert.alert('Success', 'Address updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update address.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.addresses.remove(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      Alert.alert('Success', 'Address deleted successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete address.');
    },
  });

  const handleEdit = (address: SavedAddress) => {
    setEditingAddress(address);
    setValue('label', address.label || '');
    setValue('fullName', address.fullName);
    setValue('phone', address.phone);
    setValue('addressLine1', address.addressLine1);
    setValue('addressLine2', address.addressLine2 || '');
    setValue('city', address.city);
    setValue('state', address.state);
    setValue('postalCode', address.postalCode);
    setValue('country', address.country);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  const onSubmit = (data: AddressFormData) => {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const renderAddress = ({ item }: { item: SavedAddress }) => (
    <Card style={styles.addressCard} variant="outlined">
      <CardContent style={styles.addressContent}>
        <View style={styles.addressHeader}>
          <View style={styles.addressLabelRow}>
            {item.label && <Text style={styles.addressLabel}>{item.label}</Text>}
            {item.isDefault && <Badge label="Default" variant="success" size="sm" />}
          </View>
          <View style={styles.addressActions}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
              <Edit2 size={18} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.addressName}>{item.fullName}</Text>
        <Text style={styles.addressText}>{item.addressLine1}</Text>
        {item.addressLine2 && <Text style={styles.addressText}>{item.addressLine2}</Text>}
        <Text style={styles.addressText}>
          {item.city}, {item.state} {item.postalCode}
        </Text>
        <Text style={styles.addressPhone}>{item.phone}</Text>
      </CardContent>
    </Card>
  );

  const renderForm = () => (
    <KeyboardAvoidingView
      style={styles.formWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formTitle}>
          {editingAddress ? 'Edit Address' : 'Add New Address'}
        </Text>

        <Controller
          control={control}
          name="label"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Label (e.g., Home, Work)"
              placeholder="Home"
              value={value}
              onChangeText={onChange}
              error={errors.label?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Full Name"
              placeholder="Enter full name"
              value={value}
              onChangeText={onChange}
              error={errors.full_name?.message}
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

        <Controller
          control={control}
          name="address_line1"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Address Line 1"
              placeholder="Street address"
              value={value}
              onChangeText={onChange}
              error={errors.address_line1?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="address_line2"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Address Line 2 (Optional)"
              placeholder="Apartment, suite, etc."
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="City"
                  placeholder="City"
                  value={value}
                  onChangeText={onChange}
                  error={errors.city?.message}
                />
              )}
            />
          </View>
          <View style={styles.halfInput}>
            <Controller
              control={control}
              name="state"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="State"
                  placeholder="State"
                  value={value}
                  onChangeText={onChange}
                  error={errors.state?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Controller
              control={control}
              name="postal_code"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Postal Code"
                  placeholder="100001"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  error={errors.postal_code?.message}
                />
              )}
            />
          </View>
          <View style={styles.halfInput}>
            <Controller
              control={control}
              name="country"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Country"
                  placeholder="Nigeria"
                  value={value}
                  onChangeText={onChange}
                  error={errors.country?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.formActions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => {
              setShowForm(false);
              setEditingAddress(null);
              reset();
            }}
            style={styles.cancelButton}
          />
          <Button
            title={editingAddress ? 'Update' : 'Save'}
            onPress={handleSubmit(onSubmit)}
            loading={createMutation.isPending || updateMutation.isPending}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MapPin size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>No addresses saved</Text>
      <Text style={styles.emptyText}>Add a shipping address to speed up checkout.</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Addresses' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : showForm ? (
          renderForm()
        ) : (
          <>
            <FlatList
              data={addresses}
              renderItem={renderAddress}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmpty}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.bottomAction}>
              <Button
                title="Add New Address"
                onPress={() => {
                  reset();
                  setEditingAddress(null);
                  setShowForm(true);
                }}
                fullWidth
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  addressCard: {
    marginBottom: spacing.md,
  },
  addressContent: {
    padding: spacing.md,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addressLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  addressActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  addressName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  formWrapper: {
    flex: 1,
  },
  formScrollView: {
    flex: 1,
  },
  formContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
