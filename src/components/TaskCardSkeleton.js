import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { brutalCard, palette } from '../theme/neoBrutal';

export default function TaskCardSkeleton() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
    }),
    [opacity]
  );

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
          <Animated.View style={[styles.subjectSkeleton, animatedStyle]} />
        </View>
        <Animated.View style={[styles.statusSkeleton, animatedStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    ...brutalCard(palette.surfaceAlt),
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  titleSkeleton: {
    height: 16,
    backgroundColor: palette.surface,
    borderRadius: 8,
    marginBottom: 8,
    width: '70%',
  },
  subjectSkeleton: {
    height: 12,
    backgroundColor: palette.mustard,
    borderRadius: 8,
    width: '50%',
  },
  statusSkeleton: {
    width: 80,
    height: 24,
    backgroundColor: palette.teal,
    borderRadius: 10,
    marginLeft: 12,
  },
});
