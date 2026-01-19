import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, Filter, Star, ChevronRight, X } from 'lucide-react-native';
import { Input, Badge } from '@/components/ui';
import { productsApi } from '@/api/products';
import { categoriesApi, CategoryWithChildren } from '@/api/categories';
import { formatCurrency, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - spacing.lg * 2 - spacing.sm) / 2;

export default function CatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId?: string;
    featured?: string;
    sortBy?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentCategory, setSelectedParentCategory] = useState<string | undefined>(undefined);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch parent categories with their children
  const { data: categories } = useQuery({
    queryKey: ['categories', 'withChildren'],
    queryFn: () => categoriesApi.getAll({ parentOnly: true, includeChildren: true }),
  });

  // Handle categoryId param from navigation (e.g., from home screen)
  useEffect(() => {
    if (params.categoryId && categories) {
      // Check if it's a parent category
      const isParent = categories.some(c => c.id === params.categoryId);
      if (isParent) {
        setSelectedParentCategory(params.categoryId);
        setSelectedSubCategory(undefined);
      } else {
        // It might be a subcategory, find its parent
        for (const parent of categories) {
          const isSubcategory = parent.children?.some(child => child.id === params.categoryId);
          if (isSubcategory) {
            setSelectedParentCategory(parent.id);
            setSelectedSubCategory(params.categoryId);
            break;
          }
        }
      }
    }
  }, [params.categoryId, categories]);

  // Get the selected parent category object
  const selectedParent = useMemo(() => {
    return categories?.find(c => c.id === selectedParentCategory);
  }, [categories, selectedParentCategory]);

  // Determine which category ID to use for filtering products
  const filterCategoryId = selectedSubCategory || selectedParentCategory;

  // Handle parent category selection
  const handleParentSelect = (categoryId: string | undefined) => {
    if (categoryId === selectedParentCategory) {
      // Deselect if already selected
      setSelectedParentCategory(undefined);
      setSelectedSubCategory(undefined);
    } else {
      setSelectedParentCategory(categoryId);
      setSelectedSubCategory(undefined); // Reset subcategory when parent changes
    }
  };

  // Handle subcategory selection
  const handleSubCategorySelect = (categoryId: string | undefined) => {
    if (categoryId === selectedSubCategory) {
      setSelectedSubCategory(undefined);
    } else {
      setSelectedSubCategory(categoryId);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedParentCategory(undefined);
    setSelectedSubCategory(undefined);
    setSearchQuery('');
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['products', 'list', searchQuery || '', filterCategoryId || '', params.featured || ''],
    queryFn: ({ pageParam = 1 }) =>
      productsApi.getAll({
        page: pageParam,
        limit: 10,
        search: searchQuery || undefined,
        categoryId: filterCategoryId,
        featured: params.featured === 'true' ? true : undefined,
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.products?.length < 10) return undefined;
      return pages.length + 1;
    },
    initialPageParam: 1,
    staleTime: 0, // Always refetch when filter changes
  });

  const products = data?.pages?.flatMap((page) => page.products) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderProduct = useCallback(
    ({ item }: { item: any }) => {
      // Handle both snake_case and camelCase field names from API
      const featuredImage = item.featured_image || item.featuredImage;
      const productImage = getImageUrl(featuredImage || item.images?.[0]);
      const compareAtPrice = item.compare_at_price || item.compareAtPrice;
      const inventoryCount = item.inventory_count ?? item.inventoryCount ?? 0;
      const avgRating = item.average_rating || item.averageRating || 0;
      const reviewCount = item.review_count || item.reviewCount || 0;

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
          {inventoryCount <= 0 && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            {compareAtPrice && compareAtPrice > item.price && (
              <Text style={styles.comparePrice}>
                {formatCurrency(compareAtPrice)}
              </Text>
            )}
          </View>
          {avgRating > 0 && (
            <View style={styles.ratingContainer}>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingText}>
                {avgRating.toFixed(1)} ({reviewCount})
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      );
    },
    [router]
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptyText}>
          {searchQuery
            ? 'Try a different search term'
            : 'No products available in this category'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={20} color={colors.gray[400]} />}
          containerStyle={styles.searchInput}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={colors.gray[700]} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryFilterContainer}>
        {/* Active Filter Indicator */}
        {(selectedParentCategory || selectedSubCategory || searchQuery) && (
          <View style={styles.activeFilterRow}>
            <Text style={styles.activeFilterLabel}>
              {selectedParent?.name}
              {selectedSubCategory && selectedParent?.children?.find(c => c.id === selectedSubCategory)
                ? ` > ${selectedParent.children.find(c => c.id === selectedSubCategory)?.name}`
                : ''}
              {searchQuery ? ` • "${searchQuery}"` : ''}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearFilterButton}>
              <X size={16} color={colors.gray[500]} />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Parent Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterScroll}
        >
          {categories?.map((category) => {
            const categoryImage = getImageUrl(category.imageUrl);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedParentCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() => handleParentSelect(category.id)}
              >
                {categoryImage && (
                  <Image
                    source={{ uri: categoryImage }}
                    style={styles.categoryChipImage}
                  />
                )}
                <Text
                style={[
                  styles.categoryChipText,
                  selectedParentCategory === category.id && styles.categoryChipTextActive,
                ]}
              >
                {category.name}
              </Text>
              {category.children && category.children.length > 0 && (
                <ChevronRight
                  size={14}
                  color={selectedParentCategory === category.id ? colors.white : colors.gray[400]}
                />
              )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Subcategories (shown when parent is selected) */}
        {selectedParent?.children && selectedParent.children.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subCategoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.subCategoryChip,
                !selectedSubCategory && styles.subCategoryChipActive,
              ]}
              onPress={() => setSelectedSubCategory(undefined)}
            >
              <Text
                style={[
                  styles.subCategoryChipText,
                  !selectedSubCategory && styles.subCategoryChipTextActive,
                ]}
              >
                All {selectedParent.name}
              </Text>
            </TouchableOpacity>
            {selectedParent.children.map((subCategory) => (
              <TouchableOpacity
                key={subCategory.id}
                style={[
                  styles.subCategoryChip,
                  selectedSubCategory === subCategory.id && styles.subCategoryChipActive,
                ]}
                onPress={() => handleSubCategorySelect(subCategory.id)}
              >
                <Text
                  style={[
                    styles.subCategoryChipText,
                    selectedSubCategory === subCategory.id && styles.subCategoryChipTextActive,
                  ]}
                >
                  {subCategory.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Products Grid */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productsContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.DEFAULT]}
              tintColor={colors.primary.DEFAULT}
            />
          }
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: spacing.sm,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  categoryFilterContainer: {
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  activeFilterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearFilterText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs / 2,
  },
  categoryFilterScroll: {
    paddingHorizontal: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  categoryChipImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: spacing.xs,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  subCategoryScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  subCategoryChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  subCategoryChipActive: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary.DEFAULT,
  },
  subCategoryChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary[600],
  },
  subCategoryChipTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsContainer: {
    padding: spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
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
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
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
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
});
