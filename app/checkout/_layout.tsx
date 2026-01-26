import { Stack } from 'expo-router';

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackVisible: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Checkout',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="shipping"
        options={{
          headerTitle: 'Add Address',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerTitle: 'Payment',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="confirmation"
        options={{
          headerTitle: 'Order Confirmed',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
