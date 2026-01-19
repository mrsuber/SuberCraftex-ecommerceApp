import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Package,
  Calendar,
  MapPin,
  Heart,
  Settings,
  TrendingUp,
  LogOut,
  ChevronRight,
  Shield,
  Scissors,
} from 'lucide-react-native';
import { Card, CardContent, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, showBadge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemIcon}>{icon}</View>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color={colors.gray[400]} />
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loginPromptContainer}>
          <User size={80} color={colors.gray[300]} />
          <Text style={styles.loginPromptTitle}>Welcome to SuberCraftex</Text>
          <Text style={styles.loginPromptText}>
            Sign in to view your orders, manage your account, and access investor features.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
            size="lg"
            style={styles.loginButton}
          />
          <Button
            title="Create Account"
            variant="outline"
            onPress={() => router.push('/(auth)/register')}
            fullWidth
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Orders & Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orders & Bookings</Text>
          <Card variant="outlined">
            <MenuItem
              icon={<Package size={22} color={colors.primary.DEFAULT} />}
              title="My Orders"
              subtitle="View order history and track shipments"
              onPress={() => router.push('/orders')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Calendar size={22} color={colors.primary.DEFAULT} />}
              title="My Bookings"
              subtitle="Service bookings and appointments"
              onPress={() => router.push('/bookings')}
            />
          </Card>
        </View>

        {/* Shopping */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping</Text>
          <Card variant="outlined">
            <MenuItem
              icon={<Heart size={22} color={colors.primary.DEFAULT} />}
              title="Wishlist"
              subtitle="Products you've saved"
              onPress={() => router.push('/wishlist')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<MapPin size={22} color={colors.primary.DEFAULT} />}
              title="Addresses"
              subtitle="Manage delivery addresses"
              onPress={() => router.push('/addresses')}
            />
          </Card>
        </View>

        {/* Tailor Portal - Only show for tailors */}
        {user?.role === 'tailor' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tailor Portal</Text>
            <Card variant="outlined">
              <MenuItem
                icon={<Scissors size={22} color={colors.primary.DEFAULT} />}
                title="Tailor Dashboard"
                subtitle="Manage bookings and progress updates"
                onPress={() => router.push('/(tailor)')}
              />
            </Card>
          </View>
        )}

        {/* Investor Portal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investor Portal</Text>
          <Card variant="outlined">
            <MenuItem
              icon={<TrendingUp size={22} color={colors.primary.DEFAULT} />}
              title="Investor Dashboard"
              subtitle={user?.role === 'investor' ? 'View your investments' : 'Become an investor'}
              onPress={() => {
                if (user?.role === 'investor') {
                  router.push('/(investor)/dashboard');
                } else {
                  router.push('/(investor)/register');
                }
              }}
            />
          </Card>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card variant="outlined">
            <MenuItem
              icon={<User size={22} color={colors.primary.DEFAULT} />}
              title="Profile Settings"
              subtitle="Update your personal information"
              onPress={() => router.push('/profile')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Shield size={22} color={colors.primary.DEFAULT} />}
              title="Security"
              subtitle="Password and login settings"
              onPress={() => router.push('/security')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Settings size={22} color={colors.primary.DEFAULT} />}
              title="Preferences"
              subtitle="Notifications and app settings"
              onPress={() => router.push('/preferences')}
            />
          </Card>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Logout"
            variant="outline"
            leftIcon={<LogOut size={18} color={colors.error} />}
            onPress={handleLogout}
            fullWidth
            style={styles.logoutButton}
          />
        </View>

        <Text style={styles.versionText}>SuberCraftex v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loginPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loginPromptTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  loginPromptText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  loginButton: {
    marginBottom: spacing.md,
  },
  profileHeader: {
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
  avatarText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  menuItemSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: 68,
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.gray[400],
    paddingBottom: spacing.xl,
  },
});
