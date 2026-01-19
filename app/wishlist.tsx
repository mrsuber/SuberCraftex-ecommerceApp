import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/api';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Wishlist } from '@/types';

export default function WishlistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();

  const { data: wishlist = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.wishlist.list);
      return response.data as Wishlist[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.wishlist.remove(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const handleAddToCart = (item: Wishlist) => {
    if (item.product) {
      addItem({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        image: item.product.featured_image || '',
        quantity: 1,
      });
    }
  };

  const renderItem = ({ item }: { item: Wishlist }) => (
    <Card style={styles.itemCard} variant="outlined">
      <CardContent style={styles.itemContent}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => router.push(`/product/${item.product_id}`)}
        >
          {item.product?.featured_image ? (
            <Image
              source={{ uri: item.product.featured_image }}
              style={styles.image}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Heart size={32} color={colors.gray[300]} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <TouchableOpacity onPress={() => router.push(`/product/${item.product_id}`)}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.product?.name || 'Product'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.itemPrice}>
            {formatCurrency(item.product?.price || 0)}
          </Text>

          <View style={styles.actions}>
            <Button
              title="Add to Cart"
              size="sm"
              onPress={() => handleAddToCart(item)}
              style={styles.addButton}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeMutation.mutate(item.id)}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Heart size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
      <Text style={styles.emptyText}>
        Save items you love by tapping the heart icon on products.
      </Text>
      <Button
        title="Browse Products"
        onPress={() => router.push('/(tabs)/catalog')}
        style={styles.browseButton}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Wishlist' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={wishlist}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    flex: 1,
  },
  removeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  browseButton: {
    minWidth: 200,
  },
});
