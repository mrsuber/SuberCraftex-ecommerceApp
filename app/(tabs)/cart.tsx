import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react-native';
import { Button, Card, CardContent } from '@/components/ui';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

export default function CartScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  } = useCartStore();

  const handleRemoveItem = (productId: string, variantId?: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem(productId, variantId),
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearCart,
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to proceed with checkout.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => router.push('/(auth)/login'),
          },
        ]
      );
      return;
    }
    router.push('/checkout');
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <Card style={styles.cartItem} variant="outlined">
      <CardContent style={styles.cartItemContent}>
        <View style={styles.itemImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <ShoppingBag size={24} color={colors.gray[300]} />
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.variantName && (
            <Text style={styles.itemVariant}>{item.variantName}</Text>
          )}
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item.productId, item.variantId)}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>

          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                updateQuantity(
                  item.productId,
                  Math.max(1, item.quantity - 1),
                  item.variantId
                )
              }
              disabled={item.quantity <= 1}
            >
              <Minus
                size={16}
                color={item.quantity <= 1 ? colors.gray[300] : colors.gray[700]}
              />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                updateQuantity(
                  item.productId,
                  item.quantity + 1,
                  item.variantId
                )
              }
            >
              <Plus size={16} color={colors.gray[700]} />
            </TouchableOpacity>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ShoppingCart size={80} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
      <Text style={styles.emptyText}>
        Looks like you haven't added any items to your cart yet.
      </Text>
      <Button
        title="Start Shopping"
        onPress={() => router.push('/(tabs)/catalog')}
        style={styles.shopButton}
      />
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {renderEmpty()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Shopping Cart ({getTotalItems()} items)
        </Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => `${item.productId}-${item.variantId || 'default'}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(getTotalPrice())}
          </Text>
        </View>
        <Text style={styles.shippingNote}>
          Shipping calculated at checkout
        </Text>
        <Button
          title="Proceed to Checkout"
          onPress={handleCheckout}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  clearText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.lg,
  },
  cartItem: {
    marginBottom: spacing.md,
  },
  cartItemContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  itemVariant: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  removeButton: {
    padding: spacing.xs,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
  },
  quantityButton: {
    padding: spacing.sm,
  },
  quantityText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    minWidth: 30,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  shippingNote: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  shopButton: {
    minWidth: 200,
  },
});
