import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { brutalCard, palette } from '../theme/neoBrutal';

function SkeletonBlock({ animatedStyle, style }) {
  return <Animated.View style={[styles.skeletonBase, animatedStyle, style]} />;
}

export default function AnnouncementCardSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const animatedStyle = {
    opacity: shimmerValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.42, 0.88],
    }),
    transform: [
      {
        translateX: shimmerValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 4],
        }),
      },
    ],
  };

  return (
    <View style={styles.card}>
      <View style={styles.accentStrip} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <SkeletonBlock animatedStyle={animatedStyle} style={styles.badge} />
          <SkeletonBlock animatedStyle={animatedStyle} style={styles.time} />
        </View>

        <SkeletonBlock animatedStyle={animatedStyle} style={styles.titlePrimary} />
        <SkeletonBlock animatedStyle={animatedStyle} style={styles.titleSecondary} />
        <SkeletonBlock animatedStyle={animatedStyle} style={styles.previewLine} />
        <SkeletonBlock animatedStyle={animatedStyle} style={styles.previewLineShort} />

        <View style={styles.footerRow}>
          <SkeletonBlock animatedStyle={animatedStyle} style={styles.footerPillWide} />
          <SkeletonBlock animatedStyle={animatedStyle} style={styles.footerPill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...brutalCard('#F7E4D8'),
    flexDirection: 'row',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 178,
  },
  accentStrip: {
    width: 14,
    backgroundColor: palette.coral,
    borderRightWidth: 3,
    borderRightColor: palette.border,
  },
  content: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  skeletonBase: {
    backgroundColor: palette.white,
    borderWidth: 3,
    borderColor: palette.border,
  },
  badge: {
    width: 122,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.mustard,
  },
  time: {
    width: 74,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#F3D9CB',
  },
  titlePrimary: {
    width: '86%',
    height: 22,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: palette.surface,
  },
  titleSecondary: {
    width: '58%',
    height: 22,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F6EEE6',
  },
  previewLine: {
    width: '96%',
    height: 18,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F6EEE6',
  },
  previewLineShort: {
    width: '72%',
    height: 18,
    borderRadius: 10,
    backgroundColor: '#F6EEE6',
  },
  footerPillWide: {
    width: 154,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.powder,
  },
  footerPill: {
    width: 110,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E7D7F7',
  },
});
