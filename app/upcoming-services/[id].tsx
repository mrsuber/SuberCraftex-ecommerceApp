import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Calendar, Clock, DollarSign } from 'lucide-react-native';
import { Card, CardContent, Button, Countdown } from '@/components/ui';
import { getUpcomingServiceById } from '@/api/upcoming-services';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function UpcomingServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['upcoming-service', id],
    queryFn: () => getUpcomingServiceById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Loading...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Not Found',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Service not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <ChevronLeft size={24} color={colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: service.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.badge}>
              <Clock size={12} color={colors.primary.DEFAULT} />
              <Text style={styles.badgeText}>Coming Soon</Text>
            </View>
            <Text style={styles.title}>{service.title}</Text>
            {service.short_description && (
              <Text style={styles.subtitle}>{service.short_description}</Text>
            )}
          </View>

          {/* Countdown Timer */}
          <Card style={styles.countdownCard}>
            <CardContent style={styles.countdownContent}>
              <Text style={styles.countdownLabel}>Launching In</Text>
              <Countdown targetDate={service.service_date} size="large" />
            </CardContent>
          </Card>

          {/* Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Calendar size={20} color={colors.primary.DEFAULT} />
              <View>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(service.service_date), 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={styles.detailSubValue}>
                  {format(new Date(service.service_date), 'h:mm a')}
                </Text>
              </View>
            </View>

            {service.location && (
              <View style={styles.detailItem}>
                <MapPin size={20} color={colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{service.location}</Text>
                </View>
              </View>
            )}

            {service.price && (
              <View style={styles.detailItem}>
                <DollarSign size={20} color={colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.detailLabel}>Expected Price</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(service.price)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          {service.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About This Service</Text>
              <Card>
                <CardContent>
                  <Text style={styles.description}>{service.description}</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Related Service */}
          {service.service && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>Related Service</Text>
              <TouchableOpacity
                style={styles.relatedCard}
                onPress={() => router.push(`/service/${service.service!.id}`)}
              >
                {service.service.featured_image && (
                  <Image
                    source={{ uri: service.service.featured_image }}
                    style={styles.relatedImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedName}>{service.service.name}</Text>
                  <Text style={styles.relatedLink}>View Service</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerBackButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    textAlign: 'center',
  },
  heroContainer: {
    width: width,
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    marginTop: -spacing.xl,
    backgroundColor: colors.gray[50],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    lineHeight: 24,
  },
  countdownCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  countdownContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  countdownLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  detailsSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  detailSubValue: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  priceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    lineHeight: 24,
  },
  relatedSection: {
    marginBottom: spacing.lg,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  relatedImage: {
    width: 80,
    height: 80,
  },
  relatedInfo: {
    flex: 1,
    padding: spacing.md,
  },
  relatedName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  relatedLink: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
});
