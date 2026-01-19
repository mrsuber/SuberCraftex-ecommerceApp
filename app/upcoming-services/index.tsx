import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Calendar, Clock } from 'lucide-react-native';
import { Card, CardContent, Countdown } from '@/components/ui';
import { getUpcomingServices } from '@/api/upcoming-services';
import { UpcomingService } from '@/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';

export default function UpcomingServicesScreen() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['upcoming-services'],
    queryFn: getUpcomingServices,
  });

  const renderItem = ({ item }: { item: UpcomingService }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/upcoming-services/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.countdownBadge}>
          <Countdown targetDate={item.service_date} size="small" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.short_description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.short_description}
          </Text>
        )}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.gray[500]} />
            <Text style={styles.metaText}>
              {format(new Date(item.service_date), 'MMM d, yyyy')}
            </Text>
          </View>
          {item.location && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.gray[500]} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>
        {item.price && (
          <Text style={styles.cardPrice}>
            {formatCurrency(item.price)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Coming Soon',
          headerTitleStyle: {
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.lg,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load upcoming services</Text>
        </View>
      ) : data?.data && data.data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock size={48} color={colors.gray[400]} />
          <Text style={styles.emptyTitle}>No Upcoming Services</Text>
          <Text style={styles.emptyText}>
            Check back soon for exciting new services!
          </Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  countdownBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  cardPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    marginTop: spacing.md,
  },
});
