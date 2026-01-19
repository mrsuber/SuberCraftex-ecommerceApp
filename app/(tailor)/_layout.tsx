import { Stack } from 'expo-router';

export default function TailorLayout() {
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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Tailor Dashboard',
        }}
      />
      <Stack.Screen
        name="bookings"
        options={{
          headerTitle: 'My Bookings',
        }}
      />
      <Stack.Screen
        name="fittings"
        options={{
          headerTitle: 'Fitting Appointments',
        }}
      />
      <Stack.Screen
        name="booking/[id]"
        options={{
          headerTitle: 'Booking Details',
        }}
      />
      <Stack.Screen
        name="progress/[bookingId]"
        options={{
          headerTitle: 'Add Progress Update',
        }}
      />
      <Stack.Screen
        name="fitting/[bookingId]"
        options={{
          headerTitle: 'Schedule Fitting',
        }}
      />
    </Stack>
  );
}
