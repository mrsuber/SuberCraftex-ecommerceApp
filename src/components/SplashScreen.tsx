import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotate animation - continuous slow rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Bounce animation - subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-hide after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, rotateAnim, bounceAnim, onFinish]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ rotate: spin }, { scale: scale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.brandName}>SUBER<Text style={styles.brandNameAccent}>Craftex</Text></Text>

        <Text style={styles.tagline}>Six Rings. One Vision</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Premium E-Commerce</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
  },
  brandName: {
    fontSize: 32,
    color: '#E11D48',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  brandNameAccent: {
    fontWeight: '400',
    color: '#1F2937',
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: -200,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
