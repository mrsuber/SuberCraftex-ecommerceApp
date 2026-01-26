import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import SplashScreen from '@/components/SplashScreen';

// Prevent the native splash screen from auto-hiding
ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AuthRedirect() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTailorGroup = segments[0] === '(tailor)';
    const inInvestorGroup = segments[0] === '(investor)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect based on user role after login
      const role = user?.role;

      if (role === 'tailor') {
        router.replace('/(tailor)');
      } else if (role === 'investor') {
        router.replace('/(investor)');
      } else {
        // Drivers, customers, admins all go to main tabs
        // Drivers will see "Delivery Management" option in Account screen
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  return null;
}

function RootLayoutNav() {
  const { checkAuth } = useAuthStore();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Check authentication status
        await checkAuth();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(investor)" />
        <Stack.Screen
          name="checkout"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="service/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="addresses"
          options={{
            headerShown: true,
            headerTitle: 'Addresses',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="bookings/index"
          options={{
            headerShown: true,
            headerTitle: 'My Bookings',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="bookings/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Booking Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="delivery"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="(tailor)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the native expo splash screen immediately
    ExpoSplashScreen.hideAsync();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
