import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette } from '../theme/neoBrutal';

export default function InfoRow({
  icon,
  label,
  value,
  onPress,
  isEditable = false,
  showDivider = true,
  iconColor = palette.teal,
}) {
  const Content = (
    <View style={[styles.row, !showDivider && styles.noDivider]}>
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value || 'Not set'}</Text>
        </View>
      </View>
      {isEditable && <Feather name="chevron-right" size={20} color={palette.textMuted} />}
    </View>
  );

  if (isEditable) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  noDivider: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    lineHeight: 20,
  },
});
