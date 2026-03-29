import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { brutalCard, palette } from '../theme/neoBrutal';

function SkeletonRow({ animatedStyle }) {
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.icon, animatedStyle]} />
      <View style={styles.textWrap}>
        <Animated.View style={[styles.title, animatedStyle]} />
        <Animated.View style={[styles.subtitle, animatedStyle]} />
      </View>
      <Animated.View style={[styles.time, animatedStyle]} />
    </View>
  );
}

export default function RecentUpdatesSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const animatedStyle = {
    opacity: shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    }),
    transform: [
      {
        translateX: shimmer.interpolate({
          inputRange: [0, 1],
          outputRange: [-3, 3],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <SkeletonRow animatedStyle={animatedStyle} />
      <SkeletonRow animatedStyle={animatedStyle} />
      <SkeletonRow animatedStyle={animatedStyle} />
      <SkeletonRow animatedStyle={animatedStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    ...brutalCard('#E8ECE3'),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.mustard,
  },
  textWrap: {
    flex: 1,
    gap: 8,
  },
  title: {
    width: '74%',
    height: 14,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  subtitle: {
    width: '48%',
    height: 12,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: '#F3ECE4',
  },
  time: {
    width: 52,
    height: 12,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: '#D7E4DD',
  },
});
