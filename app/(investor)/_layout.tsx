import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, fontWeight } from '@/config/theme';

export default function InvestorLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitleStyle: {
          fontWeight: fontWeight.semibold,
        },
        headerShadowVisible: false,
        headerBackVisible: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="register"
        options={{
          headerTitle: 'Become an Investor',
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
      <Stack.Screen
        name="verify"
        options={{
          headerTitle: 'KYC Verification',
        }}
      />
      <Stack.Screen
        name="agreement"
        options={{
          headerTitle: 'Investment Agreement',
        }}
      />
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
