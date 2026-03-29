import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { brutalCard, palette } from '../theme/neoBrutal';

export default function AnnouncementCardSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const shimmerStyle = {
    opacity: shimmerValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <Animated.View style={[styles.profileSkeleton, shimmerStyle]} />
        </View>

        <View style={styles.cardRight}>
          <View style={styles.cardHeader}>
            <Animated.View style={[styles.authorSkeleton, shimmerStyle]} />
            <View style={styles.cardMeta}>
              <Animated.View style={[styles.timestampSkeleton, shimmerStyle]} />
              <Animated.View style={[styles.typeSkeleton, shimmerStyle]} />
            </View>
          </View>

          <Animated.View style={[styles.titleSkeleton, shimmerStyle]} />
          <Animated.View style={[styles.titleSkeletonShort, shimmerStyle]} />

          <Animated.View style={[styles.expirySkeleton, shimmerStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...brutalCard(palette.powder),
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  cardMain: {
    flexDirection: 'row',
    gap: 12,
  },
  cardLeft: {
    alignItems: 'center',
  },
  cardRight: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: palette.mustard,
    borderWidth: 3,
    borderColor: palette.border,
  },
  authorSkeleton: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  timestampSkeleton: {
    width: 40,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.surface,
  },
  typeSkeleton: {
    width: 50,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.peach,
  },
  titleSkeleton: {
    width: '90%',
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.surface,
    marginBottom: 4,
  },
  titleSkeletonShort: {
    width: '60%',
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.surface,
    marginBottom: 8,
  },
  expirySkeleton: {
    width: 70,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.sage,
  },
});
