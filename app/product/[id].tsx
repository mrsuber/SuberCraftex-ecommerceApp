import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart,
  Star,
  Minus,
  Plus,
  Check,
} from 'lucide-react-native';
import { Button, Badge } from '@/components/ui';
import { productsApi } from '@/api/products';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, getImageUrl } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Product, ProductVariant } from '@/types';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem, getItemQuantity } = useCartStore();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
    staleTime: 0, // Always fetch fresh data
  });

  // Debug: Log received product data
  React.useEffect(() => {
    if (product) {
      console.log('Product Detail Screen - Received product:', {
        id: product.id,
        name: product.name,
        price: product.price,
        featured_image: product.featured_image,
        featuredImage: (product as any).featuredImage,
        images: product.images,
        description: product.description,
        inventory_count: product.inventory_count,
        inventoryCount: (product as any).inventoryCount,
        avgRating: (product as any).avgRating,
        reviewCount: (product as any).reviewCount,
      });
    }
  }, [product]);

  // Handle both camelCase and snake_case field names from API
  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const comparePrice = selectedVariant?.compare_at_price ?? selectedVariant?.compareAtPrice ?? product?.compare_at_price ?? product?.compareAtPrice;

  // Get inventory count - handle both naming conventions
  const getInventoryCount = (item: any) => {
    if (!item) return 0;
    return item.inventory_count ?? item.inventoryCount ?? item.stock ?? 999; // Default to 999 if no inventory field
  };

  const variantInventory = selectedVariant ? getInventoryCount(selectedVariant) : 0;
  const productInventory = getInventoryCount(product);

  const inStock = selectedVariant
    ? variantInventory > 0
    : productInventory > 0;
  const maxQuantity = selectedVariant ? variantInventory : productInventory;

  const cartQuantity = getItemQuantity(
    product?.id || '',
    selectedVariant?.id
  );

  const handleAddToCart = () => {
    if (!product) return;

    if (!inStock) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    // Handle both camelCase and snake_case field names
    const name = product.name || 'Product';
    const variantImage = selectedVariant?.image_url || selectedVariant?.imageUrl;
    const productImage = product.images?.[0] || product.featured_image || product.featuredImage;
    const image = getImageUrl(variantImage || productImage) || undefined;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name,
      variantName: selectedVariant?.name,
      price: currentPrice,
      quantity,
      image,
      maxQuantity,
    });

    Alert.alert('Added to Cart', `${name} has been added to your cart.`);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to proceed with checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    handleAddToCart();
    router.push('/checkout/shipping');
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (error || !product) {
    console.log('Product detail error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <Text style={styles.errorSubtext}>
          {error instanceof Error ? error.message : 'Unable to load product details'}
        </Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  // Handle both camelCase and snake_case for product fields
  const featuredImage = product.featured_image || product.featuredImage;
  const productImages = product.images || [];
  const images = (productImages.length ? productImages : [featuredImage])
    .filter(Boolean)
    .map((img: string) => getImageUrl(img))
    .filter(Boolean) as string[];

  const productName = product.name || 'Product';
  const productDescription = product.description || '';
  const productSku = product.sku || product.SKU || '';
  const productVendor = product.vendor || '';
  const productCategory = product.category;

  const hasDiscount = comparePrice && comparePrice > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
    : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={colors.gray[900]} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Heart size={22} color={colors.gray[700]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Share2 size={22} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image Gallery */}
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
            >
              {images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image || undefined }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.imagePagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
            {hasDiscount && (
              <Badge
                label={`-${discountPercent}%`}
                variant="error"
                style={styles.discountBadge}
              />
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{productName}</Text>

            {/* Rating */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const avgRating = (product as any).avgRating || 0;
                  return (
                    <Star
                      key={star}
                      size={16}
                      color={colors.warning}
                      fill={star <= avgRating ? colors.warning : 'transparent'}
                    />
                  );
                })}
              </View>
              <Text style={styles.ratingText}>
                {(product as any).avgRating?.toFixed(1) || '0.0'} ({(product as any).reviewCount || 0} reviews)
              </Text>
            </View>

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(currentPrice)}</Text>
              {hasDiscount && (
                <Text style={styles.comparePrice}>{formatCurrency(comparePrice)}</Text>
              )}
            </View>

            {/* Stock Status */}
            <View style={styles.stockRow}>
              {inStock ? (
                <View style={styles.inStockBadge}>
                  <Check size={14} color={colors.success} />
                  <Text style={styles.inStockText}>In Stock ({maxQuantity} available)</Text>
                </View>
              ) : (
                <Badge label="Out of Stock" variant="error" />
              )}
            </View>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <View style={styles.variantsSection}>
                <Text style={styles.sectionTitle}>Options</Text>
                <View style={styles.variantsGrid}>
                  {product.variants.map((variant: any) => {
                    const isActive = variant.is_active ?? variant.isActive ?? true;
                    return (
                      <TouchableOpacity
                        key={variant.id}
                        style={[
                          styles.variantButton,
                          selectedVariant?.id === variant.id && styles.variantButtonSelected,
                          !isActive && styles.variantButtonDisabled,
                        ]}
                        onPress={() => setSelectedVariant(variant)}
                        disabled={!isActive}
                      >
                        <Text
                          style={[
                            styles.variantText,
                            selectedVariant?.id === variant.id && styles.variantTextSelected,
                          ]}
                        >
                          {variant.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quantity */}
            <View style={styles.quantitySection}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={18} color={quantity <= 1 ? colors.gray[300] : colors.gray[700]} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus
                    size={18}
                    color={quantity >= maxQuantity ? colors.gray[300] : colors.gray[700]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>
                {productDescription || 'No description available.'}
              </Text>
            </View>

            {/* SKU & Details */}
            <View style={styles.detailsSection}>
              {productSku ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SKU</Text>
                  <Text style={styles.detailValue}>{productSku}</Text>
                </View>
              ) : null}
              {productVendor ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vendor</Text>
                  <Text style={styles.detailValue}>{productVendor}</Text>
                </View>
              ) : null}
              {productCategory && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{productCategory.name}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.cartIconButton} onPress={handleAddToCart}>
            <ShoppingCart size={24} color={colors.primary.DEFAULT} />
            {cartQuantity > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartQuantity}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Button
            title="Add to Cart"
            variant="outline"
            onPress={handleAddToCart}
            disabled={!inStock}
            style={styles.addToCartButton}
          />
          <Button
            title="Buy Now"
            onPress={handleBuyNow}
            disabled={!inStock}
            style={styles.buyNowButton}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width,
    height: width,
    backgroundColor: colors.gray[100],
  },
  imagePagination: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
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
    backgroundColor: colors.primary.DEFAULT,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  productInfo: {
    padding: spacing.lg,
  },
  productName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  comparePrice: {
    fontSize: fontSize.lg,
    color: colors.gray[400],
    textDecorationLine: 'line-through',
  },
  stockRow: {
    marginBottom: spacing.lg,
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inStockText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  variantsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  variantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  variantButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  variantButtonSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary[50],
  },
  variantButtonDisabled: {
    opacity: 0.5,
  },
  variantText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  variantTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  quantitySection: {
    marginBottom: spacing.lg,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    padding: spacing.md,
  },
  quantityText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    minWidth: 50,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    lineHeight: 24,
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    fontWeight: fontWeight.medium,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  cartIconButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  addToCartButton: {
    flex: 1,
  },
  buyNowButton: {
    flex: 1,
  },
});
