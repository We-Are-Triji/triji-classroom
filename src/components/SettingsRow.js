import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { brutalCard, palette } from '../theme/neoBrutal';

export default function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  isDestructive = false,
  showArrow = true,
}) {
  return (
    <TouchableOpacity
      style={[styles.row, isDestructive && styles.destructiveRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>
        <Feather name={icon} size={20} color={isDestructive ? palette.error : palette.text} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, isDestructive && styles.destructiveTitle]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, isDestructive && styles.destructiveSubtitle]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showArrow && <Feather name="chevron-right" size={20} color={palette.textMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    ...brutalCard(palette.surface),
  },
  destructiveRow: {
    backgroundColor: '#F8D9D3',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: palette.mustard,
    borderWidth: 3,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 2,
  },
  destructiveTitle: {
    color: palette.error,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  destructiveSubtitle: {
    color: palette.error,
  },
});
