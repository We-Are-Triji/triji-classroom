import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brutalCard, palette } from '../theme/neoBrutal';

export default function ProfileSection({ title, children }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        <View style={styles.sectionContent}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 12,
    marginLeft: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionCard: {
    ...brutalCard(palette.powder),
    overflow: 'hidden',
  },
  sectionContent: {
    padding: 20,
  },
});
