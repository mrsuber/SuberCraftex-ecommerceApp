import { Stack } from 'expo-router';

export default function OrdersLayout() {
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
          headerTitle: 'My Orders',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Order Details',
        }}
      />
    </Stack>
  );
}
