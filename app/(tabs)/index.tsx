import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Star, Clock, MapPin } from 'lucide-react-native';
import { Card, CardContent, Badge, Countdown } from '@/components/ui';
import { productsApi } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { bannersApi, HeroBanner } from '@/api/banners';
import { getUpcomingServices } from '@/api/upcoming-services';
import { UpcomingService } from '@/types';
import { formatCurrency, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - spacing.xl * 2 - spacing.md) / 2;
const SLIDER_HEIGHT = 200;

export default function HomeScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<FlatList>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: bannersApi.getAll,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'parent', 'withChildren'],
    queryFn: () => categoriesApi.getAll({ parentOnly: true, includeChildren: true }),
  });

  const { data: featuredProducts, isLoading: featuredLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getAll({ featured: true, limit: 6 }),
  });

  const { data: newArrivals, isLoading: newArrivalsLoading } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => productsApi.getAll({ sortBy: 'createdAt', sortOrder: 'desc', limit: 6 }),
  });

  const { data: upcomingServicesData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcoming-services'],
    queryFn: getUpcomingServices,
  });

  // Auto-play slider
  useEffect(() => {
    if (banners && banners.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setActiveSlide((prev) => {
          const nextSlide = (prev + 1) % banners.length;
          sliderRef.current?.scrollToIndex({ index: nextSlide, animated: true });
          return nextSlide;
        });
      }, 5000);
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [banners]);

  const onSliderScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== activeSlide) {
      setActiveSlide(slideIndex);
    }
  };

  const handleBannerPress = (banner: HeroBanner) => {
    if (banner.cta_link) {
      // Handle internal navigation
      if (banner.cta_link.startsWith('/')) {
        router.push(banner.cta_link as any);
      }
    }
  };

  const renderBannerItem = ({ item }: { item: HeroBanner }) => (
    <TouchableOpacity
      style={styles.sliderItem}
      onPress={() => handleBannerPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.mobile_image_url || item.image_url }}
        style={styles.sliderImage}
        resizeMode="cover"
      />
      <View style={[styles.sliderOverlay, { backgroundColor: item.background_color + '80' }]}>
        <Text style={[styles.sliderTitle, { color: item.text_color }]}>{item.title}</Text>
        {item.subtitle && (
          <Text style={[styles.sliderSubtitle, { color: item.text_color }]}>{item.subtitle}</Text>
        )}
        {item.cta_text && (
          <View style={styles.sliderCta}>
            <Text style={styles.sliderCtaText}>{item.cta_text}</Text>
            <ChevronRight size={16} color={colors.primary.DEFAULT} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item }: { item: any }) => {
    // Handle both snake_case and camelCase field names from API
    const featuredImage = item.featured_image || item.featuredImage;
    const productImage = getImageUrl(featuredImage || item.images?.[0]);
    const compareAtPrice = item.compare_at_price || item.compareAtPrice;
    const avgRating = item.average_rating || item.averageRating || 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {productImage ? (
            <Image
              source={{ uri: productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {compareAtPrice && compareAtPrice > item.price && (
          <Badge
            label="Sale"
            variant="error"
            size="sm"
            style={styles.saleBadge}
          />
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>
            {formatCurrency(item.price)}
          </Text>
          {compareAtPrice && compareAtPrice > item.price && (
            <Text style={styles.comparePrice}>
              {formatCurrency(compareAtPrice)}
            </Text>
          )}
        </View>
        {avgRating > 0 && (
          <View style={styles.ratingContainer}>
            <Star size={12} color={colors.warning} fill={colors.warning} />
            <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Slider */}
        {bannersLoading ? (
          <View style={styles.sliderLoading}>
            <ActivityIndicator color={colors.primary.DEFAULT} size="large" />
          </View>
        ) : banners && banners.length > 0 ? (
          <View style={styles.sliderContainer}>
            <FlatList
              ref={sliderRef}
              data={banners}
              renderItem={renderBannerItem}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onSliderScroll}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />
            {banners.length > 1 && (
              <View style={styles.pagination}>
                {banners.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === activeSlide && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.heroBanner}>
            <Text style={styles.heroTitle}>Welcome to SuberCraftex</Text>
            <Text style={styles.heroSubtitle}>
              Premium sublimation products & custom printing services
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/(tabs)/catalog')}
            >
              <Text style={styles.heroButtonText}>Shop Now</Text>
              <ChevronRight size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {categoriesLoading ? (
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories?.map((category: any) => {
                const imageUrl = getImageUrl(category.imageUrl);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => router.push({
                      pathname: '/(tabs)/catalog',
                      params: { categoryId: category.id },
                    })}
                  >
                    <View style={styles.categoryImageContainer}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.categoryImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.categoryPlaceholder} />
                      )}
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {category.name}
                    </Text>
                    {category.productCount > 0 && (
                      <Text style={styles.categoryCount}>
                        {category.productCount} items
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => router.push({
              pathname: '/(tabs)/catalog',
              params: { featured: 'true' },
            })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {featuredLoading ? (
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loader} />
          ) : (
            <View style={styles.productsGrid}>
              {featuredProducts?.products?.map((item: any) => (
                <View key={item.id} style={{ width: PRODUCT_CARD_WIDTH }}>
                  {renderProductCard({ item })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* New Arrivals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <TouchableOpacity onPress={() => router.push({
              pathname: '/(tabs)/catalog',
              params: { sortBy: 'createdAt' },
            })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {newArrivalsLoading ? (
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loader} />
          ) : (
            <View style={styles.productsGrid}>
              {newArrivals?.products?.map((item: any) => (
                <View key={item.id} style={{ width: PRODUCT_CARD_WIDTH }}>
                  {renderProductCard({ item })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Coming Up Section - Exciting Design */}
        <View style={styles.comingUpSection}>
          <View style={styles.comingUpHeader}>
            <View style={styles.comingUpTitleRow}>
              <View style={styles.comingUpIconBadge}>
                <Clock size={16} color={colors.white} />
              </View>
              <View>
                <Text style={styles.comingUpTitle}>Coming Soon</Text>
                <Text style={styles.comingUpSubtitle}>Don't miss out!</Text>
              </View>
            </View>
            {upcomingServicesData?.data && upcomingServicesData.data.length > 0 && (
              <TouchableOpacity
                style={styles.comingUpSeeAll}
                onPress={() => router.push('/upcoming-services' as any)}
              >
                <Text style={styles.comingUpSeeAllText}>See All</Text>
                <ChevronRight size={16} color={colors.primary.DEFAULT} />
              </TouchableOpacity>
            )}
          </View>
          {upcomingLoading ? (
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loader} />
          ) : upcomingServicesData?.data && upcomingServicesData.data.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.comingUpScroll}
            >
              {upcomingServicesData.data.slice(0, 5).map((service: UpcomingService) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.comingUpCard}
                  onPress={() => router.push(`/upcoming-services/${service.id}` as any)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: service.image_url }}
                    style={styles.comingUpCardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.comingUpCardGradient}>
                    <View style={styles.comingUpCardBadge}>
                      <Clock size={10} color={colors.white} />
                      <Countdown targetDate={service.service_date} size="small" />
                    </View>
                    <View style={styles.comingUpCardContent}>
                      <Text style={styles.comingUpCardTitle} numberOfLines={2}>
                        {service.title}
                      </Text>
                      {service.location && (
                        <View style={styles.comingUpCardLocation}>
                          <MapPin size={10} color={colors.white} />
                          <Text style={styles.comingUpCardLocationText} numberOfLines={1}>
                            {service.location}
                          </Text>
                        </View>
                      )}
                      {service.price && (
                        <Text style={styles.comingUpCardPrice}>
                          Starting at {formatCurrency(service.price)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.comingUpCardShine} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyUpcomingCard}>
              <View style={styles.emptyUpcomingIconCircle}>
                <Clock size={28} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.emptyUpcomingTitle}>Stay Tuned!</Text>
              <Text style={styles.emptyUpcomingText}>
                Exciting new services are coming soon.
              </Text>
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
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  // Slider styles
  sliderContainer: {
    height: SLIDER_HEIGHT,
    position: 'relative',
  },
  sliderLoading: {
    height: SLIDER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  sliderItem: {
    width: width,
    height: SLIDER_HEIGHT,
    position: 'relative',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
  },
  sliderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  sliderTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  sliderSubtitle: {
    fontSize: fontSize.sm,
    opacity: 0.9,
    marginBottom: spacing.md,
  },
  sliderCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  sliderCtaText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
    marginRight: spacing.xs,
  },
  pagination: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    opacity: 0.5,
  },
  paginationDotActive: {
    opacity: 1,
    width: 24,
  },
  // Fallback hero banner
  heroBanner: {
    backgroundColor: colors.primary.DEFAULT,
    padding: spacing.xl,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl * 1.5,
  },
  heroTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.lg,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
    marginRight: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  categoriesScroll: {
    paddingRight: spacing.xl,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryImageContainer: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
    marginBottom: spacing.xs,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[200],
  },
  categoryName: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    textAlign: 'center',
    maxWidth: 70,
  },
  categoryCount: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 2,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray[100],
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[200],
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
  },
  saleBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  productInfo: {
    padding: spacing.sm,
  },
  productName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  productPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  comparePrice: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  // Coming Up Section - Exciting Design
  comingUpSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary[900],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  comingUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  comingUpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  comingUpIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingUpTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  comingUpSubtitle: {
    fontSize: fontSize.xs,
    color: colors.primary[200],
    marginTop: 1,
  },
  comingUpSeeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  comingUpSeeAllText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  comingUpScroll: {
    paddingRight: spacing.xl,
  },
  comingUpCard: {
    width: 150,
    height: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  comingUpCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  comingUpCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  comingUpCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  comingUpCardContent: {
    justifyContent: 'flex-end',
  },
  comingUpCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
    lineHeight: 18,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  comingUpCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  comingUpCardLocationText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  comingUpCardPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary[200],
  },
  comingUpCardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    opacity: 0.3,
  },
  // Empty upcoming services state
  emptyUpcomingCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  emptyUpcomingIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyUpcomingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  emptyUpcomingText: {
    fontSize: fontSize.sm,
    color: colors.primary[200],
    textAlign: 'center',
  },
});
