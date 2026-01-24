import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Check, Truck, Zap, Clock, ArrowLeft } from 'lucide-react-native';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { SavedAddress, ShippingMethod } from '@/types';

const addressSchema = z.object({
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

const SHIPPING_OPTIONS: { method: ShippingMethod; label: string; description: string; price: number; icon: any }[] = [
  {
    method: 'standard',
    label: 'Standard Delivery',
    description: '3-5 business days',
    price: 2500,
    icon: Truck,
  },
  {
    method: 'express',
    label: 'Express Delivery',
    description: '1-2 business days',
    price: 5000,
    icon: Zap,
  },
  {
    method: 'in_store',
    label: 'Store Pickup',
    description: 'Pick up from our store',
    price: 0,
    icon: MapPin,
  },
];

export default function ShippingScreen() {
  const router = useRouter();
  const { getTotalPrice } = useCartStore();
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod>('standard');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
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
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: 'Nigeria',
    },
  });

  const subtotal = getTotalPrice();
  const shippingCost = SHIPPING_OPTIONS.find((o) => o.method === selectedMethod)?.price || 0;
  const total = subtotal + shippingCost;

  const handleContinue = () => {
    if (selectedMethod !== 'in_store' && !selectedAddress && !showAddressForm) {
      Alert.alert('Address Required', 'Please select or add a shipping address.');
      return;
    }

    // Navigate to payment with shipping info
    router.push({
      pathname: '/checkout/payment',
      params: {
        addressId: selectedAddress?.id,
        shippingMethod: selectedMethod,
        shippingCost: shippingCost.toString(),
      },
    });
  };

  const handleAddAddress = async (data: AddressFormData) => {
    try {
      console.log('Creating address with data:', data);
      const response = await apiClient.post(API_ENDPOINTS.addresses.create, data);
      console.log('Address created:', response.data);
      setSelectedAddress(response.data);
      setShowAddressForm(false);
      reset();
      Alert.alert('Success', 'Address saved successfully', [
        {
          text: 'OK',
          onPress: () => router.back(), // Go back to checkout
        },
      ]);
    } catch (error: any) {
      console.error('Error creating address:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error ||
        (Array.isArray(error.response?.data?.error)
          ? error.response?.data?.error.map((e: any) => e.message).join(', ')
          : 'Failed to add address');
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Shipping',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Shipping Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Method</Text>
          {SHIPPING_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.method}
                style={[
                  styles.optionCard,
                  selectedMethod === option.method && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedMethod(option.method)}
              >
                <View style={styles.optionIcon}>
                  <Icon size={24} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <View style={styles.optionRight}>
                  <Text style={styles.optionPrice}>
                    {option.price === 0 ? 'Free' : formatCurrency(option.price)}
                  </Text>
                  <View
                    style={[
                      styles.radioButton,
                      selectedMethod === option.method && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedMethod === option.method && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Shipping Address */}
        {selectedMethod !== 'in_store' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>

            {/* Saved Addresses */}
            {addresses.map((address: any) => {
              // Handle both camelCase (from API) and snake_case field names
              const fullName = address.fullName || address.full_name;
              const addressLine1 = address.addressLine1 || address.address_line1;
              const addressLine2 = address.addressLine2 || address.address_line2;
              const postalCode = address.postalCode || address.postal_code;

              return (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressCard,
                    selectedAddress?.id === address.id && styles.addressCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedAddress(address);
                    setShowAddressForm(false);
                  }}
                >
                  <View style={styles.addressContent}>
                    <Text style={styles.addressName}>{fullName}</Text>
                    <Text style={styles.addressText}>
                      {addressLine1}
                      {addressLine2 ? `, ${addressLine2}` : ''}
                    </Text>
                    <Text style={styles.addressText}>
                      {address.city}, {address.state} {postalCode}
                    </Text>
                    <Text style={styles.addressText}>{address.phone}</Text>
                  </View>
                  {selectedAddress?.id === address.id && (
                    <View style={styles.checkIcon}>
                      <Check size={20} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Add New Address Button */}
            {!showAddressForm && (
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={() => {
                  setShowAddressForm(true);
                  setSelectedAddress(null);
                }}
              >
                <Plus size={20} color={colors.primary.DEFAULT} />
                <Text style={styles.addAddressText}>Add New Address</Text>
              </TouchableOpacity>
            )}

            {/* Address Form */}
            {showAddressForm && (
              <Card style={styles.addressForm} variant="outlined">
                <CardContent>
                  <Text style={styles.formTitle}>New Address</Text>

                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Full Name"
                        placeholder="Enter full name"
                        value={value}
                        onChangeText={onChange}
                        error={errors.fullName?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Phone Number"
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                        value={value}
                        onChangeText={onChange}
                        error={errors.phone?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="addressLine1"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Address Line 1"
                        placeholder="Street address"
                        value={value}
                        onChangeText={onChange}
                        error={errors.addressLine1?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="addressLine2"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Address Line 2 (Optional)"
                        placeholder="Apartment, suite, etc."
                        value={value}
                        onChangeText={onChange}
                      />
                    )}
                  />

                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
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
                    <View style={styles.formHalf}>
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

                  <Controller
                    control={control}
                    name="postalCode"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Postal Code"
                        placeholder="Postal code"
                        value={value}
                        onChangeText={onChange}
                        error={errors.postalCode?.message}
                      />
                    )}
                  />

                  <View style={styles.formActions}>
                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={() => {
                        setShowAddressForm(false);
                        reset();
                      }}
                    />
                    <Button
                      title="Save Address"
                      onPress={handleSubmit(handleAddAddress)}
                    />
                  </View>
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <Card variant="outlined">
            <CardContent>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <Button
          title="Continue to Payment"
          onPress={handleContinue}
          fullWidth
          size="lg"
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
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  optionPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  addressCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  addressCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  addressContent: {
    flex: 1,
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
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addAddressText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  addressForm: {
    marginTop: spacing.md,
  },
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  summaryTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  bottomAction: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
