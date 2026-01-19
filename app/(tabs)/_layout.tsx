import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import {
  Home,
  Search,
  Wrench,
  ShoppingCart,
  User,
} from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/config/theme';
import { useCartStore } from '@/stores/cart-store';

function CartBadge() {
  const itemCount = useCartStore((state) => state.getTotalItems());

  if (itemCount === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray[200],
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitleStyle: {
          fontWeight: fontWeight.semibold,
          color: colors.gray[900],
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerTitle: 'SuberCraftex',
          headerTitleStyle: {
            fontWeight: fontWeight.bold,
            color: colors.primary.DEFAULT,
            fontSize: fontSize.xl,
          },
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingCart size={size} color={color} />
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
});
