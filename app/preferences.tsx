import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Mail, MessageSquare, Tag, Package, ChevronRight } from 'lucide-react-native';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

interface PreferenceToggle {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
}

export default function PreferencesScreen() {
  const [notificationPrefs, setNotificationPrefs] = useState<PreferenceToggle[]>([
    {
      id: 'push',
      label: 'Push Notifications',
      description: 'Receive push notifications on your device',
      icon: Bell,
      enabled: true,
    },
    {
      id: 'email',
      label: 'Email Notifications',
      description: 'Receive updates via email',
      icon: Mail,
      enabled: true,
    },
    {
      id: 'sms',
      label: 'SMS Notifications',
      description: 'Receive text messages for orders',
      icon: MessageSquare,
      enabled: false,
    },
  ]);

  const [marketingPrefs, setMarketingPrefs] = useState<PreferenceToggle[]>([
    {
      id: 'promotions',
      label: 'Promotions & Offers',
      description: 'Receive exclusive deals and discounts',
      icon: Tag,
      enabled: true,
    },
    {
      id: 'new_products',
      label: 'New Products',
      description: 'Be notified about new arrivals',
      icon: Package,
      enabled: true,
    },
  ]);

  const togglePreference = (
    prefs: PreferenceToggle[],
    setPrefs: React.Dispatch<React.SetStateAction<PreferenceToggle[]>>,
    id: string
  ) => {
    setPrefs((current) =>
      current.map((pref) =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const renderPreferenceToggle = (
    pref: PreferenceToggle,
    prefs: PreferenceToggle[],
    setPrefs: React.Dispatch<React.SetStateAction<PreferenceToggle[]>>
  ) => {
    const Icon = pref.icon;
    return (
      <View key={pref.id} style={styles.preferenceRow}>
        <View style={styles.preferenceIcon}>
          <Icon size={20} color={colors.gray[600]} />
        </View>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceLabel}>{pref.label}</Text>
          <Text style={styles.preferenceDescription}>{pref.description}</Text>
        </View>
        <Switch
          value={pref.enabled}
          onValueChange={() => togglePreference(prefs, setPrefs, pref.id)}
          trackColor={{
            false: colors.gray[200],
            true: colors.primary.DEFAULT,
          }}
        />
      </View>
    );
  };

  const handleSavePreferences = () => {
    Alert.alert('Preferences Saved', 'Your notification preferences have been updated.');
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Preferences' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Notifications Section */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Notifications" />
              <CardContent style={styles.preferencesContent}>
                {notificationPrefs.map((pref) =>
                  renderPreferenceToggle(pref, notificationPrefs, setNotificationPrefs)
                )}
              </CardContent>
            </Card>
          </View>

          {/* Marketing Section */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Marketing" />
              <CardContent style={styles.preferencesContent}>
                {marketingPrefs.map((pref) =>
                  renderPreferenceToggle(pref, marketingPrefs, setMarketingPrefs)
                )}
              </CardContent>
            </Card>
          </View>

          {/* Communication Language */}
          <View style={styles.section}>
            <Card variant="outlined">
              <CardHeader title="Language & Region" />
              <CardContent>
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => Alert.alert('Coming Soon', 'Language selection will be available soon.')}
                >
                  <View>
                    <Text style={styles.settingLabel}>Language</Text>
                    <Text style={styles.settingValue}>English</Text>
                  </View>
                  <ChevronRight size={20} color={colors.gray[400]} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => Alert.alert('Coming Soon', 'Currency selection will be available soon.')}
                >
                  <View>
                    <Text style={styles.settingLabel}>Currency</Text>
                    <Text style={styles.settingValue}>Nigerian Naira (₦)</Text>
                  </View>
                  <ChevronRight size={20} color={colors.gray[400]} />
                </TouchableOpacity>
              </CardContent>
            </Card>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              We respect your privacy. Your preferences are stored securely and you can
              change them at any time. By enabling notifications, you agree to receive
              communications from SuberCraftex.
            </Text>
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
  preferencesContent: {
    paddingVertical: 0,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  preferenceDescription: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  settingLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  settingValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginTop: 2,
  },
  privacyNote: {
    padding: spacing.lg,
  },
  privacyText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    lineHeight: 18,
    textAlign: 'center',
  },
});
