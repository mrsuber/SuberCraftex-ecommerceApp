import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import {
  User,
  Shield,
  Bell,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  Building,
  MessageSquare,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, Badge, Button } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Investor } from '@/types';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BaseMenuItem {
  icon: LucideIcon;
  label: string;
}

interface PressMenuItem extends BaseMenuItem {
  type: 'press';
  onPress: () => void;
  badge?: string;
  badgeVariant?: BadgeVariant;
}

interface ToggleMenuItem extends BaseMenuItem {
  type: 'toggle';
  value: boolean;
  onToggle: (value: boolean) => void;
}

type MenuItem = PressMenuItem | ToggleMenuItem;

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function InvestorSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  const { data: investor } = useQuery({
    queryKey: ['investor', 'me'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.investor.me);
      return response.data as Investor;
    },
  });

  // Handle both camelCase (API) and snake_case (types)
  const inv = investor as any;
  const kycStatus = inv?.kycStatus || inv?.kyc_status;
  const investorNumber = inv?.investorNumber || inv?.investor_number;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const getKycBadgeVariant = (): BadgeVariant => {
    switch (kycStatus) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        {
          type: 'press',
          icon: User,
          label: 'Personal Information',
          onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available soon.'),
        },
        {
          type: 'press',
          icon: Shield,
          label: 'KYC Verification',
          badge: kycStatus,
          badgeVariant: getKycBadgeVariant(),
          onPress: () => {
            if (kycStatus !== 'approved') {
              router.push('/(investor)/verify');
            }
          },
        },
        {
          type: 'press',
          icon: Building,
          label: 'Bank Details',
          onPress: () => Alert.alert('Coming Soon', 'Bank details management will be available soon.'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          type: 'toggle',
          icon: Bell,
          label: 'Push Notifications',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          type: 'toggle',
          icon: Mail,
          label: 'Email Updates',
          value: emailUpdates,
          onToggle: setEmailUpdates,
        },
      ],
    },
    {
      title: 'Feedback & Support',
      items: [
        {
          type: 'press',
          icon: MessageSquare,
          label: 'Send Feedback',
          onPress: () => router.push('/(investor)/dashboard/feedback'),
        },
        {
          type: 'press',
          icon: HelpCircle,
          label: 'Help & Support',
          onPress: () => Alert.alert('Support', 'Contact support at support@subercraftex.com'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          type: 'press',
          icon: FileText,
          label: 'Investment Agreement',
          onPress: () => router.push('/(investor)/agreement'),
        },
        {
          type: 'press',
          icon: FileText,
          label: 'Terms & Conditions',
          onPress: () => Alert.alert('Terms', 'Terms and conditions will open in browser.'),
        },
      ],
    },
  ];

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Settings' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Investor Info Card */}
          <View style={styles.section}>
            <Card variant="elevated">
              <CardContent style={styles.profileContent}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {investor?.user?.full_name?.charAt(0)?.toUpperCase() || investor?.full_name?.charAt(0)?.toUpperCase() || 'I'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {investor?.user?.full_name || investor?.full_name || 'Investor'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {investor?.user?.email || investor?.email}
                  </Text>
                  <Text style={styles.investorNumber}>
                    Investor #{investorNumber}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Contact Information" />
              <CardContent>
                <View style={styles.contactRow}>
                  <Mail size={18} color={colors.gray[500]} />
                  <Text style={styles.contactText}>
                    {investor?.user?.email || investor?.email || 'No email'}
                  </Text>
                </View>
                <View style={styles.contactRow}>
                  <Phone size={18} color={colors.gray[500]} />
                  <Text style={styles.contactText}>
                    {investor?.user?.phone || investor?.phone || 'No phone number'}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Card variant="outlined">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isToggle = item.type === 'toggle';
                  const isPressItem = item.type === 'press';

                  return (
                    <TouchableOpacity
                      key={itemIndex}
                      style={[
                        styles.menuItem,
                        itemIndex < section.items.length - 1 && styles.menuItemBorder,
                      ]}
                      onPress={isPressItem ? item.onPress : undefined}
                      disabled={isToggle}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={styles.menuIcon}>
                          <Icon size={20} color={colors.gray[600]} />
                        </View>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                      </View>
                      <View style={styles.menuItemRight}>
                        {isPressItem && item.badge && (
                          <Badge
                            label={item.badge}
                            variant={item.badgeVariant || 'default'}
                            size="sm"
                          />
                        )}
                        {isToggle ? (
                          <Switch
                            value={item.value}
                            onValueChange={item.onToggle}
                            trackColor={{
                              false: colors.gray[200],
                              true: colors.primary.DEFAULT,
                            }}
                          />
                        ) : (
                          <ChevronRight size={18} color={colors.gray[400]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            </View>
          ))}

          {/* Logout Button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color={colors.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>SuberCraftex Investor App</Text>
            <Text style={styles.versionNumber}>Version 1.0.0</Text>
          </View>
        </ScrollView>
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
    paddingBottom: 0,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  investorNumber: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  versionSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  versionText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
  },
  versionNumber: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 2,
  },
});
